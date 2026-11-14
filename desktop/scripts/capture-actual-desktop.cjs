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
const commit = process.env.ORALYN_COMMIT_SHA || process.env.GITHUB_SHA || execFileSync("git", ["rev-parse", "HEAD"], { cwd: root }).toString().trim();
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
  const result = await evaluate(`(async () => {
    const probe = document.createElement("span");
    probe.textContent = "Oralyn Display Font Probe";
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = "position:fixed;left:-10000px;top:0;font-family:'Playfair Display',serif;font-size:32px;font-weight:600;white-space:nowrap;";
    document.body.appendChild(probe);
    const [bodyResponse, displayResponse] = await Promise.all([
      fetch("/fonts/PlusJakartaSans-Variable.ttf", { cache: "no-store" }),
      fetch("/fonts/PlayfairDisplay-Variable.ttf", { cache: "no-store" }),
    ]);
    const [bodyBytes, displayBytes] = await Promise.all([
      bodyResponse.arrayBuffer(),
      displayResponse.arrayBuffer(),
    ]);
    const [bodyFaces, displayFaces] = await Promise.all([
      document.fonts.load('400 16px "Plus Jakarta Sans"', probe.textContent),
      document.fonts.load('600 32px "Playfair Display"', probe.textContent),
    ]);
    await document.fonts.ready;
    const fontFaceRules = [...document.styleSheets].flatMap((sheet) => {
      try { return [...sheet.cssRules]; } catch { return []; }
    }).filter((rule) => rule.type === 5).map((rule) => ({
      family: String(rule.style.fontFamily || "").replaceAll('"', ""),
      weight: rule.style.fontWeight,
      src: rule.style.src,
    }));
    const faceRows = [...document.fonts].map((face) => ({
      family: face.family.replaceAll('"', ""),
      weight: face.weight,
      status: face.status,
    }));
    const result = {
      plusJakartaSans: bodyResponse.ok && bodyBytes.byteLength > 1000 && bodyFaces.length > 0,
      playfairDisplay: displayResponse.ok && displayBytes.byteLength > 1000 && displayFaces.length > 0,
      resources: {
        plusJakartaSans: { status: bodyResponse.status, contentType: bodyResponse.headers.get("content-type"), bytes: bodyBytes.byteLength },
        playfairDisplay: { status: displayResponse.status, contentType: displayResponse.headers.get("content-type"), bytes: displayBytes.byteLength },
      },
      matchingFaces: faceRows.filter((face) => face.family === "Playfair Display" || face.family === "Plus Jakarta Sans"),
      fontFaceRules: fontFaceRules.filter((face) => face.family === "Playfair Display" || face.family === "Plus Jakarta Sans"),
      probeFontFamily: getComputedStyle(probe).fontFamily,
    };
    probe.remove();
    return result;
  })()`);
  if (!result.plusJakartaSans || !result.playfairDisplay) {
    throw new Error("Bundled Oralyn fonts did not both load: " + JSON.stringify(result));
  }
  return { plusJakartaSans: true, playfairDisplay: true };
}

async function verifyPwa() {
  // A newly installed service worker may activate after the first document
  // load. Wait for activation, then reload once so the page is controlled.
  const active = await waitFor(() => evaluate(
    "(async () => { const registration = await navigator.serviceWorker?.getRegistration('/'); return Boolean(registration?.active && registration.active.state === 'activated'); })()"
  ), 30000).catch(() => false);
  if (!active) {
    throw new Error("Oralyn service worker did not reach the activated state.");
  }

  let controlled = await evaluate("Boolean(navigator.serviceWorker && navigator.serviceWorker.controller)");
  if (!controlled) {
    const currentUrl = await evaluate("location.href");
    // Page.reload can acknowledge before the new document has committed.
    // An explicit same-origin navigation gives CDP a fresh document/client.
    await send("Page.navigate", { url: currentUrl });
    controlled = await waitFor(() => evaluate(
      'document.readyState === "complete" && Boolean(navigator.serviceWorker && navigator.serviceWorker.controller)'
    ), 20000).catch(() => false);
  }
  if (!controlled) {
    throw new Error("Oralyn service worker activated but did not take control after a clean reload.");
  }

  const status = await evaluate("(async () => { const registration = await navigator.serviceWorker.getRegistration('/'); const names = await caches.keys(); const cacheNames = names.filter((name) => name.startsWith('oralyn-portal-shell-')); const cacheName = cacheNames[0]; const cache = cacheName ? await caches.open(cacheName) : null; const requests = cache ? await cache.keys() : []; const paths = requests.map((request) => new URL(request.url).pathname); const prefixes = ['/v1', '/auth/v1', '/rest/v1', '/storage/v1', '/functions/v1']; const forbidden = paths.filter((pathname) => prefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'))); return { supported: 'serviceWorker' in navigator, registered: Boolean(registration), active: registration?.active?.state === 'activated', controlled: Boolean(navigator.serviceWorker.controller), cachePresent: cacheNames.length === 1, cacheCount: cacheNames.length, cacheName, paths, forbidden }; })()");
  if (!status.supported || !status.registered || !status.active || !status.controlled || !status.cachePresent || status.cacheCount !== 1 || status.forbidden.length) {
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

async function verifyKeyboardFocus() {
  await evaluate("document.activeElement?.blur?.()");
  await send("Input.dispatchKeyEvent", {
    type: "keyDown", key: "Tab", code: "Tab",
    windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9,
  });
  await send("Input.dispatchKeyEvent", {
    type: "keyUp", key: "Tab", code: "Tab",
    windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9,
  });
  const state = await evaluate(`(() => {
    const active = document.activeElement;
    if (!active) return { focused: false };
    const style = getComputedStyle(active);
    const visibleIndicator =
      (style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0 &&
        style.outlineColor !== "transparent") ||
      style.boxShadow !== "none";
    return {
      focused: active !== document.body && active !== document.documentElement,
      interactive: active.matches('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'),
      focusVisible: active.matches(":focus-visible"),
      visibleIndicator,
      tag: active.tagName.toLowerCase(),
      accessibleName: active.getAttribute("aria-label") ||
        (active.getAttribute("aria-labelledby") || "").split(/\\s+/).map((id) =>
          document.getElementById(id)?.innerText || ""
        ).join(" ").trim() ||
        (active.labels ? [...active.labels].map((item) => item.innerText || item.textContent || "").join(" ").trim() : "") ||
        active.closest("label")?.innerText?.trim() ||
        (active.matches("a,button") ? (active.innerText || "").trim() : ""),
    };
  })()`);
  if (!state.focused || !state.interactive || !state.focusVisible || !state.visibleIndicator || !state.accessibleName) {
    throw new Error("Keyboard Tab did not reach an accessible interactive control with a visible focus indicator: " + JSON.stringify(state));
  }
  await evaluate("document.activeElement?.blur?.()");
  return state;
}

async function verifyReducedMotion() {
  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  try {
    const state = await evaluate(`(() => {
      const card = document.querySelector(".oralyn-auth-card,.oralyn-reference-card");
      const signIn = document.querySelector(".oralyn-signin");
      const cardStyle = card ? getComputedStyle(card) : null;
      const signInStyle = signIn ? getComputedStyle(signIn) : null;
      return {
        preferenceHonored: matchMedia("(prefers-reduced-motion: reduce)").matches,
        cardFound: Boolean(card),
        signInFound: Boolean(signIn),
        cardAnimation: cardStyle?.animationName || null,
        signInTransition: signInStyle?.transitionProperty || null,
      };
    })()`);
    if (!state.preferenceHonored || !state.cardFound || !state.signInFound ||
        state.cardAnimation !== "none" || state.signInTransition !== "none") {
      throw new Error("Reduced-motion preference was not honored by the Doctor sign-in UI: " + JSON.stringify(state));
    }
    return state;
  } finally {
    await send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
    });
  }
}

async function verifyPublicBookingForm() {
  const state = await evaluate(`(() => {
    const form = document.querySelector("#booking");
    const service = document.querySelector("#treatment-type");
    const date = document.querySelector("#date");
    const time = document.querySelector("#time");
    const todayParts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(new Date());
    const part = (type) => todayParts.find((item) => item.type === type)?.value || "";
    const today = part("year") + "-" + part("month") + "-" + part("day");
    return {
      requiredFields: ["name", "phone", "treatment_type", "date", "time"]
        .filter((name) => Boolean(form.elements.namedItem(name)?.required)),
      requiredLabelFields: ["name", "phone", "treatment_type", "date", "time"].map((name) => {
        const control = form.elements.namedItem(name);
        const labelText = control?.getAttribute("aria-label") ||
          (control?.labels ? [...control.labels].map((item) => item.innerText || item.textContent || "").join(" ").trim() : "") ||
          control?.closest("label")?.innerText?.trim() || "";
        return { name, hasAccessibleName: Boolean(labelText), labelText };
      }),
      catalogueCount: [...service.options].filter((option) =>
        option.value && option.value !== "Other dental concern"
      ).length,
      otherCount: [...service.options].filter((option) =>
        option.value === "Other dental concern"
      ).length,
      minDate: date.min,
      expectedMinDate: today,
      timezoneNotice: document.body.innerText.includes("Asia/Kolkata"),
      accountFree: document.body.innerText.includes("No account or OTP is required."),
      apiOrigin: document.querySelector('meta[name="oralyn-api-origin"]')?.content?.trim() || "",
    };
  })()`);
  const expectedApiOrigin = new URL(apiBase).origin;
  if (state.apiOrigin !== expectedApiOrigin) {
    throw new Error("Public booking API origin does not match the configured portal API: " + JSON.stringify({
      expectedApiOrigin,
      actualApiOrigin: state.apiOrigin,
    }));
  }
  if (state.requiredFields.length !== 5 || state.requiredLabelFields.length !== 5 ||
      state.requiredLabelFields.some((item) => !item.hasAccessibleName) ||
      state.catalogueCount !== 20 || state.otherCount !== 1 ||
      state.minDate !== state.expectedMinDate || !state.timezoneNotice || !state.accountFree) {
    throw new Error("Public booking contract verification failed: " + JSON.stringify(state));
  }

  const empty = await evaluate(`(() => {
    let fetchCalls = 0;
    const originalFetch = window.fetch;
    window.fetch = (...args) => { fetchCalls += 1; return originalFetch(...args); };
    document.querySelector("#submit").click();
    window.fetch = originalFetch;
    const message = document.querySelector("#message");
    return { fetchCalls, visibleError: message.classList.contains("error"), text: message.textContent };
  })()`);
  if (empty.fetchCalls !== 0 || !empty.visibleError || !empty.text.includes("required fields")) {
    throw new Error("Empty guest booking did not show a safe validation message: " + JSON.stringify(empty));
  }

  const past = await evaluate(`(() => {
    const form = document.querySelector("#booking");
    const date = document.querySelector("#date");
    const time = document.querySelector("#time");
    form.elements.name.value = "Synthetic Browser Validation";
    form.elements.phone.value = "9876543210";
    form.elements.treatment_type.value = "Dental Check-up & Consultation";
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(new Date(Date.now() - 86400000));
    const part = (type) => parts.find((item) => item.type === type)?.value || "";
    date.removeAttribute("min");
    date.value = part("year") + "-" + part("month") + "-" + part("day");
    date.setCustomValidity("");
    time.value = "10:00";
    let fetchCalls = 0;
    const originalFetch = window.fetch;
    window.fetch = (...args) => { fetchCalls += 1; return originalFetch(...args); };
    form.requestSubmit();
    window.fetch = originalFetch;
    const message = document.querySelector("#message");
    return { fetchCalls, visibleError: message.classList.contains("error"), text: message.textContent };
  })()`);
  if (past.fetchCalls !== 0 || !past.visibleError || !past.text.includes("future date and time")) {
    throw new Error("Past IST appointment was not blocked before network submission: " + JSON.stringify(past));
  }
  return { ...state, emptySubmit: empty, pastTimeSubmit: past };
}

async function captureAssistantAdminGate() {
  await send("Page.navigate", { url: baseUrl + "/assistant-admin/" });
  await waitFor(() => evaluate(
    'location.pathname === "/doctor/settings" && document.body.innerText.includes("Sign in with your clinic-issued email and password")'
  ));
  const state = await evaluate('(() => ({ redirectedToDoctorSettings: location.pathname === "/doctor/settings", doctorSignInVisible: document.body.innerText.includes("Sign in with your clinic-issued email and password"), assistantManagementFormVisible: Boolean(document.querySelector(".assistant-management-form")) }))()');
  if (!state.redirectedToDoctorSettings || !state.doctorSignInVisible || state.assistantManagementFormVisible) {
    throw new Error("Legacy Assistant admin route did not fail closed to Doctor authentication: " + JSON.stringify(state));
  }
  const plusJakartaSans = await evaluate('document.fonts.load("400 16px \\"Plus Jakarta Sans\\"").then((faces) => faces.length > 0)');
  if (!plusJakartaSans) throw new Error("Doctor settings gate did not load the bundled Plus Jakarta Sans font.");
  await capture("assistant-admin-redirect-gate-1440x1000.png", 1440, 1000);
  await capture("assistant-admin-redirect-gate-768x1024.png", 768, 1024);
  await capture("assistant-admin-redirect-gate-390x844.png", 390, 844, true);
  return { ...state, plusJakartaSans };
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
      if (message.method === "Network.responseReceived") {
        const response = message.params.response;
        if (response && response.status >= 400 && response.url?.startsWith(baseUrl)) {
          runtimeErrors.push("HTTP " + response.status + " " + response.url);
        }
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
    await send("Network.enable");

    const fontResults = {};
    fontResults.doctorLogin = await captureCurrent(
      "Sign in with your clinic-issued email and password",
      "doctor-login"
    );
    const accessibilityResults = {};
    accessibilityResults.doctorKeyboardFocus = await verifyKeyboardFocus();
    accessibilityResults.reducedMotion = await verifyReducedMotion();
    const approvedLogoAssets = await evaluate(`(() => {
      const wordmark = document.querySelector(".oralyn-vector-brand img");
      const appIcon = document.querySelector(".oralyn-app-squircle img");
      return {
        wordmark: Boolean(wordmark && wordmark.complete && wordmark.naturalWidth > 0 && wordmark.getAttribute("src") === "/oralyn-logo-approved.webp"),
        appIcon: Boolean(appIcon && appIcon.complete && appIcon.naturalWidth > 0 && appIcon.getAttribute("src") === "/oralyn-app-icon-approved.webp")
      };
    })()`);
    if (!approvedLogoAssets.wordmark || !approvedLogoAssets.appIcon) {
      throw new Error("Approved Oralyn logo assets did not load on the Doctor sign-in screen.");
    }
    fontResults.assistantLogin = await navigate(
      "/assistant/",
      "Clinic Assistant",
      "assistant-login"
    );
    accessibilityResults.assistantKeyboardFocus = await verifyKeyboardFocus();
    await send("Page.navigate", { url: baseUrl + "/doctor/dashboard" });
    await waitFor(() => evaluate(
      'location.pathname === "/doctor/dashboard" && document.body.innerText.includes("Sign in with your clinic-issued email and password")'
    ));
    const switchedToPatient = await evaluate(
      "(() => { const button = [...document.querySelectorAll('button')].find((item) => (item.innerText || '').trim().includes('Patient services & appointment requests')); if (!button) return false; button.click(); return true; })()"
    );
    if (!switchedToPatient) throw new Error("Doctor-to-public-patient portal link was not found.");
    await waitFor(() => evaluate(
      'location.pathname === "/patient/home/" && document.body.innerText.includes("Your smile, your care.")'
    ));

    // The public patient route must survive a hard reload without patient login.
    await send("Page.reload", { ignoreCache: true });
    await waitFor(() => evaluate(
      'location.pathname === "/patient/home/" && document.body.innerText.includes("Your smile, your care.")'
    ));
    await evaluate("history.back()");
    await waitFor(() => evaluate(
      'location.pathname === "/doctor/dashboard" && document.body.innerText.includes("Sign in with your clinic-issued email and password")'
    ));
    await evaluate("history.forward()");
    await waitFor(() => evaluate(
      'location.pathname === "/patient/home/" && document.body.innerText.includes("Your smile, your care.")'
    ));
    fontResults.patientHome = await captureCurrent("Your smile, your care.", "patient-home");

    await send("Page.navigate", { url: baseUrl + "/patient/login" });
    await waitFor(() => evaluate(
      'location.pathname === "/patient/home/" && document.body.innerText.includes("Your smile, your care.")'
    ));
    fontResults.patientLegacyLoginRedirect = true;

    fontResults.patientBooking = await navigate(
      "/patient/booking/",
      "Request an appointment",
      "patient-booking"
    );
    accessibilityResults.guestBookingKeyboardFocus = await verifyKeyboardFocus();
    fontResults.patientBookingValidation = await verifyPublicBookingForm();
    accessibilityResults.guestBookingRequiredLabels = fontResults.patientBookingValidation.requiredLabelFields;
    fontResults.assistantAdmin = await captureAssistantAdminGate();

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
      "approved_logo_wordmark_loaded=" + approvedLogoAssets.wordmark,
      "approved_app_icon_loaded=" + approvedLogoAssets.appIcon,
      "pwa_service_worker_controlled=" + fontResults.doctorLogin.pwa.controlled,
      "pwa_cache_name_present=" + fontResults.doctorLogin.pwa.cachePresent,
      "pwa_api_cache_entries=" + fontResults.doctorLogin.pwa.forbidden.length,
      "synthetic_patient_data=none",
      "assistant_login_screen_captured=" + Boolean(fontResults.assistantLogin),
      "patient_login_redirect=" + Boolean(fontResults.patientLegacyLoginRedirect),
      "authenticated_screens=false",
      "mobile_viewport=390x844",
      "assistant_admin_redirect_gate=passed",
      "guest_booking_validation=passed",
      "public_booking_api_origin=" + fontResults.patientBookingValidation.apiOrigin,
      "guest_booking_service_count=" + fontResults.patientBookingValidation.catalogueCount,
      "assistant_admin_management_form_visible=" + fontResults.assistantAdmin.assistantManagementFormVisible,
      "assistant_admin_plus_jakarta_sans_loaded=" + fontResults.assistantAdmin.plusJakartaSans,
      "role_route_refresh_back_forward=passed",
      "keyboard_focus_doctor_login=passed",
      "keyboard_focus_assistant_login=passed",
      "keyboard_focus_guest_booking=passed",
      "guest_booking_required_field_labels=passed",
      "reduced_motion_preference=passed",
      "runtime_errors=none",
    ].join("\n") + "\n";
    fs.writeFileSync(path.join(output, "build-info.txt"), metadata);
    fs.writeFileSync(path.join(output, "runtime-errors.txt"), "none observed during signed-out public-route capture\n");
    console.log(JSON.stringify({
      commit, environment, baseUrl, apiBase, bundle: jsFile, bundleHash,
      fontResults, accessibilityResults, approvedLogoAssets, pwa: fontResults.doctorLogin.pwa, runtimeErrors,
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
