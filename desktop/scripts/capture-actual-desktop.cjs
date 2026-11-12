const { spawn, execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");

const root = process.cwd();
const output = process.env.ORALYN_CAPTURE_OUTPUT ? path.resolve(process.env.ORALYN_CAPTURE_OUTPUT) : path.join(root, "evidence", "actual-desktop");
const chromePath = process.env.CHROME_BIN || (
  process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : "google-chrome"
);
const port = Number(process.env.CDP_PORT || 19310);
const baseUrl = process.env.ORALYN_PREVIEW_URL || "http://127.0.0.1:4176";
const environment = process.env.ORALYN_ENVIRONMENT || "staging";
const apiBase = process.env.VITE_DENTAL_API_URL || "not-configured";
const commit = process.env.GITHUB_SHA || execFileSync("git", ["rev-parse", "HEAD"], { cwd: root }).toString().trim();
const profile = path.join(os.tmpdir(), "oralyn-capture-profile-" + process.pid);

fs.mkdirSync(output, { recursive: true });
const assetsDir = path.join(root, "dist", "assets");
const jsFile = fs.readdirSync(assetsDir).find((name) => name.endsWith(".js"));
if (!jsFile) throw new Error("Production JavaScript bundle was not found.");
const bundleHash = crypto.createHash("sha256").update(fs.readFileSync(path.join(assetsDir, jsFile))).digest("hex");

const chrome = spawn(chromePath, [
  "--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
  "--remote-debugging-port=" + port, "--remote-allow-origins=*",
  "--disable-dev-shm-usage", "--user-data-dir=" + profile,
  "--window-size=1440,1000", baseUrl + "/doctor/dashboard",
], { stdio: "ignore", windowsHide: true });

let ws;
let sequence = 0;
const pending = new Map();
const runtimeErrors = [];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(fn, timeoutMs = 30000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    try {
      const value = await fn();
      if (value) return value;
    } catch {}
    await sleep(250);
  }
  throw new Error("Timed out waiting for " + baseUrl);
}

function send(method, params = {}) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error("CDP timeout: " + method));
      }
    }, 15000);
  });
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "Browser evaluation failed");
  }
  return result.result && result.result.value;
}

async function capture(name, width, height, mobile = false) {
  await send("Emulation.setDeviceMetricsOverride", {
    width, height, deviceScaleFactor: 1, mobile,
  });
  await sleep(450);
  const screenshot = await send("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: false, fromSurface: true,
  });
  fs.writeFileSync(path.join(output, name), Buffer.from(screenshot.data, "base64"));
}

async function verifyFonts() {
  const loaded = await evaluate('Promise.all([document.fonts.load("400 16px \\"Plus Jakarta Sans\\""), document.fonts.load("600 32px \\"Playfair Display\\"")]).then((faces) => ({plusJakartaSans: faces[0].length > 0, playfairDisplay: faces[1].length > 0}))');
  await evaluate("document.fonts.ready.then(() => true)");
  const status = await evaluate('({plusJakartaSans: document.fonts.check("400 16px \\"Plus Jakarta Sans\\""), playfairDisplay: document.fonts.check("600 32px \\"Playfair Display\\"")})');
  if (!loaded.plusJakartaSans || !loaded.playfairDisplay || !status.plusJakartaSans || !status.playfairDisplay) {
    throw new Error("Bundled Oralyn fonts did not both load: " + JSON.stringify({loaded, status}));
  }
  return status;
}

async function verifyPwa() {
  await waitFor(() => evaluate("Boolean(navigator.serviceWorker && navigator.serviceWorker.controller)"), 30000);
  const status = await evaluate("(async () => { const cacheName = 'oralyn-portal-shell-v1'; const registration = await navigator.serviceWorker.getRegistration('/'); const names = await caches.keys(); const cache = await caches.open(cacheName); const requests = await cache.keys(); const paths = requests.map((request) => new URL(request.url).pathname); const prefixes = ['/v1', '/auth/v1', '/rest/v1', '/storage/v1', '/functions/v1']; const forbidden = paths.filter((pathname) => prefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'))); return { supported: 'serviceWorker' in navigator, registered: Boolean(registration), active: registration?.active?.state === 'activated', controlled: Boolean(navigator.serviceWorker.controller), cachePresent: names.includes(cacheName), paths, forbidden }; })()");
  if (!status.supported || !status.registered || !status.active || !status.controlled || !status.cachePresent || status.forbidden.length) {
    throw new Error("Oralyn PWA shell verification failed: " + JSON.stringify(status));
  }
  return status;
}
async function captureCurrent(expectedText, screenshotName) {
  await waitFor(() => evaluate('document.readyState === "complete"'));
  await waitFor(() => evaluate(
    "document.body && document.body.innerText.includes(" + JSON.stringify(expectedText) + ")"
  ));
  const fonts = await verifyFonts();
  const pwa = await verifyPwa();
  await capture(screenshotName + "-1440x1000.png", 1440, 1000);
  await capture(screenshotName + "-1280x800.png", 1280, 800);
  await capture(screenshotName + "-390x844.png", 390, 844, true);
  return { ...fonts, pwa };
}

async function navigate(route, expectedText, screenshotName) {
  await send("Page.navigate", { url: baseUrl + route });
  return captureCurrent(expectedText, screenshotName);
}

(async () => {
  try {
    await waitFor(async () => {
      const response = await fetch("http://127.0.0.1:" + port + "/json/list").catch(() => null);
      if (!response || !response.ok) return false;
      const targets = await response.json();
      return targets.find((target) =>
        target.type === "page" && target.webSocketDebuggerUrl && target.url.startsWith(baseUrl)
      );
    });
    const targets = await (await fetch("http://127.0.0.1:" + port + "/json/list")).json();
    const target = targets.find((item) =>
      item.type === "page" && item.webSocketDebuggerUrl && item.url.startsWith(baseUrl)
    );
    if (!target) throw new Error("Chrome page target not found");

    ws = new WebSocket(target.webSocketDebuggerUrl);
    ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.method === "Runtime.exceptionThrown") {
        runtimeErrors.push(message.params.exceptionDetails?.text || "runtime exception");
      }
      if (message.method === "Log.entryAdded" && message.params.entry?.level === "error") {
        runtimeErrors.push(message.params.entry.text);
      }
      if (message.id && pending.has(message.id)) {
        const request = pending.get(message.id);
        pending.delete(message.id);
        message.error
          ? request.reject(new Error(message.error.message))
          : request.resolve(message.result || {});
      }
    });
    await new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve, { once: true });
      ws.addEventListener("error", reject, { once: true });
    });
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Log.enable");

    const fontResults = {};
    fontResults.doctorLogin = await captureCurrent(
      "Sign in with your clinic doctor account",
      "doctor-login"
    );
    fontResults.patientLogin = await navigate(
      "/patient/home",
      "PATIENT PORTAL",
      "patient-login"
    );

    const signupScript = "(() => { const button = [...document.querySelectorAll('button')].find((item) => (item.innerText || '').includes('New here? Create an account')); if (button) button.click(); return !!button; })()";
    const signupClicked = await evaluate(signupScript);
    if (!signupClicked) throw new Error("Patient sign-up action was not found.");
    await waitFor(() => evaluate('document.body.innerText.includes("Create your patient account")'));
    fontResults.patientSignup = await verifyFonts();
    await capture("patient-signup-1440x1000.png", 1440, 1000);

    fontResults.patientBooking = await navigate(
      "/patient/booking",
      "Book an appointment",
      "patient-booking"
    );
    fontResults.patientRecordsGate = await navigate(
      "/patient/records",
      "Sign in securely to view your clinic appointments",
      "patient-records-access"
    );

    if (runtimeErrors.length) {
      throw new Error("Browser runtime/console errors: " + runtimeErrors.join(" | "));
    }

    const metadata = [
      "commit=" + commit,
      "environment=" + environment,
      "preview=" + baseUrl,
      "api=" + apiBase,
      "bundle=" + jsFile,
      "bundle_sha256=" + bundleHash,
      "font_plus_jakarta_sans_loaded=" + fontResults.doctorLogin.plusJakartaSans,
      "font_playfair_display_loaded=" + fontResults.doctorLogin.playfairDisplay,
      "pwa_service_worker_controlled=" + fontResults.doctorLogin.pwa.controlled,
      "pwa_cache_name_present=" + fontResults.doctorLogin.pwa.cachePresent,
      "pwa_api_cache_entries=" + fontResults.doctorLogin.pwa.forbidden.length,
      "synthetic_patient_data=none",
      "authenticated_screens=false",
      "mobile_viewport=390x844",
      "runtime_errors=none",
    ].join("\n") + "\n";
    fs.writeFileSync(path.join(output, "build-info.txt"), metadata);
    fs.writeFileSync(path.join(output, "runtime-errors.txt"), "none observed during signed-out public-route capture\n");
    console.log(JSON.stringify({
      commit, environment, baseUrl, apiBase, bundle: jsFile, bundleHash,
      fontResults, pwa: fontResults.doctorLogin.pwa, runtimeErrors,
      screenshots: fs.readdirSync(output).filter((name) => name.endsWith(".png")),
    }));
  } finally {
    if (ws) ws.close();
    try { process.kill(chrome.pid); } catch {}
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
  }
})().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
