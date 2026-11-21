const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { isRuntimeEquivalentCompare } = require("./staging-commit-equivalence.cjs");

const apiOrigin = new URL(process.env.VITE_DENTAL_API_URL || "").origin;
const portalOrigin = new URL(process.env.ORALYN_PORTAL_ORIGIN || "").origin;
const report = [];
const flags = {};

async function request(url, options = {}, attempts = 2, timeoutMs = 15000) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
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

function inlineHashes(html, tag) {
  const expression = tag === "style"
    ? /<style\b[^>]*>([\s\S]*?)<\/style>/gi
    : /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  const hashes = [];
  for (const match of html.matchAll(expression)) {
    if (tag === "script" && /\bsrc\s*=/.test(match[1])) continue;
    const value = (tag === "style" ? match[1] : match[2]).replace(/\r\n?/g, "\n");
    hashes.push("sha256-" + crypto.createHash("sha256").update(value, "utf8").digest("base64"));
  }
  return hashes;
}

function strictPortalCsp(headers, html, apiOrigin) {
  const csp = String(headers?.get("content-security-policy") || "").trim();
  if (!csp || /'unsafe-inline'|'unsafe-eval'/i.test(csp)) {
    return { passed: false, detail: "missing CSP or unsafe inline/eval allowance" };
  }
  const directives = new Map(csp.split(";").map((part) => {
    const [name, ...values] = part.trim().split(/\s+/);
    return [String(name || "").toLowerCase(), values];
  }));
  const tokens = (name) => directives.get(name) || [];
  const has = (name, value) => tokens(name).includes(value);
  const scriptHashes = inlineHashes(html, "script");
  const styleHashes = inlineHashes(html, "style");
  const checks = [
    ["default-src self", has("default-src", "'self'")],
    ["base-uri self", has("base-uri", "'self'")],
    ["form-action self", has("form-action", "'self'")],
    ["frame-ancestors none", has("frame-ancestors", "'none'")],
    ["object-src none", has("object-src", "'none'")],
    ["script-src self", has("script-src", "'self'")],
    ["style-src self", has("style-src", "'self'")],
    ["font-src self", has("font-src", "'self'")],
    ["connect-src portal and API", has("connect-src", "'self'") && tokens("connect-src").includes(apiOrigin)],
    ["approved image sources", ["'self'", "data:", "blob:", "https://static.wixstatic.com"].every((value) => has("img-src", value))],
    ["all inline scripts hash-allowlisted", scriptHashes.every((hash) => has("script-src", "'" + hash + "'"))],
    ["all inline styles hash-allowlisted", styleHashes.every((hash) => has("style-src", "'" + hash + "'"))],
  ];
  return {
    passed: checks.every(([, passed]) => passed),
    detail: checks.map(([name, passed]) => name + "=" + passed).join(", "),
  };
}

function githubApiHeaders() {
  const token = String(process.env.GITHUB_TOKEN || "").trim();
  if (!token) throw new Error("Staging release contract requires a read-only GitHub Actions token.");
  return {
    Accept: "application/vnd.github+json",
    "User-Agent": "Oralyn-Staging-Release-Check",
    Authorization: "Bearer " + token,
  };
}

async function githubPullRequest(repo, number) {
  const result = await request(
    "https://api.github.com/repos/" + repo + "/pulls/" + number,
    { headers: githubApiHeaders() },
    2,
  );
  if (!result.response || result.response.status !== 200) return null;
  return jsonBody(result.response);
}

async function backendCommitMatchesPr(repo, deployedCommit, prHeadCommit) {
  if (!deployedCommit || !prHeadCommit) {
    return { ok: false, detail: "deployed API commit or PR #63 head is unavailable" };
  }
  if (deployedCommit === prHeadCommit) {
    return { ok: true, detail: "live API deployment commit exactly matches Draft PR #63 head " + prHeadCommit };
  }

  const comparison = await request(
    "https://api.github.com/repos/" + repo + "/compare/" + deployedCommit + "..." + prHeadCommit,
    { headers: githubApiHeaders() },
    2,
  );
  if (!comparison.response || comparison.response.status !== 200) {
    return { ok: false, detail: "GitHub could not verify the deployed-to-PR commit range; exact commit match is required" };
  }

  const compareBody = await jsonBody(comparison.response);
  if (isRuntimeEquivalentCompare(compareBody)) {
    return {
      ok: true,
      detail: "live API runtime commit " + deployedCommit + " is an ancestor of PR #63 head " +
        prHeadCommit + "; GitHub confirms every intervening change is a Markdown file under docs/ or a Python test under tests/, with no runtime or configuration changes",
    };
  }
  return {
    ok: false,
    detail: "live API runtime commit " + deployedCommit + " differs from PR #63 head " + prHeadCommit +
      " and the intervening commit range is not exclusively docs/*.md",
  };
}

async function waitForResponse(url, predicate, options = {}, attempts = 12, delayMs = 4000, timeoutMs = 15000) {
  let last = { response: null, body: null, error: null };
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const result = await request(url, options, 1, timeoutMs);
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
  const backendPr = await githubPullRequest("kawstubh/universal-intelligence-engine", 63);
  const expectedApiCommit = backendPr?.head?.sha || "";

  const [dentalHealthWait, portalManifestWait] = await Promise.all([
    waitForResponse(
      apiOrigin + "/v1/dental/health",
      (response, body) => response?.status === 200 &&
        body?.database_identity_verified === true &&
        body?.database_branch_identity_verified === true,
      { headers: originHeaders },
    ),
    waitForResponse(
      portalOrigin + "/oralyn-build-manifest.json?expected_commit=" + encodeURIComponent(expectedPortalCommit),
      (response, body) => response?.status === 200 &&
        body?.commit_sha === expectedPortalCommit,
      { headers: { "Cache-Control": "no-store, no-cache", Pragma: "no-cache" } },
      3,
      1000,
      5000,
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
    "API verified the live DATABASE_URL host and database name",
  );
  const branchIdentityOk = health?.database_branch_identity_verified === true;
  record(
    "ORALYN_STAGING_DATABASE_BRANCH_VERIFIED",
    branchIdentityOk,
    "API verified current_setting('neon.branch_id') against the expected isolated staging branch",
  );

  const apiRuntimeCommit = String(health?.deployment_commit || "");
  const apiCommitCheck = await backendCommitMatchesPr(
    "kawstubh/universal-intelligence-engine",
    apiRuntimeCommit,
    expectedApiCommit,
  );
  const apiCommitOk = apiCommitCheck.ok;

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
  const portalHomeSecurity = secureHeaders(portalHomeResult.response?.headers, true);
  const portalBookingSecurity = secureHeaders(portalBookingResult.response?.headers, true);
  record(
    "ORALYN_SECURITY_HEADERS_VERIFIED",
    apiSecurity.passed && portalHomeSecurity.passed && portalBookingSecurity.passed,
    "API: " + apiSecurity.checks.map(([name, ok]) => name + "=" + ok).join(", ") +
      "; patient home: " + portalHomeSecurity.checks.map(([name, ok]) => name + "=" + ok).join(", ") +
      "; booking: " + portalBookingSecurity.checks.map(([name, ok]) => name + "=" + ok).join(", "),
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
  const strictHomeCsp = strictPortalCsp(portalHomeResult.response?.headers, homeHtml, apiOrigin);
  const strictBookingCsp = strictPortalCsp(portalBookingResult.response?.headers, bookingHtml, apiOrigin);
  const strictCspOk = strictHomeCsp.passed && strictBookingCsp.passed;
  record(
    "ORALYN_STRICT_CSP_VERIFIED",
    strictCspOk,
    "patient home: " + strictHomeCsp.detail + "; booking: " + strictBookingCsp.detail,
  );
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

  const otherServiceLabel = "Other dental concern";
  const catalogueSourcePath = path.resolve(process.cwd(), "../shared/dentalServices.ts");
  const candidateBookingPath = path.resolve(process.cwd(), "public/patient/booking/index.html");
  const catalogueSource = fs.readFileSync(catalogueSourcePath, "utf8");
  const candidateBookingHtml = fs.readFileSync(candidateBookingPath, "utf8");
  const candidateServiceLabels = [...catalogueSource.matchAll(
    /\{\s*id:\s*'[^']+'\s*,\s*name:\s*'([^']+)'/g,
  )].map((match) => match[1]);
  const approvedServiceNames = [
    "Dental Check-up & Consultation",
    "Gum Treatment (Periodontal Care)",
    "Tooth Sensitivity Treatment",
    "TMJ & Jaw Pain Treatment",
    "Scaling & Cleaning",
    "Dental Sealants",
    "Oral Hygiene Education",
    "Teeth Whitening",
    "Veneers",
    "Smile Makeover",
    "Tooth Filling",
    "Root Canal Treatment",
    "Dental Crowns & Caps",
    "Dentures",
    "Dental Implants",
    "Tooth Extraction",
    "Braces Treatment",
    "Clear Aligners",
    "Kids Dentistry",
    "Emergency Dental Care",
  ];
  const sortLabels = (labels) => [...labels].sort((left, right) => left.localeCompare(right));
  const sourceCatalogueOk = candidateServiceLabels.length === 20 &&
    new Set(candidateServiceLabels).size === 20 &&
    JSON.stringify(sortLabels(candidateServiceLabels)) === JSON.stringify(sortLabels(approvedServiceNames));
  const serviceSchema = openapi?.components?.schemas?.PublicAppointmentIn?.properties?.treatment_type?.enum || [];
  const apiServiceLabels = serviceSchema.filter((label) => label !== otherServiceLabel);
  const catalogApiOk = sourceCatalogueOk &&
    serviceSchema.length === 21 &&
    serviceSchema.filter((label) => label === otherServiceLabel).length === 1 &&
    JSON.stringify(sortLabels(apiServiceLabels)) === JSON.stringify(sortLabels(approvedServiceNames));
  const escapeHtml = (value) => value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
  const catalogUiOk = sourceCatalogueOk &&
    candidateServiceLabels.every((label) =>
      candidateBookingHtml.includes('<option value="' + escapeHtml(label) + '">')
    ) &&
    candidateBookingHtml.includes('<option value="' + otherServiceLabel + '">');
  const apiMissingLabels = approvedServiceNames.filter((label) => !apiServiceLabels.includes(label));
  const apiUnexpectedLabels = apiServiceLabels.filter((label) => !approvedServiceNames.includes(label));
  record(
    "ORALYN_SERVICE_CATALOG_API_VERIFIED",
    catalogApiOk,
    catalogApiOk
      ? "live API OpenAPI enum exactly matches the twenty clinic-approved names plus Other"
      : "candidate source labels=" + candidateServiceLabels.length +
        "; live API labels=" + apiServiceLabels.length +
        "; missing from live API=[" + apiMissingLabels.join("; ") +
        "]; unexpected live API labels=[" + apiUnexpectedLabels.join("; ") + "]",
  );
  record(
    "ORALYN_SERVICE_CATALOG_UI_VERIFIED",
    catalogUiOk,
    catalogUiOk
      ? "candidate booking HTML contains all twenty clinic-approved option values plus Other"
      : "candidate shared catalogue or booking HTML does not exactly match the approved twenty names plus Other",
  );

  // One synthetic request per backend commit per IST day. The idempotency key
  // is stable across hourly CI runs, so retries cannot create duplicate rows.
  if (health?.database_identity_verified === true && branchIdentityOk && apiCommitOk && apiRuntimeCommit) {
    const istParts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(new Date());
    const istPart = (type) => istParts.find((item) => item.type === type)?.value || "";
    const istToday = istPart("year") + "-" + istPart("month") + "-" + istPart("day");
    const nextUtcMidnight = new Date(istToday + "T00:00:00Z");
    nextUtcMidnight.setUTCDate(nextUtcMidnight.getUTCDate() + 1);
    const nextIstDay = nextUtcMidnight.toISOString().slice(0, 10);
    const startsAt = new Date(nextIstDay + "T10:00:00+05:30").toISOString();
    const commitDigits = apiRuntimeCommit.slice(0, 8)
      .split("")
      .map((character) => String(parseInt(character, 16) % 10))
      .join("");
    const syntheticPhone = "+919" + commitDigits + "0";
    const idempotencyKey = "oralyn-staging-e2e-" + apiRuntimeCommit.slice(0, 12) + "-" + istToday.replaceAll("-", "");
    const syntheticPayload = {
      idempotency_key: idempotencyKey,
      name: "Oralyn Synthetic " + apiRuntimeCommit.slice(0, 8),
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
    const bookingBlockReason = health?.database_identity_verified !== true || !branchIdentityOk
      ? "not attempted because the isolated synthetic database identity is not verified"
      : !apiCommitOk
        ? "not attempted because the deployed API code does not match PR #63 or a verified docs-only descendant"
        : "not attempted because the deployed API runtime commit is unavailable";
    record("ORALYN_GUEST_BOOKING_E2E_VERIFIED", false, bookingBlockReason);
    record("ORALYN_GUEST_BOOKING_IDEMPOTENCY_VERIFIED", false, bookingBlockReason);
  }

  const livePortalManifestResult = portalManifestWait;
  const livePortalManifest = portalManifestWait.body;
  const portalCommitOk = Boolean(expectedPortalCommit &&
    livePortalManifestResult.response?.status === 200 &&
    livePortalManifest?.commit_sha === expectedPortalCommit);
  record(
    "ORALYN_STAGING_PORTAL_COMMIT_VERIFIED",
    portalCommitOk,
    "live portal manifest commit " + (livePortalManifest?.commit_sha || "unavailable") +
      " compared with expected Draft PR #18 head " + (expectedPortalCommit || "unavailable"),
  );
  record("ORALYN_STAGING_API_COMMIT_VERIFIED", apiCommitOk, apiCommitCheck.detail);

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
    "ORALYN_STAGING_DATABASE_BRANCH_VERIFIED",
    "ORALYN_CORS_VERIFIED",
    "ORALYN_SECURITY_HEADERS_VERIFIED",
    "ORALYN_STRICT_CSP_VERIFIED",
    "ORALYN_PATIENT_ACCOUNT_FREE_VERIFIED",
    "ORALYN_LEGACY_PATIENT_AUTH_SURFACES_RETIRED_VERIFIED",
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
