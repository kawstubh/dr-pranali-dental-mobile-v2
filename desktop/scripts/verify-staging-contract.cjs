const fs = require("node:fs");

const apiOrigin = new URL(process.env.VITE_DENTAL_API_URL || "").origin;
const portalOrigin = new URL(process.env.ORALYN_PORTAL_ORIGIN || "").origin;
const report = [];
const flags = {};

async function request(url, options = {}, attempts = 2) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(url, {
        redirect: "follow",
        ...options,
        signal: controller.signal,
      });
      return { response, error: null };
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 1200 * attempt));
    } finally {
      clearTimeout(timer);
    }
  }
  return { response: null, error: lastError };
}

async function jsonBody(response) {
  if (!response) return null;
  try { return await response.json(); } catch { return null; }
}

async function textBody(response) {
  if (!response) return "";
  try { return await response.text(); } catch { return ""; }
}

function record(name, passed, detail) {
  flags[name] = Boolean(passed);
  report.push({ name, passed: Boolean(passed), detail: String(detail || "") });
}

function secureHeaders(headers, portal = false) {
  const value = (name) => String(headers?.get(name) || "").trim().toLowerCase();
  const checks = [
    ["strict-transport-security", value("strict-transport-security").includes("max-age=")],
    ["x-content-type-options", value("x-content-type-options") === "nosniff"],
    ["x-frame-options", ["deny", "sameorigin"].includes(value("x-frame-options"))],
    ["referrer-policy", value("referrer-policy") === "strict-origin-when-cross-origin"],
    ["permissions-policy", Boolean(value("permissions-policy"))],
  ];
  if (portal) checks.push(["content-security-policy", Boolean(value("content-security-policy"))]);
  else checks.push(["cache-control", value("cache-control").includes("no-store")]);
  return {
    passed: checks.every(([, ok]) => ok),
    checks,
  };
}

async function githubPullRequest(repo, number) {
  const result = await request(
    "https://api.github.com/repos/" + repo + "/pulls/" + number,
    { headers: { Accept: "application/vnd.github+json", "User-Agent": "Oralyn-Staging-Release-Check" } },
    2,
  );
  if (!result.response || result.response.status !== 200) return null;
  return jsonBody(result.response);
}

async function waitForResponse(url, predicate, options = {}, attempts = 12, delayMs = 4000) {
  let last = { response: null, body: null, error: null };
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const result = await request(url, options, 1);
    const body = await jsonBody(result.response);
    last = { ...result, body };
    if (predicate(result.response, body)) return last;
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return last;
}

async function main() {
  const originHeaders = { Origin: portalOrigin };
  const expectedPortalCommit = process.env.ORALYN_COMMIT_SHA || process.env.GITHUB_SHA || "";
  const backendPr = await githubPullRequest("kawstubh/universal-intelligence-engine", 60);
  const expectedApiCommit = backendPr?.head?.sha || "";

  const [dentalHealthWait, portalManifestWait] = await Promise.all([
    waitForResponse(
      apiOrigin + "/v1/dental/health",
      (response, body) => response?.status === 200 &&
        body?.deployment_commit === expectedApiCommit &&
        body?.database_identity_verified === true,
      { headers: originHeaders },
    ),
    waitForResponse(
      portalOrigin + "/oralyn-build-manifest.json?expected_commit=" + encodeURIComponent(expectedPortalCommit),
      (response, body) => response?.status === 200 &&
        body?.commit_sha === expectedPortalCommit,
      { headers: { "Cache-Control": "no-store, no-cache", Pragma: "no-cache" } },
      24,
      4000,
    ),
  ]);

  const dentalHealthResult = dentalHealthWait;
  const health = dentalHealthWait.body;
  const healthResult = await waitForResponse(
    apiOrigin + "/health",
    (response) => response?.status === 200,
    { headers: originHeaders },
    4,
    2500,
  );
  const readyResult = await waitForResponse(
    apiOrigin + "/ready",
    (response) => response?.status === 200,
    { headers: originHeaders },
    4,
    2500,
  );
  const apiStackOk = healthResult.response?.status === 200 &&
    readyResult.response?.status === 200 &&
    dentalHealthResult.response?.status === 200 &&
    health?.status === "ok" &&
    health?.database === "postgres" &&
    health?.database_ready === true &&
    health?.uie_configured === true;
  record("ORALYN_BACKEND_STACK_VERIFIED", apiStackOk, "health/ready/database/UIE checks");

  record(
    "ORALYN_DATABASE_IDENTITY_VERIFIED",
    health?.database_identity_verified === true,
    "API verified the live DATABASE_URL host and database name against the isolated Neon branch",
  );

  const preflight = await request(apiOrigin + "/v1/dental/public/appointments", {
    method: "OPTIONS",
    headers: {
      Origin: portalOrigin,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type",
    },
  });
  const allowOrigin = preflight.response?.headers.get("access-control-allow-origin") || "";
  const allowMethods = preflight.response?.headers.get("access-control-allow-methods") || "";
  const allowHeaders = preflight.response?.headers.get("access-control-allow-headers") || "";
  const corsOk = [200, 204].includes(preflight.response?.status) &&
    allowOrigin === portalOrigin &&
    /(^|,\s*)post(\s*,|$)/i.test(allowMethods) &&
    (allowHeaders === "*" || /(^|,\s*)content-type(\s*,|$)/i.test(allowHeaders));
  record("ORALYN_CORS_VERIFIED", corsOk, "exact portal origin and POST preflight");

  const apiSecurity = secureHeaders(dentalHealthResult.response?.headers, false);
  const portalHomeResult = await request(portalOrigin + "/patient/home/");
  const portalBookingResult = await request(portalOrigin + "/patient/booking/");
  const portalSecurity = secureHeaders(portalHomeResult.response?.headers, true);
  record(
    "ORALYN_SECURITY_HEADERS_VERIFIED",
    apiSecurity.passed && portalSecurity.passed,
    "API: " + apiSecurity.checks.map(([name, ok]) => name + "=" + ok).join(", ") +
      "; portal: " + portalSecurity.checks.map(([name, ok]) => name + "=" + ok).join(", "),
  );

  const openapiResult = await request(apiOrigin + "/openapi.json");
  const openapi = await jsonBody(openapiResult.response);
  const paths = Object.keys(openapi?.paths || {});
  const legacyPatientPaths = paths.filter((path) =>
    /^\/v1\/dental\/patient\//.test(path) ||
    /\/patient-ai|\/patient\/(?:link|linked-records|appointments|chart|clinical-notes|messages|treatment-plans|invoices|receipts|documents)/i.test(path)
  );
  const noLegacyPatientPaths = openapiResult.response?.status === 200 && legacyPatientPaths.length === 0;

  const protectedPaths = [
    "/v1/dental/patients",
    "/v1/dental/appointments",
    "/v1/dental/assistant/patients",
    "/v1/dental/assistant/appointments",
    "/v1/dental/assistant/billing/invoices",
    "/v1/dental/doctor/patients/synthetic-only/clinical-notes",
    "/v1/dental/doctor/patients/synthetic-only/treatment-plans",
    "/v1/dental/doctor/patients/synthetic-only/documents",
  ];
  const protectedResults = await Promise.all(protectedPaths.map((path) => request(apiOrigin + path, { headers: originHeaders })));
  const protected401 = protectedResults.every((item) => item.response?.status === 401);
  const legacyResult = await request(apiOrigin + "/v1/dental/patient/linked-records", { headers: originHeaders });
  const publicGetResult = await request(apiOrigin + "/v1/dental/public/appointments", { headers: originHeaders });
  const patientRoutesDisabled = noLegacyPatientPaths &&
    protected401 &&
    legacyResult.response?.status === 404 &&
    publicGetResult.response?.status === 405;
  const homeHtml = await textBody(portalHomeResult.response);
  const bookingHtml = await textBody(portalBookingResult.response);
  const hasPasswordInput = /<input\b[^>]*type=["']password/i.test(homeHtml + bookingHtml);
  const noPatientAuthUi = !hasPasswordInput &&
    !/href=["'][^"']*(patient\/login|patient\/signup|patient\/register)/i.test(homeHtml + bookingHtml);
  record(
    "ORALYN_PATIENT_ACCOUNT_FREE_VERIFIED",
    patientRoutesDisabled && noPatientAuthUi &&
      portalHomeResult.response?.status === 200 &&
      portalBookingResult.response?.status === 200,
    "no patient-auth OpenAPI routes; protected APIs deny unauthenticated reads; public pages are account-free",
  );

  const serviceSchema = openapi?.components?.schemas?.PublicAppointmentIn?.properties?.treatment_type?.enum || [];
  const serviceLabels = serviceSchema.filter((label) => label !== "Other dental concern");
  const catalogApiOk = serviceLabels.length === 20 && serviceSchema.includes("Other dental concern");
  const catalogUiOk = serviceLabels.every((label) => bookingHtml.includes(label));
  record("ORALYN_SERVICE_CATALOG_API_VERIFIED", catalogApiOk, "20 repository service labels plus Other in API schema");
  record("ORALYN_SERVICE_CATALOG_UI_VERIFIED", catalogUiOk, "all 20 repository service labels present in public booking HTML");

  // One synthetic request per backend commit per IST day. The idempotency key
  // is stable across hourly CI runs, so retries cannot create duplicate rows.
  if (health?.database_identity_verified === true && expectedApiCommit) {
    const istParts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(new Date());
    const istPart = (type) => istParts.find((item) => item.type === type)?.value || "";
    const istToday = istPart("year") + "-" + istPart("month") + "-" + istPart("day");
    const nextUtcMidnight = new Date(istToday + "T00:00:00Z");
    nextUtcMidnight.setUTCDate(nextUtcMidnight.getUTCDate() + 1);
    const nextIstDay = nextUtcMidnight.toISOString().slice(0, 10);
    const startsAt = new Date(nextIstDay + "T10:00:00+05:30").toISOString();
    const commitDigits = expectedApiCommit.slice(0, 8)
      .split("")
      .map((character) => String(parseInt(character, 16) % 10))
      .join("");
    const syntheticPhone = "+919" + commitDigits + "0";
    const idempotencyKey = "oralyn-staging-e2e-" + expectedApiCommit.slice(0, 12) + "-" + istToday.replaceAll("-", "");
    const syntheticPayload = {
      idempotency_key: idempotencyKey,
      name: "Oralyn Synthetic " + expectedApiCommit.slice(0, 8),
      phone: syntheticPhone,
      treatment_type: "Dental Check-up & Consultation",
      starts_at: startsAt,
      intelligence_request: false,
    };
    const bookingHeaders = { ...originHeaders, "Content-Type": "application/json" };
    const firstBooking = await request(apiOrigin + "/v1/dental/public/appointments", {
      method: "POST",
      headers: bookingHeaders,
      body: JSON.stringify(syntheticPayload),
    });
    const firstBookingBody = await jsonBody(firstBooking.response);
    const replayBooking = await request(apiOrigin + "/v1/dental/public/appointments", {
      method: "POST",
      headers: bookingHeaders,
      body: JSON.stringify(syntheticPayload),
    });
    const replayBookingBody = await jsonBody(replayBooking.response);
    const noPrivateIdentifiers = ["patient_id", "appointment_id", "patient", "appointment", "id"]
      .every((key) => !Object.prototype.hasOwnProperty.call(firstBookingBody || {}, key));
    const samePublicReference = typeof firstBookingBody?.reference === "string" &&
      firstBookingBody.reference.startsWith("ORL-") &&
      firstBookingBody.reference === replayBookingBody?.reference;
    const firstAccepted = firstBooking.response?.status === 200 &&
      ["requested", "already_received"].includes(firstBookingBody?.status);
    const replayAccepted = replayBooking.response?.status === 200 &&
      replayBookingBody?.status === "already_received";
    const bookingE2eOk = firstAccepted && replayAccepted && samePublicReference && noPrivateIdentifiers;
    record(
      "ORALYN_GUEST_BOOKING_E2E_VERIFIED",
      bookingE2eOk,
      bookingE2eOk
        ? "synthetic-only staging POST accepted and returned a public reference without patient or appointment identifiers"
        : "synthetic-only staging POST contract failed; no production or real booking data was used",
    );
    record(
      "ORALYN_GUEST_BOOKING_IDEMPOTENCY_VERIFIED",
      bookingE2eOk && replayAccepted,
      bookingE2eOk
        ? "same key replay returned the same public reference with already_received status"
        : "staging idempotency replay was not verified",
    );
  } else {
    record("ORALYN_GUEST_BOOKING_E2E_VERIFIED", false, "not attempted because isolated synthetic database identity was not verified");
    record("ORALYN_GUEST_BOOKING_IDEMPOTENCY_VERIFIED", false, "not attempted because isolated synthetic database identity was not verified");
  }

  const livePortalManifestResult = portalManifestWait;
  const livePortalManifest = portalManifestWait.body;
  const portalCommitOk = Boolean(expectedPortalCommit &&
    livePortalManifestResult.response?.status === 200 &&
    livePortalManifest?.commit_sha === expectedPortalCommit);
  const apiCommitOk = Boolean(expectedApiCommit &&
    health?.deployment_commit &&
    health.deployment_commit === expectedApiCommit);
  record(
    "ORALYN_STAGING_PORTAL_COMMIT_VERIFIED",
    portalCommitOk,
    "live portal manifest commit " + (livePortalManifest?.commit_sha || "unavailable") +
      " compared with expected Draft PR #18 head " + (expectedPortalCommit || "unavailable"),
  );
  record("ORALYN_STAGING_API_COMMIT_VERIFIED", apiCommitOk, "live API deployment commit matches Draft PR #60 head");

  const envFile = process.env.GITHUB_ENV;
  if (envFile) {
    for (const [name, value] of Object.entries(flags)) {
      fs.appendFileSync(envFile, name + "=" + (value ? "true" : "false") + "\n");
    }
  }
  for (const item of report) {
    process.stdout.write((item.passed ? "PASS " : "BLOCK ") + item.name + ": " + item.detail + "\n");
  }
  process.stdout.write("Staging contract flags written: " + Object.keys(flags).length + "\n");
}

main().catch((error) => {
  process.stderr.write("Staging verification did not complete: " + (error?.stack || error) + "\n");
  const defaults = [
    "ORALYN_BACKEND_STACK_VERIFIED",
    "ORALYN_DATABASE_IDENTITY_VERIFIED",
    "ORALYN_CORS_VERIFIED",
    "ORALYN_SECURITY_HEADERS_VERIFIED",
    "ORALYN_PATIENT_ACCOUNT_FREE_VERIFIED",
    "ORALYN_SERVICE_CATALOG_API_VERIFIED",
    "ORALYN_SERVICE_CATALOG_UI_VERIFIED",
    "ORALYN_GUEST_BOOKING_E2E_VERIFIED",
    "ORALYN_GUEST_BOOKING_IDEMPOTENCY_VERIFIED",
    "ORALYN_STAGING_PORTAL_COMMIT_VERIFIED",
    "ORALYN_STAGING_API_COMMIT_VERIFIED",
  ];
  if (process.env.GITHUB_ENV) {
    for (const name of defaults) fs.appendFileSync(process.env.GITHUB_ENV, name + "=false\n");
  }
  for (const name of defaults) process.stdout.write("BLOCK " + name + ": verification script error\n");
});
