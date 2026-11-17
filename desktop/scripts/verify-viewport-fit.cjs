const { spawn } = require("node:child_process");
const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs");

const baseUrl = (process.env.ORALYN_VIEWPORT_URL || "http://127.0.0.1:4176").replace(/\/$/, "");
const chromePath = process.env.CHROME_BIN || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const port = Number(process.env.CDP_PORT || 19312);
const profile = path.join(os.tmpdir(), "oralyn-viewport-check-" + process.pid);
const chrome = spawn(chromePath, ["--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--remote-debugging-port=" + port, "--remote-allow-origins=*", "--disable-dev-shm-usage", "--user-data-dir=" + profile, "--window-size=1440,900", baseUrl + "/patient/home/"], { stdio: "ignore", windowsHide: true });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let socket;
let nextId = 0;
const pending = new Map();

async function waitFor(fn, timeout = 20000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    try { const value = await fn(); if (value) return value; } catch {}
    await sleep(200);
  }
  throw new Error("Timed out waiting for Chrome or page");
}
function send(method, params = {}) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error("CDP timeout: " + method)); } }, 10000);
  });
}
async function evaluate(expression) {
  const response = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text || "Browser evaluation failed");
  return response.result?.value;
}
(async () => {
  try {
    const target = await waitFor(async () => {
      const response = await fetch("http://127.0.0.1:" + port + "/json/list");
      const pages = await response.json();
      return pages.find((page) => page.type === "page" && page.webSocketDebuggerUrl);
    });
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) {
        const task = pending.get(message.id); pending.delete(message.id);
        if (message.error) task.reject(new Error(message.error.message)); else task.resolve(message.result || {});
      }
    });
    await send("Page.enable"); await send("Runtime.enable");
    const cases = [
      { route: "/patient/home/", name: "Patient Home", sizes: [[1366,768,false],[1440,900,false],[390,844,true],[375,600,true],[320,568,true]] },
      { route: "/patient/booking/", name: "Patient Booking", sizes: [[1366,768,false],[1440,900,false],[390,844,true],[375,600,true],[320,568,true]] },
      { route: "/", name: "Doctor Login", sizes: [[1366,768,false],[1366,600,false],[390,844,true]] },
      { route: "/assistant/", name: "Assistant Login", sizes: [[1366,768,false],[1366,600,false],[390,844,true]] },
    ];
    const results = [];
    for (const item of cases) {
      await send("Page.navigate", { url: baseUrl + item.route });
      await waitFor(() => evaluate('document.readyState === "complete" && document.body && document.body.innerText.length > 0'));
      for (const [width,height,mobile] of item.sizes) {
        await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile });
        await sleep(250);
        const metrics = await evaluate(`(() => { const root=document.documentElement, body=document.body, scroller=document.scrollingElement; const selectors=['header','.wrap','.hero','.service-panel','.panel','.oralyn-reference-card','.oralyn-auth-layout','.assistant-shell','.assistant-login']; const boxes={}; for(const selector of selectors){const el=document.querySelector(selector);if(el){const r=el.getBoundingClientRect();boxes[selector]={top:Math.round(r.top),bottom:Math.round(r.bottom),height:Math.round(r.height)}}} return {viewport:{width:root.clientWidth,height:root.clientHeight},root:{scrollWidth:root.scrollWidth,scrollHeight:root.scrollHeight},body:{scrollWidth:body.scrollWidth,scrollHeight:body.scrollHeight},scroller:{scrollWidth:scroller.scrollWidth,scrollHeight:scroller.scrollHeight},horizontalOverflow:Math.max(root.scrollWidth,body.scrollWidth)>root.clientWidth+1,verticalOverflow:Math.max(root.scrollHeight,body.scrollHeight)>root.clientHeight+1,boxes}; })()`);
        const result = { page: item.name, width, height, mobile, ...metrics };
        results.push(result);
        console.log(JSON.stringify(result));
      }
    }
    const failures = results.filter((r) => r.horizontalOverflow || r.verticalOverflow);
    console.log(JSON.stringify({ summary: { total: results.length, failures: failures.length }, failures }, null, 2));
    if (failures.length) process.exitCode = 2;
  } finally {
    try { socket?.close(); } catch {}
    try { process.kill(chrome.pid); } catch {}
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
  }
})().catch((error) => { console.error(error.stack || error); process.exit(1); });

