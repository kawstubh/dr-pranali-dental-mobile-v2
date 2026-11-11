const { spawn, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const chromePath = process.env.CHROME_BIN || (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : 'google-chrome');
const port = 9222;
const baseUrl = 'http://127.0.0.1:19006';
const outDir = path.join(process.cwd(), 'build-evidence', 'patient-web');
fs.mkdirSync(outDir, { recursive: true });
const commit = require('node:child_process').execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

const chrome = spawn(chromePath, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
  '--remote-debugging-port=' + port,
  '--user-data-dir=' + path.join(process.cwd(), '.chrome-capture-profile-' + process.pid),
  '--window-size=1440,1000', baseUrl
], { stdio: 'ignore', windowsHide: true });

let ws;
let nextId = 0;
const pending = new Map();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitFor(fn, timeoutMs = 15000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const value = await fn();
    if (value) return value;
    await sleep(250);
  }
  throw new Error('Timed out waiting for browser state');
}

async function send(method, params = {}) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error('CDP timeout: ' + method));
      }
    }, 15000);
  });
}

async function evaluate(expression) {
  const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text || 'Browser evaluation failed');
  return response.result && response.result.value;
}

async function screenshot(name, width = 1440, height = 1000) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  await evaluate('document.fonts.ready.then(() => true)');
  await sleep(700);
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true });
  fs.writeFileSync(path.join(outDir, name), Buffer.from(shot.data, 'base64'));
}

async function clickText(label) {
  const expression = `(() => {
    const nodes = [...document.querySelectorAll('button,[role="button"],a')];
    const node = nodes.find(el => (el.innerText || el.textContent || '').includes(${JSON.stringify(label)}));
    if (!node) return { found: false, candidates: nodes.map(el => (el.innerText || el.textContent || '').trim()).filter(Boolean).slice(0, 40) };
    node.click();
    return { found: true };
  })()`;
  const result = await evaluate(expression);
  if (!result || !result.found) throw new Error('Could not find interactive control: ' + label + ' ' + JSON.stringify(result));
}

async function assertText(label) {
  const result = await evaluate('document.body.innerText.includes(' + JSON.stringify(label) + ')');
  if (!result) throw new Error('Expected screen text not found: ' + label);
}

(async () => {
  try {
    await waitFor(async () => {
      const response = await fetch('http://127.0.0.1:' + port + '/json/list').catch(() => null);
      if (!response || !response.ok) return false;
      const targets = await response.json();
      return targets.find(target => target.type === 'page' && target.webSocketDebuggerUrl);
    });
    const targets = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
    const target = targets.find(item => item.type === 'page' && item.webSocketDebuggerUrl && item.url.startsWith(baseUrl));
    if (!target) throw new Error('Chrome page target not found');
    ws = new WebSocket(target.webSocketDebuggerUrl);
    ws.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) {
        const item = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) item.reject(new Error(message.error.message));
        else item.resolve(message.result || {});
      }
    });
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', reject, { once: true });
    });
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: baseUrl });
    await waitFor(() => evaluate('document.readyState === "complete"'));
    await waitFor(() => evaluate('document.body.innerText.includes("Welcome to Oralyn")'));
    const fonts = await evaluate('({jakarta: document.fonts.check("16px PlusJakartaSans"), playfair: document.fonts.check("24px PlayfairDisplay")})');
    if (!fonts.jakarta || !fonts.playfair) throw new Error('Bundled Patient fonts did not finish loading: ' + JSON.stringify(fonts));
    await screenshot('patient-welcome-1440x1000.png');
    await clickText('Explore as a guest');
    await waitFor(() => evaluate('document.body.innerText.includes("Care that puts your smile first.")'));
    await screenshot('patient-home-1440x1000.png');
    await screenshot('patient-home-1280x800.png', 1280, 800);
    await clickText('Book an appointment');
    await waitFor(() => evaluate('document.body.innerText.includes("Full name")'));
    await assertText('Phone number');
    await assertText('Preferred date');
    await assertText('Preferred time');
    await screenshot('patient-appointment-1440x1000.png');
    await screenshot('patient-appointment-1280x800.png', 1280, 800);
    await clickText('My Care');
    await waitFor(() => evaluate('document.body.innerText.toLowerCase().includes("your care journey") || document.body.innerText.toLowerCase().includes("connect your clinic profile")'));
    await screenshot('patient-my-care-1440x1000.png');
    fs.writeFileSync(path.join(outDir, 'build-info.txt'),
      'commit=' + commit + '\nenvironment=staging\napi=' + process.env.EXPO_PUBLIC_DENTAL_API_URL + '\nfonts=' + JSON.stringify(fonts) + '\n');
    console.log(JSON.stringify({ commit, fonts, screenshots: fs.readdirSync(outDir) }));
  } finally {
    if (ws) ws.close();
    if (process.platform === 'win32') { try { execFileSync('taskkill', ['/PID', String(chrome.pid), '/T', '/F'], { stdio: 'ignore' }); } catch { chrome.kill(); } } else { chrome.kill('SIGTERM'); }
  }
})().catch(error => { console.error(error.stack || error); process.exit(1); });
