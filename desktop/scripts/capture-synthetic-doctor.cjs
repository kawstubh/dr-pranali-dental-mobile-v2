const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");

const root = process.cwd();
const output = path.resolve(process.env.ORALYN_CAPTURE_OUTPUT || path.join(root, "evidence", "synthetic-doctor"));
const chromePath = process.env.CHROME_BIN || "google-chrome";
const port = Number(process.env.CDP_PORT || 19311);
const baseUrl = process.env.ORALYN_PREVIEW_URL || "http://127.0.0.1:4176";
const profile = path.join(os.tmpdir(), "oralyn-synthetic-doctor-" + process.pid);
const commit = process.env.GITHUB_SHA || "unknown";
const assetsDir = path.join(root, "dist", "assets");
const jsFile = fs.readdirSync(assetsDir).find((name) => name.endsWith(".js"));
if (!jsFile) throw new Error("Production JavaScript bundle was not found.");
const bundleHash = crypto.createHash("sha256").update(fs.readFileSync(path.join(assetsDir, jsFile))).digest("hex");
fs.mkdirSync(output, { recursive: true });

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

async function capture(name, width = 1440, height = 1000, mobile = false) {
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile });
  await sleep(450);
  const shot = await send("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: false, fromSurface: true,
  });
  fs.writeFileSync(path.join(output, name), Buffer.from(shot.data, "base64"));
}

async function navigate(route, expectedText) {
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: baseUrl + route });
  await waitFor(() => evaluate('document.readyState === "complete"'));
  await waitFor(() => evaluate("document.body && document.body.innerText.includes(" + JSON.stringify(expectedText) + ")"));
}

const fixtureSource = [
  "(() => {",
  "  const tokenOne = 'synthetic-doctor-token';",
  "  const tokenTwo = 'synthetic-doctor-token-2';",
  "  const clinicOne = 'clinic-synthetic-one';",
  "  const clinicTwo = 'clinic-synthetic-two';",
  "  const patientOne = { id: 'patient-synthetic-001', name: 'Ananya Synthetic', phone: '+91 90000 00001', email: 'ananya.synthetic@example.test', age: 34, clinic_id: clinicOne, patient_code: 'SYN-001' };",
  "  const patientTwo = { id: 'patient-synthetic-002', name: 'Bharat Synthetic', phone: '+91 90000 00002', email: 'bharat.synthetic@example.test', age: 41, clinic_id: clinicTwo, patient_code: 'SYN-002' };",
  "  const workspaceOne = { id: clinicOne, clinic_id: clinicOne, name: 'Dr Pranali Dental Clinic', clinic_name: 'Dr Pranali Dental Clinic', organisation_id: 'org-synthetic', organisation_name: 'Synthetic Organisation', role: 'owner', active_doctors: 1 };",
  "  const workspaceTwo = { id: clinicTwo, clinic_id: clinicTwo, name: 'Dr Pranali — Branch', clinic_name: 'Dr Pranali — Branch', organisation_id: 'org-synthetic', organisation_name: 'Synthetic Organisation', role: 'doctor', active_doctors: 1 };",
  "  const workspaces = [workspaceOne, workspaceTwo];",
  "  const userFor = (clinicId) => ({ id: 'doctor-synthetic-001', doctor_id: 'doctor-synthetic-001', email: 'doctor.synthetic@example.test', name: 'Dr Pranali Dental Clinic', role: clinicId === clinicOne ? 'owner' : 'doctor', clinic_id: clinicId, organisation_id: 'org-synthetic', organisation_name: 'Synthetic Organisation' });",
  "  const summaryFor = (clinicId) => ({ patient_count: 1, appointment_count: clinicId === clinicOne ? 1 : 0, issued_invoice_count: 0, active_treatment_plan_count: 0, pending_appointment_requests: 0, invoiced_total_paise: 0, collected_total_paise: 0, outstanding_balance_paise: 0 });",
  "  const appointmentFor = (patient) => ({ id: 'appointment-' + patient.id, patient_id: patient.id, patient_name: patient.name, starts_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), treatment_type: 'Dental check-up', status: 'confirmed', note: 'Synthetic CI fixture' });",
  "  if (!localStorage.getItem('oralyn_synthetic_bootstrapped')) {",
  "    localStorage.setItem('oralyn_doctor_token', tokenOne);",
  "    localStorage.setItem('oralyn_active_workspace_id', clinicOne);",
  "    localStorage.setItem('oralyn_synthetic_bootstrapped', 'true');",
  "  }",
  "  window.__ORALYN_SYNTHETIC_WRITES = JSON.parse(localStorage.getItem('oralyn_synthetic_writes') || '[]');",
  "  window.__ORALYN_SYNTHETIC_UNHANDLED = JSON.parse(localStorage.getItem('oralyn_synthetic_unhandled') || '[]');",
  "  const recordWrite = (value) => { window.__ORALYN_SYNTHETIC_WRITES.push(value); localStorage.setItem('oralyn_synthetic_writes', JSON.stringify(window.__ORALYN_SYNTHETIC_WRITES)); };",
  "  const recordUnhandled = (value) => { window.__ORALYN_SYNTHETIC_UNHANDLED.push(value); localStorage.setItem('oralyn_synthetic_unhandled', JSON.stringify(window.__ORALYN_SYNTHETIC_UNHANDLED)); };"
  "  const originalFetch = window.fetch.bind(window);",
  "  const json = (payload, status = 200) => new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store, private' } });",
  "  window.fetch = async (input, init = {}) => {",
  "    const rawUrl = typeof input === 'string' || input instanceof URL ? String(input) : input.url;",
  "    const url = new URL(rawUrl, location.href);",
  "    if (!url.pathname.startsWith('/v1/dental/')) return originalFetch(input, init);",
  "    const requestHeaders = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));",
  "    const method = String(init.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();",
  "    const authorization = requestHeaders.get('authorization') || '';",
  "    const activeToken = authorization.replace(/^Bearer\\s+/i, '');",
  "    const validDoctor = activeToken === tokenOne || activeToken === tokenTwo;",
  "    const clinicId = activeToken === tokenTwo ? clinicTwo : clinicOne;",
  "    const patient = clinicId === clinicOne ? patientOne : patientTwo;",
  "    if (url.pathname === '/v1/dental/health') return json({ result: { status: 'ok', fixture: true } });",
  "    if (url.pathname === '/v1/dental/auth/me') {",
  "      if (!validDoctor) return json({ detail: { message: 'Synthetic doctor session expired', code: 'INVALID_DOCTOR_SESSION' } }, 401);",
  "      return json({ user: userFor(clinicId) });",
  "    }",
  "    if (url.pathname === '/v1/dental/auth/logout') { recordWrite('logout'); return json({ result: { logged_out: true } }); }",
  "    if (!validDoctor) return json({ detail: { message: 'Synthetic doctor authentication required' } }, 401);",
  "    if (url.pathname === '/v1/dental/auth/workspaces') return json({ result: workspaces });",
  "    if (url.pathname === '/v1/dental/auth/workspace/switch' && method === 'POST') {",
  "      let body = {}; try { body = JSON.parse(init.body || '{}'); } catch {}",
  "      if (body.clinic_id !== clinicOne && body.clinic_id !== clinicTwo) return json({ detail: { message: 'Workspace is not in the authenticated organisation', code: 'WORKSPACE_ACCESS_DENIED' } }, 403);",
  "      const nextToken = body.clinic_id === clinicTwo ? tokenTwo : tokenOne;",
  "      return json({ access_token: nextToken, user: userFor(body.clinic_id), workspaces });",
  "    }",
  "    if (url.pathname === '/v1/dental/doctor/dashboard/summary') return json({ result: summaryFor(clinicId) });",
  "    if (url.pathname === '/v1/dental/patients' && method === 'GET') return json({ result: [patient] });",
  "    if (url.pathname === '/v1/dental/appointments' && method === 'GET') return json({ result: clinicId === clinicOne ? [appointmentFor(patient)] : [] });",
  "    if (url.pathname === '/v1/dental/appointments' && method === 'POST') { recordWrite('appointment-create'); return json({ result: { id: 'appointment-synthetic-created', patient_id: patient.id, status: 'requested' } }); }",
  "    if (url.pathname === '/v1/dental/intelligence/run' && method === 'POST') {",
  "      recordWrite('doctor-intelligence');",
  "      return json({ result: { summary: 'Synthetic clinician summary for review by the treating dentist.', documented_findings: ['Tooth 36: caries recorded in the synthetic chart.'], missing_information: ['Radiograph not attached to this synthetic fixture.'], clinician_questions: ['Confirm the documented history before planning care.'], safety_note: 'No diagnosis or prescription was generated.' } });",
  "    }",
  "    const chartMatch = url.pathname.match(/^\\/v1\\/dental\\/patients\\/([^/]+)\\/chart$/);",
  "    if (chartMatch && chartMatch[1] === patient.id && method === 'GET') return json({ result: [{ tooth_fdi: '36', status: 'caries' }, { tooth_fdi: '11', status: 'healthy' }] });",
  "    if (chartMatch && chartMatch[1] === patient.id && method === 'POST') { recordWrite('chart-save'); return json({ result: { saved: true, patient_id: patient.id } }); }",
  "    const inviteMatch = url.pathname.match(/^\\/v1\\/dental\\/doctor\\/patients\\/([^/]+)\\/invite$/);",
  "    if (inviteMatch && inviteMatch[1] === patient.id && method === 'POST') { recordWrite('patient-invite'); return json({ result: { patient_id: patient.id, invite_code: 'SYNTHETIC-INVITE-001', expires_in: 86400 } }); }",
  "    if (/^\\/v1\\/dental\\/doctor\\/patients\\/[^/]+\\/(treatment-plans|invoices|documents|clinical-notes|messages)$/.test(url.pathname)) return json({ result: [] });",
  "    if (/^\\/v1\\/dental\\/doctor\\/documents\\/[^/]+\\/download-intent$/.test(url.pathname)) return json({ result: { url: 'https://synthetic.invalid/private-document', expires_in: 60 } });",
  "    recordUnhandled(method + ' ' + url.pathname);",
  "    return json({ result: [] });",
  "  };",
  "})();"
].join("\n");

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
  await send("Page.navigate", { url: baseUrl + "/doctor/dashboard" });
  await waitFor(() => evaluate('document.readyState === "complete" && document.body.innerText.includes("Dr Pranali Dental Clinic")'));
  await waitFor(() => evaluate('document.body.innerText.includes("Ananya Synthetic")'));
  await waitFor(() => evaluate("(async () => { const registration = await navigator.serviceWorker?.getRegistration('/'); return Boolean(registration?.active && registration.active.state === 'activated'); })()"), 30000);
  let pwaControlled = await evaluate("Boolean(navigator.serviceWorker && navigator.serviceWorker.controller)");
  if (!pwaControlled) {
    await send("Page.navigate", { url: baseUrl + "/doctor/dashboard" });
    await waitFor(() => evaluate('document.readyState === "complete" && document.body.innerText.includes("Dr Pranali Dental Clinic") && Boolean(navigator.serviceWorker && navigator.serviceWorker.controller)'), 20000);
    pwaControlled = await evaluate("Boolean(navigator.serviceWorker && navigator.serviceWorker.controller)");
  }
  if (!pwaControlled) throw new Error("Synthetic Doctor capture is not controlled by the Oralyn PWA service worker.");
  const fontStatus = await evaluate('({plusJakartaSans:document.fonts.check("400 16px \\"Plus Jakarta Sans\\""),playfairDisplay:document.fonts.check("600 32px \\"Playfair Display\\"")})');
  if (!fontStatus.plusJakartaSans || !fontStatus.playfairDisplay) throw new Error("Bundled Oralyn fonts failed in synthetic Doctor session: " + JSON.stringify(fontStatus));

  await capture("doctor-dashboard-1440x1000.png");
  await capture("doctor-dashboard-390x844.png", 390, 844, true);

  await navigate("/doctor/patients", "PATIENT DIRECTORY");
  const inviteClicked = await evaluate("(() => { const button = [...document.querySelectorAll('button')].find((item) => (item.innerText || '').includes('Create invite')); if (!button) return false; button.click(); return true; })()");
  if (!inviteClicked) throw new Error("Synthetic patient invite action was not found.");
  await waitFor(() => evaluate('document.body.innerText.includes("SYNTHETIC-INVITE-001")'));
  await capture("doctor-patient-directory-1440x1000.png");

  await navigate("/doctor/clinical", "Clinical workspace");
  await waitFor(() => evaluate('document.body.innerText.includes("Ananya Synthetic")'));
  const chartSaved = await evaluate("(() => { const button = [...document.querySelectorAll('button')].find((item) => (item.innerText || '').includes('Save finding to patient record')); if (!button || button.disabled) return false; button.click(); return true; })()");
  if (!chartSaved) throw new Error("Synthetic odontogram save action was not available.");
  await waitFor(() => evaluate('document.body.innerText.includes("Dental chart saved to the clinic record")'));
  await capture("doctor-odontogram-1440x1000.png");

  const intelligenceClicked = await evaluate("(() => { const button = [...document.querySelectorAll('button')].find((item) => (item.innerText || '').includes('Generate clinician summary')); if (!button) return false; button.click(); return true; })()");
  if (!intelligenceClicked) throw new Error("Doctor-only clinical intelligence action was not found.");
  await waitFor(() => evaluate('document.querySelector(".airesult") && document.querySelector(".airesult").innerText.includes("Synthetic clinician summary")'));
  await capture("doctor-clinical-intelligence-1440x1000.png");

  await navigate("/doctor/appointments", "Appointments");
  await waitFor(() => evaluate('document.body.innerText.includes("Ananya Synthetic")'));
  await capture("doctor-appointments-1440x1000.png");
  await capture("doctor-appointments-390x844.png", 390, 844, true);

  const switched = await evaluate("(() => { const select = document.querySelector('select[aria-label=\\"Switch clinic workspace\\"]'); if (!select) return false; select.value = 'clinic-synthetic-two'; select.dispatchEvent(new Event('change', { bubbles: true })); return true; })()");
  if (!switched) throw new Error("Synthetic clinic workspace switcher was not found.");
  await waitFor(() => evaluate('document.body.innerText.includes("Bharat Synthetic")'));
  const isolation = await evaluate('({newClinicVisible:document.body.innerText.includes("Bharat Synthetic"),oldClinicHidden:!document.body.innerText.includes("Ananya Synthetic")})');
  if (!isolation.newClinicVisible || !isolation.oldClinicHidden) throw new Error("Synthetic clinic switch did not clear the previous clinic data: " + JSON.stringify(isolation));
  await capture("doctor-workspace-switch-1440x1000.png");

  const switchedBack = await evaluate("(() => { const select = document.querySelector('select[aria-label=\\"Switch clinic workspace\\"]'); if (!select) return false; select.value = 'clinic-synthetic-one'; select.dispatchEvent(new Event('change', { bubbles: true })); return true; })()");
  if (!switchedBack) throw new Error("Could not select the original synthetic clinic.");
  await waitFor(() => evaluate('document.body.innerText.includes("Ananya Synthetic")'));

  await send("Page.reload", { ignoreCache: true });
  await waitFor(() => evaluate('document.body.innerText.includes("Dr Pranali Dental Clinic") && document.body.innerText.includes("Ananya Synthetic")'));
  const restore = await evaluate('localStorage.getItem("oralyn_doctor_token") === "synthetic-doctor-token"');
  if (!restore) throw new Error("Doctor session was not restored from localStorage after reload.");

  await send("Page.navigate", { url: baseUrl + "/doctor/settings" });
  await waitFor(() => evaluate('document.body.innerText.includes("Sign out securely")'));
  const signout = await evaluate("(() => { const button = [...document.querySelectorAll('button')].find((item) => (item.innerText || '').trim() === 'Sign out securely'); if (!button) return false; button.click(); return true; })()");
  if (!signout) throw new Error("Doctor sign-out action was not found.");
  await waitFor(() => evaluate('document.body.innerText.includes("Sign in with your clinic doctor account")'));
  const logoutCleared = await evaluate('!localStorage.getItem("oralyn_doctor_token")');
  if (!logoutCleared) throw new Error("Doctor logout did not clear the local session token.");
  await capture("doctor-logout-1440x1000.png");

  await evaluate('localStorage.setItem("oralyn_doctor_token", "expired-synthetic-token")');
  await send("Page.navigate", { url: baseUrl + "/doctor/dashboard" });
  await waitFor(() => evaluate('document.body.innerText.includes("Your session expired. Please sign in again.")'));
  const expiryCleared = await evaluate('!localStorage.getItem("oralyn_doctor_token")');
  if (!expiryCleared) throw new Error("Expired Doctor session was not cleared.");
  await capture("doctor-session-expired-1440x1000.png");

  const evidence = await evaluate("({writes:window.__ORALYN_SYNTHETIC_WRITES || [],unhandled:window.__ORALYN_SYNTHETIC_UNHANDLED || []})");
  if (evidence.unhandled.length) throw new Error("Synthetic Doctor harness encountered unhandled API paths: " + evidence.unhandled.join(", "));
  if (!evidence.writes.includes("patient-invite") || !evidence.writes.includes("chart-save") || !evidence.writes.includes("doctor-intelligence") || !evidence.writes.includes("logout")) {
    throw new Error("Expected synthetic Doctor workflow actions were not recorded: " + JSON.stringify(evidence));
  }
  if (runtimeErrors.length) throw new Error("Synthetic Doctor browser runtime errors: " + runtimeErrors.join(" | "));

  const metadata = [
    "commit=" + commit,
    "environment=CI_SYNTHETIC_ONLY",
    "bundle=" + jsFile,
    "bundle_sha256=" + bundleHash,
    "synthetic_data_only=true",
    "synthetic_patient_names=Ananya Synthetic,Bharat Synthetic",
    "authenticated_ui_fixture=true",
    "staging_authenticated_e2e=false",
    "doctor_password_login_verified=false",
    "doctor_session_restore=passed",
    "doctor_session_expiry=passed",
    "doctor_logout=passed",
    "doctor_clinic_switching=passed_fixture",
    "cross_organisation_denial=fixture_403_not_backend",
    "patient_invite_ui=passed_fixture",
    "odontogram_save_ui=passed_fixture",
    "doctor_only_intelligence_ui=passed_fixture",
    "fonts_loaded=" + JSON.stringify(fontStatus),
    "pwa_service_worker_controlled=" + pwaControlled,
    "unhandled_api_paths=none",
    "runtime_errors=none"
  ].join("\n") + "\n";
  fs.writeFileSync(path.join(output, "synthetic-doctor-info.txt"), metadata);
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
