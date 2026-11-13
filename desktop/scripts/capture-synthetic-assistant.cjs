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
const commit = process.env.GITHUB_SHA || "unknown";
const assetsDir = path.join(root, "dist", "assets");
const jsFile = fs.readdirSync(assetsDir).find((name) => name.endsWith(".js"));
if (!jsFile) throw new Error("Production JavaScript bundle was not found.");
const bundleHash = crypto.createHash("sha256").update(fs.readFileSync(path.join(assetsDir, jsFile))).digest("hex");
fs.mkdirSync(output, { recursive: true });

const chrome = spawn(chromePath, [
  "--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
  "--remote-debugging-address=127.0.0.1", "--remote-debugging-port=" + port, "--remote-allow-origins=*",
  "--disable-dev-shm-usage", "--user-data-dir=" + profile,
  "--window-size=1440,1000", "about:blank",
], { stdio: "ignore", windowsHide: true });

let ws;
let sequence = 0;
const pending = new Map();
const runtimeErrors = [];
const failedResponses = [];
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
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "Browser evaluation failed");
  return result.result && result.result.value;
}

async function capture(name, width = 1440, height = 1000, mobile = false) {
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile });
  await sleep(400);
  const shot = await send("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: false, fromSurface: true,
  });
  fs.writeFileSync(path.join(output, name), Buffer.from(shot.data, "base64"));
}

const fixtureSource = [
  "(() => {",
  "  window.ORALYN_API_BASE = 'https://oralyn-staging-api-assistant.onrender.com';",
  "  const token = 'synthetic-assistant-token';",
  "  const assistant = { id: 'assistant-synthetic-001', email: 'reception.synthetic@example.test', role: 'assistant', clinic_id: 'clinic-synthetic-001' };",
  "  const state = {",
  "    patients: [{ id: 'patient-synthetic-001', name: 'Ananya Synthetic', phone: '+919000000001' }],",
  "    appointments: [{ id: 'appointment-synthetic-001', patient_name: 'Ananya Synthetic', patient_phone: '+919000000001', treatment_type: 'Dental check-up', starts_at: '2026-11-20T10:00:00+05:30', status: 'requested' }],",
  "    invoices: [{ id: 'invoice-synthetic-001', invoice_number: 'INV-SYN-001', patient_name: 'Ananya Synthetic', status: 'issued', due_date: '2026-12-01', total_paise: 500000, paid_paise: 150000, balance_paise: 350000 }],",
  "    requests: [], writes: [], unhandled: []",
  "  };",
  "  window.__ORALYN_ASSISTANT_FIXTURE = state;",
  "  const originalFetch = window.fetch.bind(window);",
  "  const json = (payload, status = 200) => new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store, private' } });",
  "  const readBody = (init) => { try { return JSON.parse(init?.body || '{}'); } catch { return {}; } };",
  "  window.fetch = async (input, init = {}) => {",
  "    const rawUrl = typeof input === 'string' || input instanceof URL ? String(input) : input.url;",
  "    const url = new URL(rawUrl, location.href);",
  "    if (!url.pathname.startsWith('/v1/dental/')) return originalFetch(input, init);",
  "    const method = String(init.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();",
  "    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));",
  "    const auth = headers.get('authorization') || '';",
  "    state.requests.push(method + ' ' + url.pathname);",
  "    if (url.pathname === '/v1/dental/assistant/auth/login' && method === 'POST') {",
  "      const body = readBody(init);",
  "      if (body.email !== assistant.email || body.password !== 'SyntheticAssistantPassword!123') return json({ detail: { message: 'Synthetic fixture credentials are invalid.' } }, 401);",
  "      state.writes.push('assistant-login');",
  "      return json({ access_token: token, user: assistant });",
  "    }",
  "    if (auth !== 'Bearer ' + token) return json({ detail: { message: 'Synthetic Assistant authentication required.' } }, 401);",
  "    if (url.pathname === '/v1/dental/assistant/me' && method === 'GET') return json({ user: assistant });",
  "    if (url.pathname === '/v1/dental/assistant/auth/logout' && method === 'POST') { state.writes.push('assistant-logout'); return json({ result: { logged_out: true } }); }",
  "    if (url.pathname === '/v1/dental/assistant/patients' && method === 'GET') return json({ result: state.patients });",
  "    if (url.pathname === '/v1/dental/assistant/patients' && method === 'POST') {",
  "      const body = readBody(init);",
  "      const patient = { id: 'patient-synthetic-created', name: body.name, phone: body.phone };",
  "      state.patients.push(patient); state.writes.push('patient-intake');",
  "      return json({ result: patient }, 201);",
  "    }",
  "    if (url.pathname === '/v1/dental/assistant/appointments' && method === 'GET') return json({ result: state.appointments });",
  "    const appointmentMatch = url.pathname.match(/^\\/v1\\/dental\\/assistant\\/appointments\\/([^/]+)$/);",
  "    if (appointmentMatch && method === 'PATCH') {",
  "      const item = state.appointments.find((entry) => entry.id === appointmentMatch[1]);",
  "      if (!item) return json({ detail: { message: 'Synthetic appointment not found.' } }, 404);",
  "      const body = readBody(init);",
  "      Object.assign(item, body);",
  "      state.writes.push(body.starts_at ? 'appointment-reschedule' : 'appointment-confirm');",
  "      return json({ result: item });",
  "    }",
  "    if (url.pathname === '/v1/dental/assistant/billing/invoices' && method === 'GET') return json({ result: state.invoices });",
  "    const receiptMatch = url.pathname.match(/^\\/v1\\/dental\\/assistant\\/billing\\/invoices\\/([^/]+)\\/receipts$/);",
  "    if (receiptMatch && method === 'POST') {",
  "      const invoice = state.invoices.find((entry) => entry.id === receiptMatch[1]);",
  "      const body = readBody(init);",
  "      if (!invoice || Number(body.amount_paise) <= 0 || Number(body.amount_paise) > invoice.balance_paise) return json({ detail: { message: 'Invalid synthetic receipt.' } }, 409);",
  "      invoice.paid_paise += Number(body.amount_paise); invoice.balance_paise -= Number(body.amount_paise);",
  "      invoice.status = invoice.balance_paise === 0 ? 'paid' : 'partially_paid';",
  "      state.writes.push('receipt-recorded');",
  "      return json({ result: { id: 'receipt-synthetic-001', amount_paise: body.amount_paise, method: body.method } }, 201);",
  "    }",
  "    state.unhandled.push(method + ' ' + url.pathname);",
  "    return json({ detail: { message: 'This synthetic Assistant fixture does not allow that API path.' } }, 403);",
  "  };",
  "})();"
].join("\n");

async function main() {
  await waitFor(async () => {
    const response = await fetch("http://127.0.0.1:" + port + "/json/list").catch(() => null);
    if (!response || !response.ok) return false;
    const targets = await response.json();
    const existing = targets.find((item) => item.type === "page" && item.webSocketDebuggerUrl);
    if (existing) return existing;
    const created = await fetch("http://127.0.0.1:" + port + "/json/new?about:blank", { method: "PUT" });
    if (created.ok) return await created.json();
    return null;
  });
  const targets = await (await fetch("http://127.0.0.1:" + port + "/json/list")).json();
  const target = targets.find((item) => item.type === "page" && item.webSocketDebuggerUrl);
  if (!target) throw new Error("Chrome page target not found");

  ws = new WebSocket(target.webSocketDebuggerUrl);
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.method === "Runtime.exceptionThrown") runtimeErrors.push(message.params.exceptionDetails?.text || "runtime exception");
    if (message.method === "Log.entryAdded" && message.params.entry?.level === "error") runtimeErrors.push(message.params.entry.text);
    if (message.method === "Network.responseReceived" && Number(message.params.response?.status) >= 400) failedResponses.push({ status: message.params.response.status, url: message.params.response.url, type: message.params.type });
    if (message.method === "Network.loadingFailed") failedResponses.push({ error: message.params.errorText, url: message.params.requestId });
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
  await send("Network.enable");

  await waitFor(() => evaluate('document.readyState === "complete" && document.body.innerText.includes("Clinic Assistant sign in")'));
  await capture("assistant-login-1440x1000.png", 1440, 1000);
  await capture("assistant-login-390x844.png", 390, 844, true);
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

  await send("Page.addScriptToEvaluateOnNewDocument", { source: fixtureSource });
  await send("Page.navigate", { url: baseUrl + "/assistant/" });
  await waitFor(() => evaluate('document.readyState === "complete" && document.body.innerText.includes("Clinic Assistant sign in")'));

  await evaluate(`(() => {
    document.querySelector('#login-form [name="email"]').value = 'reception.synthetic@example.test';
    document.querySelector('#login-form [name="password"]').value = 'SyntheticAssistantPassword!123';
    document.querySelector('#login-form').requestSubmit();
    return true;
  })()`);
  await waitFor(() => evaluate('document.body.innerText.includes("reception.synthetic@example.test") && document.body.innerText.includes("Ananya Synthetic") && document.body.innerText.includes("INV-SYN-001")'));
  const fontLoaded = await evaluate('document.fonts.load("400 16px \\"Plus Jakarta Sans\\"").then((faces) => faces.length > 0)');
  if (!fontLoaded) throw new Error("Bundled Plus Jakarta Sans did not load in the Assistant workspace.");
  await capture("assistant-workspace-1440x1000.png", 1440, 1000);
  await capture("assistant-workspace-768x1024.png", 768, 1024);
  await capture("assistant-workspace-390x844.png", 390, 844, true);
  const mobileLayout = await evaluate("({width:window.innerWidth,scrollWidth:document.documentElement.scrollWidth,inputsLabeled:[...document.querySelectorAll('input')].every((input) => input.labels && input.labels.length > 0)})");
  if (mobileLayout.scrollWidth > mobileLayout.width + 1 || !mobileLayout.inputsLabeled) throw new Error("Assistant mobile layout or form labels failed: " + JSON.stringify(mobileLayout));
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

  const intakeValidation = await evaluate(`(() => {
    const form = document.querySelector('#patient-form');
    const name = form.querySelector('[name="name"]');
    const phone = form.querySelector('[name="phone"]');
    name.value = 'Riya Synthetic';
    phone.value = '9876543210';
    name.dispatchEvent(new Event('input', {bubbles:true}));
    phone.dispatchEvent(new Event('input', {bubbles:true}));
    return {valid:form.checkValidity(),nameValid:name.checkValidity(),phoneValid:phone.checkValidity(),phonePattern:phone.pattern,phoneMessage:phone.validationMessage};
  })()`);
  if (!intakeValidation.valid) throw new Error("Synthetic Assistant patient form validation failed: " + JSON.stringify(intakeValidation));
  await evaluate(`(() => {
    document.querySelector('#patient-form button[type="submit"]').click();
    return true;
  })()`);
  await waitFor(() => evaluate('document.body.innerText.includes("Patient contact saved.") || (document.getElementById("workspace-message") && document.getElementById("workspace-message").textContent.trim().length > 0)'));
  const intakeResult = await evaluate(`(() => ({
    success:document.body.innerText.includes("Patient contact saved.") && document.body.innerText.includes("Riya Synthetic"),
    message:document.getElementById("workspace-message")?.textContent || "",
    patientList:document.getElementById("patient-list")?.innerText || "",
    writes:window.__ORALYN_ASSISTANT_FIXTURE?.writes || [],
    requests:window.__ORALYN_ASSISTANT_FIXTURE?.requests || []
  }))()`);
  if (!intakeResult.success) throw new Error("Synthetic Assistant patient intake did not persist in the UI: " + JSON.stringify(intakeResult));

  const confirmed = await evaluate(`(() => {
    const button = document.querySelector('[data-confirm="appointment-synthetic-001"]');
    if (!button) return false;
    button.click();
    return true;
  })()`);
  if (!confirmed) throw new Error("Synthetic Assistant appointment confirmation action was not found.");
  await waitFor(() => evaluate('document.body.innerText.includes("Appointment confirmed.")'));

  await evaluate(`(() => {
    const form = document.querySelector('[data-reschedule="appointment-synthetic-001"]');
    if (!form) return false;
    form.querySelector('[name="starts_at"]').value = '2026-11-21T10:00';
    form.requestSubmit();
    return true;
  })()`);
  await waitFor(() => evaluate('document.body.innerText.includes("Appointment rescheduled.")'));

  await evaluate(`(() => {
    const form = document.querySelector('[data-receipt="invoice-synthetic-001"]');
    if (!form) return false;
    form.querySelector('[name="amount"]').value = '10.00';
    form.querySelector('[name="method"]').value = 'upi';
    form.querySelector('[name="reference"]').value = 'SYNTHETIC-UPI-001';
    form.requestSubmit();
    return true;
  })()`);
  await waitFor(() => evaluate('document.body.innerText.includes("Payment received and receipt recorded.")'));
  await waitFor(() => evaluate('document.body.innerText.includes("₹3,490") || document.body.innerText.includes("3,490")'));

  const evidence = await evaluate(`(() => {
    const fixture = window.__ORALYN_ASSISTANT_FIXTURE;
    const controls = [...document.querySelectorAll('button,a')].map((item) => (item.innerText || '').toLowerCase());
    const forbiddenControls = controls.filter((value) => /clinical|diagnos|prescription|odontogram|treatment plan|intelligence/.test(value) || value === 'ai');
    const tokenPersisted = sessionStorage.getItem('oralyn_assistant_session');
    const workspaceVisible = !document.getElementById('workspace')?.classList.contains('hidden');
    return {
      requests: fixture.requests,
      writes: fixture.writes,
      unhandled: fixture.unhandled,
      patientCount: fixture.patients.length,
      appointmentStatus: fixture.appointments[0].status,
      appointmentRescheduled: fixture.appointments[0].starts_at.startsWith('2026-11-21'),
      invoiceBalancePaise: fixture.invoices[0].balance_paise,
      tokenPersisted: Boolean(tokenPersisted),
      workspaceVisible,
      forbiddenControls
    };
  })()`);
  if (evidence.unhandled.length) throw new Error("Synthetic Assistant harness encountered unhandled API paths: " + evidence.unhandled.join(", "));
  if (evidence.forbiddenControls.length) throw new Error("Assistant UI exposed forbidden clinical controls: " + evidence.forbiddenControls.join(", "));
  if (!evidence.writes.includes("assistant-login") || !evidence.writes.includes("patient-intake") ||
      !evidence.writes.includes("appointment-confirm") || !evidence.writes.includes("appointment-reschedule") ||
      !evidence.writes.includes("receipt-recorded") || evidence.tokenPersisted || !evidence.workspaceVisible ||
      evidence.patientCount !== 2 || evidence.appointmentStatus !== "confirmed" ||
      !evidence.appointmentRescheduled || evidence.invoiceBalancePaise !== 349000) {
    throw new Error("Synthetic Assistant workflow evidence is incomplete: " + JSON.stringify(evidence));
  }
  if (evidence.requests.some((value) => /\/v1\/dental\/(doctor|ai)\//.test(value))) {
    throw new Error("Assistant UI attempted a Doctor or AI API route.");
  }

  const logout = await evaluate("(() => { const button = document.querySelector('#logout'); if (!button) return false; button.click(); return true; })()");
  if (!logout) throw new Error("Assistant sign-out button was not found.");
  await waitFor(() => evaluate('document.body.innerText.includes("Clinic Assistant sign in") && !sessionStorage.getItem("oralyn_assistant_session")'));
  await send("Page.navigate", { url: baseUrl + "/assistant/" });
  await waitFor(() => evaluate('document.body.innerText.includes("Clinic Assistant sign in") && document.getElementById("workspace").classList.contains("hidden")'));
  await capture("assistant-logout-1440x1000.png", 1440, 1000);

  if (runtimeErrors.length || failedResponses.length) throw new Error("Synthetic Assistant browser runtime errors: " + runtimeErrors.join(" | ") + " | HTTP/resource failures: " + JSON.stringify(failedResponses));
  const metadata = [
    "commit=" + commit,
    "environment=CI_SYNTHETIC_ONLY",
    "bundle=" + jsFile,
    "bundle_sha256=" + bundleHash,
    "synthetic_data_only=true",
    "assistant_login=mocked",
    "assistant_patient_intake=passed_fixture",
    "assistant_appointment_confirm=passed_fixture",
    "assistant_appointment_reschedule=passed_fixture",
    "assistant_receipt_recording=passed_fixture",
    "assistant_session_logout=passed_fixture",
    "assistant_mobile_layout=" + JSON.stringify(mobileLayout),
    "doctor_ai_api_calls=none",
    "clinical_controls=none",
    "unhandled_api_paths=none",
    "runtime_errors=none"
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
