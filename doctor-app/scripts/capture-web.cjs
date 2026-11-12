const { spawn, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const chromePath = process.env.CHROME_BIN || (process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'google-chrome');
const port = Number(process.env.CDP_PORT || 9223);
const baseUrl = process.env.DOCTOR_WEB_BASE_URL || 'http://127.0.0.1:19007';
const outDir = path.join(process.cwd(), 'build-evidence', 'doctor-web');
fs.mkdirSync(outDir, { recursive: true });
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const chrome = spawn(chromePath, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
  '--remote-debugging-port=' + port, '--remote-allow-origins=*',
  '--disable-dev-shm-usage',
  '--user-data-dir=' + path.join(process.cwd(), '.chrome-doctor-profile-' + process.pid),
  '--window-size=1440,1000', baseUrl
], { stdio: 'ignore', windowsHide: true });

let ws, nextId = 0;
const pending = new Map();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitFor(fn, ms = 20000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const value = await fn();
    if (value) return value;
    await sleep(250);
  }
  throw new Error('Timed out waiting for Doctor desktop UI');
}

function send(method, params = {}) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error('CDP timeout: ' + method));
      }
    }, 20000);
  });
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression, returnByValue: true, awaitPromise: true
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || 'Browser evaluation failed');
  }
  return result.result && result.result.value;
}

async function capture(name, width = 1440, height = 1000) {
  await send('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: 1, mobile: false
  });
  await sleep(450);
  const screenshot = await send('Page.captureScreenshot', {
    format: 'png', captureBeyondViewport: false, fromSurface: true
  });
  fs.writeFileSync(path.join(outDir, name), Buffer.from(screenshot.data, 'base64'));
}

async function clickText(label) {
  const expression = `(() => {
    const nodes = [...document.querySelectorAll('button,[role="button"],a')];
    const node = nodes.find(item => (item.innerText || item.textContent || '').includes(${JSON.stringify(label)}));
    if (!node) return { found: false, candidates: nodes.map(item => (item.innerText || item.textContent || '').trim()).filter(Boolean).slice(0, 50) };
    node.click();
    return { found: true };
  })()`;
  const result = await evaluate(expression);
  if (!result || !result.found) {
    throw new Error('Could not find Doctor control ' + label + ': ' + JSON.stringify(result));
  }
}

async function fillInput(placeholder, value) {
  const expression = `(() => {
    const input = [...document.querySelectorAll('input')].find(item => item.placeholder === ${JSON.stringify(placeholder)});
    if (!input) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, ${JSON.stringify(value)});
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`;
  if (!await evaluate(expression)) {
    throw new Error('Doctor login input not found: ' + placeholder);
  }
}

async function scrollToText(label) {
  const expression = `(() => {
    const nodes = [...document.querySelectorAll('body *')];
    const node = nodes.find(item => item.children.length === 0 && (item.textContent || '').trim().includes(${JSON.stringify(label)}));
    if (!node) return false;
    node.scrollIntoView({ block: 'center', inline: 'nearest' });
    return true;
  })()`;
  if (!await evaluate(expression)) {
    throw new Error('Could not locate Doctor content: ' + label);
  }
  await sleep(350);
}

async function selectWorkspaceIfNeeded() {
  const needsChoice = await evaluate('document.body.innerText.includes("Choose a workspace")');
  if (!needsChoice) return false;
  await capture('doctor-workspace-selection-1440x1000.png');
  const selected = await evaluate(`(() => {
    const nodes = [...document.querySelectorAll('button,[role="button"]')];
    const node = nodes.find(item => (item.innerText || item.textContent || '').includes('Role:'));
    if (!node) return false;
    node.click();
    return true;
  })()`);
  if (!selected) throw new Error('Workspace selection was displayed but no authorised workspace option was available');
  await waitFor(() => evaluate('document.body.innerText.includes("Good day, Doctor")'), 30000);
  return true;
}

async function login(email, password) {
  await waitFor(() => evaluate('document.body.innerText.includes("Sign in with your clinic-issued email and password.")'));
  await fillInput('doctor@clinic.com', email);
  await fillInput('Enter your password', password);
  await clickText('Sign in securely');
  await waitFor(async () => {
    const text = await evaluate('document.body.innerText');
    return text.includes('Good day, Doctor') || text.includes('Choose a workspace');
  }, 30000);
  const workspaceSelected = await selectWorkspaceIfNeeded();
  await waitFor(() => evaluate('document.body.innerText.includes("Good day, Doctor")'), 30000);
  return workspaceSelected;
}

async function reloadAndVerifySession() {
  await send('Page.reload');
  await waitFor(async () => {
    const text = await evaluate('document.body.innerText');
    return text.includes('Good day, Doctor') || text.includes('Choose a workspace');
  }, 30000);
  const workspaceSelected = await selectWorkspaceIfNeeded();
  await waitFor(() => evaluate('document.body.innerText.includes("Good day, Doctor")'), 30000);
  return workspaceSelected;
}

async function signOut() {
  await clickText('Sign out');
  await waitFor(() => evaluate('document.body.innerText.includes("Sign in with your clinic-issued email and password.")'), 20000);
}

(async () => {
  const flags = {
    authenticatedDashboard: false,
    populatedDatasetVerified: false,
    emptyDashboardVerified: false,
    emptyPatientsVerified: false,
    emptyAppointmentsVerified: false,
    patientChartCaptured: false,
    periodontogramCaptured: false,
    clinicalIntelligenceCaptured: false,
    workspaceSelectionCaptured: false,
    workspaceManagementVisible: false,
    organisationCreateFormCaptured: false,
    doctorAccessFormCaptured: false,
    crossWorkspaceFormCaptured: false,
    sessionRestored: false,
    emptySessionRestored: false
  };
  try {
    await waitFor(async () => {
      const response = await fetch('http://127.0.0.1:' + port + '/json/list').catch(() => null);
      if (!response || !response.ok) return false;
      return (await response.json()).find(item => item.type === 'page' && item.webSocketDebuggerUrl && item.url.startsWith(baseUrl));
    });
    const targets = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
    const target = targets.find(item => item.type === 'page' && item.webSocketDebuggerUrl && item.url.startsWith(baseUrl));
    if (!target) throw new Error('Chrome page target not found');

    ws = new WebSocket(target.webSocketDebuggerUrl);
    ws.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) {
        const promise = pending.get(message.id);
        pending.delete(message.id);
        message.error ? promise.reject(new Error(message.error.message)) : promise.resolve(message.result || {});
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
    await waitFor(() => evaluate('document.body.innerText.includes("Sign in with your clinic-issued email and password.")'));
    await capture('doctor-login-1440x1000.png');
    await capture('doctor-login-1280x800.png', 1280, 800);

    const email = process.env.DENTAL_STAGING_DOCTOR_EMAIL || '';
    const password = process.env.DENTAL_STAGING_DOCTOR_PASSWORD || '';
    const datasetMarker = process.env.DENTAL_STAGING_DOCTOR_TEST_DATASET || '';
    const emptyEmail = process.env.DENTAL_STAGING_DOCTOR_EMPTY_EMAIL || '';
    const emptyPassword = process.env.DENTAL_STAGING_DOCTOR_EMPTY_PASSWORD || '';
    const emptyMarker = process.env.DENTAL_STAGING_DOCTOR_EMPTY_DATASET || 'No patients yet';

    if (email && password) {
      flags.workspaceSelectionCaptured = await login(email, password);
      flags.authenticatedDashboard = true;
      await capture('doctor-dashboard-populated-1440x1000.png');
      await capture('doctor-dashboard-populated-1280x800.png', 1280, 800);

      flags.workspaceManagementVisible = await evaluate('document.body.innerText.includes("Workspace management")');
      if (flags.workspaceManagementVisible) {
        await scrollToText('Workspace management');
        await capture('doctor-workspace-management-1440x1000.png');
        await clickText('Create another clinic or hospital');
        await scrollToText('Organisation name');
        await capture('doctor-organisation-create-form-1440x1000.png');
        flags.organisationCreateFormCaptured = true;
        await clickText('Cancel');
        await scrollToText('Doctor access');
        await capture('doctor-account-create-form-1440x1000.png');
        flags.doctorAccessFormCaptured = true;
        await scrollToText('Assign doctor to another workspace');
        await capture('doctor-cross-workspace-assignment-form-1440x1000.png');
        flags.crossWorkspaceFormCaptured = true;
        await scrollToText('Good day, Doctor');
      }

      await clickText('Patients');
      await waitFor(() => evaluate('document.body.innerText.includes("Patients")'));
      if (datasetMarker) {
        await waitFor(() => evaluate('document.body.innerText.includes(' + JSON.stringify(datasetMarker) + ')'), 20000);
        flags.populatedDatasetVerified = true;
        await capture('doctor-patient-list-populated-1440x1000.png');
        await clickText(datasetMarker);
        await waitFor(() => evaluate('document.body.innerText.includes("Dental chart")'), 20000);
        await scrollToText('Dental chart');
        await capture('doctor-patient-chart-odontogram-1440x1000.png');
        flags.patientChartCaptured = true;
        if (await evaluate('document.body.innerText.includes("Periodontogram")')) {
          await scrollToText('Periodontogram');
          await capture('doctor-patient-periodontogram-1440x1000.png');
          flags.periodontogramCaptured = true;
        }
      } else {
        await capture('doctor-patient-list-1440x1000.png');
        console.warn('DENTAL_STAGING_DOCTOR_TEST_DATASET is missing; patient chart selection was not verified.');
      }

      await clickText('Appointments');
      await waitFor(() => evaluate('document.body.innerText.includes("Appointment Queue") || document.body.innerText.includes("Appointment calendar")'));
      await capture('doctor-appointments-populated-1440x1000.png');

      await clickText('Clinical');
      await waitFor(() => evaluate('document.body.innerText.includes("AI DENTAL COMMAND CENTER")'));
      await capture('doctor-clinical-intelligence-1440x1000.png');
      flags.clinicalIntelligenceCaptured = true;

      flags.workspaceSelectionCaptured = (await reloadAndVerifySession()) || flags.workspaceSelectionCaptured;
      flags.sessionRestored = true;
      await capture('doctor-session-restored-1440x1000.png');
      await signOut();
    }

    if (emptyEmail && emptyPassword) {
      flags.workspaceSelectionCaptured = (await login(emptyEmail, emptyPassword)) || flags.workspaceSelectionCaptured;
      flags.emptyDashboardVerified = true;
      await capture('doctor-dashboard-empty-1440x1000.png');
      await clickText('Patients');
      await waitFor(() => evaluate('document.body.innerText.includes("No patients yet")'), 20000);
      if (emptyMarker && !await evaluate('document.body.innerText.includes(' + JSON.stringify(emptyMarker) + ')')) {
        throw new Error('Empty-account patient marker was not visible in the patient list');
      }
      flags.emptyPatientsVerified = true;
      await capture('doctor-patient-list-empty-1440x1000.png');

      await clickText('Appointments');
      await waitFor(() => evaluate('document.body.innerText.includes("No appointments yet")'), 20000);
      flags.emptyAppointmentsVerified = true;
      await capture('doctor-appointments-empty-1440x1000.png');

      flags.workspaceSelectionCaptured = (await reloadAndVerifySession()) || flags.workspaceSelectionCaptured;
      flags.emptySessionRestored = true;
      await capture('doctor-empty-session-restored-1440x1000.png');
    }

    const authenticated = flags.authenticatedDashboard && flags.populatedDatasetVerified &&
      flags.patientChartCaptured && flags.clinicalIntelligenceCaptured && flags.sessionRestored &&
      flags.emptyDashboardVerified && flags.emptyPatientsVerified && flags.emptyAppointmentsVerified &&
      flags.emptySessionRestored && flags.workspaceManagementVisible &&
      flags.organisationCreateFormCaptured && flags.doctorAccessFormCaptured &&
      flags.crossWorkspaceFormCaptured;
    const api = process.env.EXPO_PUBLIC_DENTAL_API_URL || 'https://oralyn-multitenant-staging.onrender.com';
    const info = [
      'commit=' + commit,
      'environment=staging',
      'api=' + api,
      'package=com.drpranali.dental.doctor',
      ...Object.entries(flags).map(([key, value]) => key + '=' + value),
      'fullAuthenticatedAcceptance=' + authenticated
    ].join('\\n') + '\\n';
    fs.writeFileSync(path.join(outDir, 'build-info.txt'), info);
    if (!flags.authenticatedDashboard) {
      console.warn('Authenticated Doctor screens skipped: DENTAL_STAGING_DOCTOR_EMAIL and DENTAL_STAGING_DOCTOR_PASSWORD are not configured.');
    }
    if (!flags.emptyDashboardVerified) {
      console.warn('Empty-account states skipped: DENTAL_STAGING_DOCTOR_EMPTY_EMAIL and DENTAL_STAGING_DOCTOR_EMPTY_PASSWORD are not configured.');
    }
    console.log(JSON.stringify({ commit, flags, fullAuthenticatedAcceptance: authenticated, screenshots: fs.readdirSync(outDir) }));
  } finally {
    if (ws) ws.close();
    if (process.platform === 'win32') {
      try {
        execFileSync('taskkill', ['/PID', String(chrome.pid), '/T', '/F'], { stdio: 'ignore' });
      } catch {
        chrome.kill();
      }
    } else {
      chrome.kill('SIGTERM');
    }
  }
})().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});
