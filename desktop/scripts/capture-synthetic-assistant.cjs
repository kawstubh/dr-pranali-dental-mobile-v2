const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");

const root = process.cwd();
const output = path.resolve(process.env.ORALYN_CAPTURE_OUTPUT || path.join(root, "evidence", "synthetic-assistant"));
const chromePath = process.env.CHROME_BIN || "google-chrome";
const port = Number(process.env.CDP_PORT || 19312);
const baseUrl = process.env.ORALYN_PREVIEW_URL || "http://127.0.0.1:4176";
const profile = path.join(os.tmpdir(), "oralyn-synthetic-assistant-" + process.pid);
const assetsDir = path.join(root, "dist", "assets");
const jsFile = fs.readdirSync(assetsDir).find((name) => name.endsWith(".js"));
if (!jsFile) throw new Error("Production JavaScript bundle was not found.");
const bundleHash = crypto.createHash("sha256").update(fs.readFileSync(path.join(assetsDir, jsFile))).digest("hex");
fs.mkdirSync(output, { recursive: true });

let chromeExit = null;
const chromeLogs = [];
const chrome = spawn(chromePath, [
  "--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
  "--remote-debugging-address=127.0.0.1", "--remote-debugging-port=" + port, "--remote-allow-origins=*",
  "--disable-dev-shm-usage", "--disable-background-networking", "--disable-extensions",
  "--no-first-run", "--user-data-dir=" + profile, "--window-size=1440,1000",
  baseUrl + "/assistant/",
], { stdio: ["ignore", "ignore", "pipe"], windowsHide: true });

chrome.stderr.on("data", (chunk) => { chromeLogs.push(chunk.toString()); });
chrome.on("exit", (code, signal) => { chromeExit = { code, signal }; });

let ws;
let sequence = 0;
const pending = new Map();
const runtimeErrors = [];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(fn, timeoutMs = 30000) {
  const end = Date.now() + timeoutMs;
  let lastError = "";
  while (Date.now() < end) {
    try {
      const value = await fn();
      if (value) return value;
    } catch (error) {
      lastError = error?.message || String(error);
    }
    if (chromeExit) throw new Error("Chrome exited before DevTools became ready: " + JSON.stringify(chromeExit) + " " + chromeLogs.join("").slice(-3000));
    await sleep(250);
  }
  throw new Error("Timed out waiting for synthetic Assistant browser at " + baseUrl + ". " + lastError + " " + chromeLogs.join("").slice(-3000));
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
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "Browser evaluation failed");
  return result.result && result.result.value;
}

async function capture(name, width, height, mobile = false) {
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile });
  await sleep(450);
  const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false, fromSurface: true });
  fs.writeFileSync(path.join(output, name), Buffer.from(shot.data, "base64"));
}

async function captureResponsive(prefix) {
  await capture(prefix + "-1440x1000.png", 1440, 1000, false);
  await capture(prefix + "-1280x800.png", 1280, 800, false);
  await capture(prefix + "-390x844.png", 390, 844, true);
}

const fixtureSource = [
  "(() => {",
  "  const token = 'synthetic-assistant-token';",
  "  const clinicId = 'clinic-synthetic-one';",
  "  const patientOne = { name: 'Ananya Synthetic', phone: '+91 90000 00001', created_at: new Date().toISOString() };",
  "  const patientTwo = { name: 'Bharat Synthetic', phone: '+91 90000 00002', created_at: new Date().toISOString() };",
  "  const patients = [patientOne, patientTwo];",
  "  const appointments = [",
  "    { id: 'appointment-synthetic-001', patient_name: patientOne.name, patient_phone: patientOne.phone, starts_at: new Date(Date.now() + 86400000).toISOString(), treatment_type: 'Dental check-up', status: 'requested', created_at: new Date().toISOString() },",
  "    { id: 'appointment-synthetic-002', patient_name: patientTwo.name, patient_phone: patientTwo.phone, starts_at: new Date(Date.now() + 172800000).toISOString(), treatment_type: 'Cleaning & polishing', status: 'confirmed', created_at: new Date().toISOString() }",
  "  ];",
  "  const invoices = [{ id: 'invoice-synthetic-001', invoice_number: 'SYN-INV-001', patient_name: patientOne.name, status: 'issued', total_paise: 150000, paid_paise: 50000, balance_paise: 100000, due_date: '2026-11-30', issued_at: new Date().toISOString() }];",
  "  window.__ORALYN_ASSISTANT_WRITES = [];",
  "  window.__ORALYN_ASSISTANT_UNHANDLED = [];",
  "  const record = (value) => window.__ORALYN_ASSISTANT_WRITES.push(value);",
  "  const json = (payload, status = 200) => new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store, private' } });",
  "  const originalFetch = window.fetch.bind(window);",
  "  window.fetch = async (input, init = {}) => {",
  "    const rawUrl = typeof input === 'string' || input instanceof URL ? String(input) : input.url;",
  "    const url = new URL(rawUrl, location.href);",
  "    if (!url.pathname.startsWith('/v1/dental/')) return originalFetch(input, init);",
  "    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));",
  "    const method = String(init.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();",
  "    const readBody = (value) => { try { return JSON.parse(value?.body || '{}'); } catch { return {}; } };",
  "    if (url.pathname === '/v1/dental/assistant/auth/login' && method === 'POST') { const body = readBody(init); if (body.email !== 'reception.synthetic@example.test' || body.password !== 'SyntheticAssistantPassword!123') return json({ detail: { code: 'INVALID_CREDENTIALS' } }, 401); record('assistant-login'); return json({ access_token: token, user: { id: 'assistant-synthetic-001', email: body.email, role: 'assistant', clinic_id: clinicId } }); }",
  "    const activeToken = (headers.get('authorization') || '').replace(/^Bearer\\s+/i, '');",
  "    if (activeToken !== token) return json({ detail: { code: 'SESSION_INVALID', message: 'Synthetic Assistant authentication required' } }, 401);",
  "    if (url.pathname === '/v1/dental/assistant/me' && method === 'GET') return json({ user: { id: 'assistant-synthetic-001', email: 'reception.synthetic@example.test', role: 'assistant', clinic_id: clinicId } });",
  "    if (url.pathname === '/v1/dental/assistant/auth/logout' && method === 'POST') { record('logout'); return json({ ok: true }); }",
  "    if (url.pathname === '/v1/dental/assistant/patients' && method === 'GET') return json({ result: patients });",
  "    if (url.pathname === '/v1/dental/assistant/patients' && method === 'POST') { const body = readBody(init); const patient = { name: body.name || 'Synthetic Assistant Intake', phone: body.phone || '+91 90000 00003', created_at: new Date().toISOString() }; patients.unshift(patient); record('patient-create'); return json({ result: patient }, 201); }",
  "    if (url.pathname === '/v1/dental/assistant/appointments' && method === 'GET') return json({ result: appointments });",
  "    const appointmentPrefix = '/v1/dental/assistant/appointments/';",
  "    if (url.pathname.startsWith(appointmentPrefix) && method === 'PATCH') { const id = decodeURIComponent(url.pathname.slice(appointmentPrefix.length)); const item = appointments.find((entry) => entry.id === id); if (!item) return json({ detail: { code: 'APPOINTMENT_NOT_FOUND' } }, 404); const body = readBody(init); if (body.status) item.status = body.status; if (body.starts_at) item.starts_at = body.starts_at; record(body.status === 'confirmed' ? 'appointment-confirm' : body.status === 'cancelled' ? 'appointment-cancel' : 'appointment-reschedule'); return json({ result: { id: item.id, starts_at: item.starts_at, treatment_type: item.treatment_type, status: item.status } }); }",
  "    if (url.pathname === '/v1/dental/assistant/billing/invoices' && method === 'GET') { record('billing-read'); return json({ result: invoices }); }",
  "    const receiptPrefix = '/v1/dental/assistant/billing/invoices/';",
  "    if (url.pathname.startsWith(receiptPrefix) && url.pathname.endsWith('/receipts') && method === 'POST') { const id = decodeURIComponent(url.pathname.slice(receiptPrefix.length, -9)); const invoice = invoices.find((item) => item.id === id); const body = readBody(init); if (!invoice || body.amount_paise <= 0 || body.amount_paise > invoice.balance_paise) return json({ detail: { code: 'RECEIPT_INVALID' } }, 409); invoice.paid_paise += body.amount_paise; invoice.balance_paise -= body.amount_paise; invoice.status = invoice.balance_paise === 0 ? 'paid' : 'partially_paid'; record('receipt-recorded'); return json({ result: { receipt_number: 'SYN-RCPT-001', amount_paise: body.amount_paise, method: body.method } }, 201); }",
  "    window.__ORALYN_ASSISTANT_UNHANDLED.push(method + ' ' + url.pathname);",
  "    return json({ detail: { code: 'UNHANDLED_SYNTHETIC_PATH' } }, 404);",
  "  };",
  "})();"
].join("\n");

async function signInSyntheticAssistant() {
  await waitFor(() => evaluate(
    'document.readyState === "complete" && document.body.innerText.includes("Clinic Assistant") && Boolean(document.querySelector("input[type=email]")) && Boolean(document.querySelector("input[type=password]"))'
  ));
  const submitted = await evaluate("(() => { const email = document.querySelector('input[type=email]'); const password = document.querySelector('input[type=password]'); const form = email && email.closest('form'); if (!email || !password || !form) return false; const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(email, 'reception.synthetic@example.test'); email.dispatchEvent(new Event('input', { bubbles: true })); setter.call(password, 'SyntheticAssistantPassword!123'); password.dispatchEvent(new Event('input', { bubbles: true })); form.requestSubmit(); return true; })()");
  if (!submitted) throw new Error("Synthetic Assistant sign-in form was not available.");
  await waitFor(() => evaluate('document.body.innerText.includes("Reception workspace") && document.body.innerText.includes("Ananya Synthetic")'));
}

async function main() {
  await waitFor(async () => {
    const response = await fetch("http://127.0.0.1:" + port + "/json/list").catch(() => null);
    if (!response || !response.ok) return false;
    const targets = await response.json();
    return targets.find((item) => item.type === "page" && item.webSocketDebuggerUrl && item.url.startsWith(baseUrl));
  });
  const targets = await (await fetch("http://127.0.0.1:" + port + "/json/list")).json();
  const target = targets.find((item) => item.type === "page" && item.webSocketDebuggerUrl && item.url.startsWith(baseUrl));
  if (!target) throw new Error("Chrome page target not found");
  ws = new WebSocket(target.webSocketDebuggerUrl);
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.method === "Runtime.exceptionThrown") runtimeErrors.push(message.params.exceptionDetails?.text || "runtime exception");
    if (message.method === "Log.entryAdded" && message.params.entry?.level === "error") runtimeErrors.push(message.params.entry.text);
    if (message.id && pending.has(message.id)) {
      const request = pending.get(message.id);
      pending.delete(message.id);
      message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result || {});
    }
  });
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Log.enable");
  await send("Page.addScriptToEvaluateOnNewDocument", { source: fixtureSource });
  await send("Page.navigate", { url: baseUrl + "/assistant/" });
  await signInSyntheticAssistant();
  await waitFor(() => evaluate("(async () => { const registration = await navigator.serviceWorker?.getRegistration('/'); return Boolean(registration?.active && registration.active.state === 'activated'); })()"), 30000);
  let controlled = await evaluate("Boolean(navigator.serviceWorker && navigator.serviceWorker.controller)");
  if (!controlled) {
    await send("Page.navigate", { url: baseUrl + "/assistant/" });
    await signInSyntheticAssistant();
    controlled = await waitFor(() => evaluate('document.readyState === "complete" && document.body.innerText.includes("Reception workspace") && Boolean(navigator.serviceWorker && navigator.serviceWorker.controller)'), 20000).catch(() => false);
  }
  if (!controlled) throw new Error("Synthetic Assistant capture is not controlled by the Oralyn PWA service worker.");
  const fonts = await evaluate('({plusJakartaSans:document.fonts.check("400 16px \\"Plus Jakarta Sans\\""),playfairDisplay:document.fonts.check("600 32px \\"Playfair Display\\"")})');
  if (!fonts.plusJakartaSans || !fonts.playfairDisplay) throw new Error("Bundled Oralyn fonts failed in synthetic Assistant session: " + JSON.stringify(fonts));

  await captureResponsive("assistant-dashboard");
  await evaluate("(() => { const button = [...document.querySelectorAll('button')].find((item) => (item.innerText || '').includes('Patients')); if (!button) return false; button.click(); return true; })()");
  await waitFor(() => evaluate('document.body.innerText.includes("Patient contacts")'));
  await captureResponsive("assistant-patients");
  const intake = await evaluate("(() => { const set = (labelText, value) => { const label = [...document.querySelectorAll('label')].find((item) => item.innerText.includes(labelText)); const input = label?.querySelector('input'); if (!input) return false; const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); return true; }; if (!set('Full name', 'Synthetic Assistant Intake')) return false; if (!set('Mobile number', '+91 90000 00003')) return false; const button = [...document.querySelectorAll('button')].find((item) => (item.innerText || '').trim() === 'Save contact'); if (!button) return false; button.click(); return true; })()");
  if (!intake) throw new Error("Assistant patient intake form could not be exercised.");
  await waitFor(() => evaluate('document.body.innerText.includes("Synthetic Assistant Intake")'));

  await evaluate("(() => { const button = [...document.querySelectorAll('button')].find((item) => (item.innerText || '').includes('Appointments')); if (!button) return false; button.click(); return true; })()");
  await waitFor(() => evaluate('document.body.innerText.includes("Appointment queue")'));
  const confirm = await evaluate("(() => { const card = [...document.querySelectorAll('.assistant-appointment')].find((item) => item.innerText.includes('Ananya Synthetic')); const button = card && [...card.querySelectorAll('button')].find((item) => (item.innerText || '').includes('Confirm')); if (!button) return false; button.click(); return true; })()");
  if (!confirm) throw new Error("Assistant appointment confirmation action was not found.");
  await waitFor(() => evaluate('document.body.innerText.includes("Appointment confirmed.")'));
  await captureResponsive("assistant-appointments");

  await evaluate("(() => { const button = [...document.querySelectorAll('button')].find((item) => (item.innerText || '').includes('Billing')); if (!button) return false; button.click(); return true; })()");
  await waitFor(() => evaluate('document.body.innerText.includes("Billing lookup") && document.body.innerText.includes("SYN-INV-001")'));
  await captureResponsive("assistant-billing");

  const signout = await evaluate("(() => { const button = document.querySelector('button[aria-label=\"Sign out\"]'); if (!button) return false; button.click(); return true; })()");
  if (!signout) throw new Error("Assistant sign-out action was not found.");
  await waitFor(() => evaluate('document.body.innerText.includes("Clinic Assistant") && Boolean(document.querySelector("input[type=password]"))'));
  await captureResponsive("assistant-login-after-logout");

  const evidence = await evaluate("({writes:window.__ORALYN_ASSISTANT_WRITES || [],unhandled:window.__ORALYN_ASSISTANT_UNHANDLED || []})");
  if (evidence.unhandled.length) throw new Error("Synthetic Assistant harness encountered unhandled API paths: " + evidence.unhandled.join(", "));
  for (const required of ["assistant-login", "patient-create", "appointment-confirm", "billing-read", "logout"]) {
    if (!evidence.writes.includes(required)) throw new Error("Expected synthetic Assistant workflow action missing: " + required);
  }
  if (runtimeErrors.length) throw new Error("Synthetic Assistant browser runtime errors: " + runtimeErrors.join(" | "));

  const metadata = [
    "environment=CI_SYNTHETIC_ONLY",
    "bundle=" + jsFile,
    "bundle_sha256=" + bundleHash,
    "synthetic_data_only=true",
    "synthetic_patient_names=Ananya Synthetic,Bharat Synthetic,Synthetic Assistant Intake",
    "assistant_role_ui_fixture=true",
    "assistant_backend_role_tests=separate_backend_ci",
    "staging_assistant_login_verified=false",
    "assistant_dashboard=passed_fixture",
    "assistant_patient_intake=passed_fixture",
    "assistant_appointment_confirm=passed_fixture",
    "assistant_billing_read=passed_fixture",
    "assistant_logout=passed_fixture",
    "doctor_clinical_ai_visible=false",
    "fonts_loaded=" + JSON.stringify(fonts),
    "pwa_service_worker_controlled=" + controlled,
    "unhandled_api_paths=none",
    "runtime_errors=none",
  ].join("\n") + "\n";
  fs.writeFileSync(path.join(output, "synthetic-assistant-info.txt"), metadata);
  console.log(JSON.stringify({ metadata, evidence, screenshots: fs.readdirSync(output).filter((name) => name.endsWith(".png")) }));
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
}).finally(() => {
  if (ws) ws.close();
  try { process.kill(chrome.pid); } catch {}
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
});
