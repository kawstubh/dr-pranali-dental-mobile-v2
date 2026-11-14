const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const outputDir = path.resolve(process.env.ORALYN_BUILD_DIR || path.join(process.cwd(), "dist"));
const manifestPath = path.join(outputDir, "oralyn-build-manifest.json");

if (!fs.existsSync(outputDir) || !fs.statSync(outputDir).isDirectory()) {
  throw new Error("Portal build output does not exist: " + outputDir);
}

const buildIdSource =
  process.env.ORALYN_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  process.env.RENDER_GIT_COMMIT ||
  process.env.ORALYN_BUILD_ID ||
  Date.now().toString(36);
const buildId = String(buildIdSource)
  .replace(/[^A-Za-z0-9._-]/g, "")
  .slice(0, 40);
if (!buildId) throw new Error("Oralyn build ID is empty after sanitization.");

const serviceWorkerPath = path.join(outputDir, "sw.js");
if (!fs.existsSync(serviceWorkerPath)) {
  throw new Error("Oralyn service worker output is missing: " + serviceWorkerPath);
}
const serviceWorkerSource = fs.readFileSync(serviceWorkerPath, "utf8");
const serviceWorkerCacheName = "oralyn-portal-shell-" + buildId;
if (serviceWorkerSource.includes("__ORALYN_BUILD_ID__")) {
  fs.writeFileSync(
    serviceWorkerPath,
    serviceWorkerSource.replace(/__ORALYN_BUILD_ID__/g, buildId),
    "utf8",
  );
} else if (!serviceWorkerSource.includes(serviceWorkerCacheName)) {
  throw new Error("Oralyn service worker does not contain the expected immutable build ID.");
}
if (process.argv.includes("--prepare-only")) {
  process.stdout.write("Oralyn service-worker cache identity prepared: " + serviceWorkerCacheName + "\n");
  process.exit(0);
}

function flag(value) {
  return ["1", "true", "yes"].includes(String(value || "").trim().toLowerCase());
}

function originOf(value, { requireHttps = false, label = "origin" } = {}) {
  if (!value) return null;
  const parsed = new URL(value);
  if (
    !["https:", "http:"].includes(parsed.protocol) ||
    !parsed.hostname ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash ||
    (requireHttps && parsed.protocol !== "https:")
  ) {
    throw new Error(
      label + " must be a canonical " + (requireHttps ? "HTTPS" : "HTTP(S)") +
      " origin without credentials, path, query or fragment.",
    );
  }
  return parsed.origin;
}

function walk(directory, prefix = "") {
  return fs.readdirSync(directory, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const absolute = path.join(directory, entry.name);
      const relative = prefix ? prefix + "/" + entry.name : entry.name;
      if (entry.isDirectory()) return walk(absolute, relative);
      if (!entry.isFile() || absolute === manifestPath) return [];
      const bytes = fs.readFileSync(absolute);
      return [{
        path: relative.split(path.sep).join("/"),
        bytes: bytes.length,
        sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
      }];
    });
}

const environment = process.env.ORALYN_ENVIRONMENT || (process.env.RENDER_GIT_COMMIT ? "staging" : "local");
const environmentName = environment.toLowerCase();
const requireHttpsOrigins = ["staging", "production"].includes(environmentName);
const portalOrigin = originOf(process.env.ORALYN_PORTAL_ORIGIN || "", {
  requireHttps: requireHttpsOrigins,
  label: "Portal origin",
});
const configuredApiOrigin = originOf(process.env.VITE_DENTAL_API_URL || "", {
  requireHttps: requireHttpsOrigins,
  label: "Portal API origin",
});
const stagingApiOrigin = "https://oralyn-staging-api-assistant.onrender.com";
const apiOrigin = configuredApiOrigin || (environmentName === "staging" ? stagingApiOrigin : null);

if (environmentName === "staging" && apiOrigin !== stagingApiOrigin) {
  throw new Error("Staging portal builds must target the isolated synthetic staging API.");
}
if (environmentName === "production" && (!apiOrigin || apiOrigin === stagingApiOrigin)) {
  throw new Error("Production portal builds require an explicit non-staging HTTPS API origin.");
}

const bookingPagePath = path.join(outputDir, "patient", "booking", "index.html");
if (!fs.existsSync(bookingPagePath)) {
  throw new Error("Public booking page is missing from the portal build.");
}
const bookingMarker = '<meta name="oralyn-api-origin" content="__ORALYN_API_ORIGIN__">';
const bookingHtml = fs.readFileSync(bookingPagePath, "utf8");
if (!bookingHtml.includes(bookingMarker)) {
  throw new Error("Public booking API origin marker is missing; refusing to ship an unconfigured booking page.");
}
fs.writeFileSync(
  bookingPagePath,
  bookingHtml.replace(bookingMarker, '<meta name="oralyn-api-origin" content="' + (apiOrigin || "") + '">'),
  "utf8",
);

const checks = {
  isolated_portal_origin_assigned: Boolean(portalOrigin),
  public_booking_api_origin_configured: Boolean(apiOrigin),
  production_public_booking_api_origin_verified:
    environmentName === "production" && Boolean(apiOrigin) && apiOrigin !== stagingApiOrigin,
  backend_stack_verified: flag(process.env.ORALYN_BACKEND_STACK_VERIFIED),
  cors_verified_for_portal_origin: flag(process.env.ORALYN_CORS_VERIFIED),
  private_document_storage_verified: flag(process.env.ORALYN_PRIVATE_STORAGE_VERIFIED),
  document_malware_scanning_verified: flag(process.env.ORALYN_DOCUMENT_SCAN_VERIFIED),
  https_security_headers_verified: flag(process.env.ORALYN_SECURITY_HEADERS_VERIFIED),
  database_identity_verified: flag(process.env.ORALYN_DATABASE_IDENTITY_VERIFIED),
  staging_database_branch_verified: flag(process.env.ORALYN_STAGING_DATABASE_BRANCH_VERIFIED),
  backup_restore_verified: flag(process.env.ORALYN_BACKUP_RESTORE_VERIFIED),
  error_monitoring_verified: flag(process.env.ORALYN_ERROR_MONITORING_VERIFIED),
  rollback_plan_verified: flag(process.env.ORALYN_ROLLBACK_VERIFIED),
  doctor_auth_e2e_verified: flag(process.env.ORALYN_DOCTOR_AUTH_E2E_VERIFIED),
  doctor_token_storage_hardening_verified: flag(process.env.ORALYN_DOCTOR_TOKEN_STORAGE_HARDENING_VERIFIED),
  assistant_role_e2e_verified: flag(process.env.ORALYN_ASSISTANT_ROLE_E2E_VERIFIED),
  patient_guest_booking_e2e_verified: flag(process.env.ORALYN_GUEST_BOOKING_E2E_VERIFIED),
  patient_account_routes_disabled_verified: flag(process.env.ORALYN_PATIENT_ACCOUNT_FREE_VERIFIED),
  guest_booking_idempotency_verified: flag(process.env.ORALYN_GUEST_BOOKING_IDEMPOTENCY_VERIFIED),
  production_guest_rate_limiting_verified: flag(process.env.ORALYN_PRODUCTION_RATE_LIMITING_VERIFIED),
  assistant_ui_api_verified: flag(process.env.ORALYN_ASSISTANT_UI_API_VERIFIED),
  assistant_data_minimization_live_verified: flag(process.env.ORALYN_ASSISTANT_DATA_MINIMIZATION_LIVE_VERIFIED),
  cross_tenant_e2e_verified: flag(process.env.ORALYN_CROSS_TENANT_E2E_VERIFIED),
  authenticated_screenshots_verified: flag(process.env.ORALYN_AUTHENTICATED_SCREENSHOTS_VERIFIED),
  mobile_browser_e2e_verified: flag(process.env.ORALYN_MOBILE_BROWSER_E2E_VERIFIED),
  public_service_catalog_ui_verified: flag(process.env.ORALYN_SERVICE_CATALOG_UI_VERIFIED),
  public_service_catalog_api_verified: flag(process.env.ORALYN_SERVICE_CATALOG_API_VERIFIED),
  staging_api_commit_verified: flag(process.env.ORALYN_STAGING_API_COMMIT_VERIFIED),
  staging_portal_commit_verified: flag(process.env.ORALYN_STAGING_PORTAL_COMMIT_VERIFIED),
  production_hosting_always_on_verified: flag(process.env.ORALYN_PRODUCTION_HOSTING_VERIFIED),
  production_database_verified: flag(process.env.ORALYN_PRODUCTION_DATABASE_VERIFIED),
  production_custom_domain_verified: flag(process.env.ORALYN_PRODUCTION_DOMAIN_VERIFIED),
  production_deployment_approval_verified: flag(process.env.ORALYN_PRODUCTION_DEPLOYMENT_APPROVED),
};
const blockers = Object.entries(checks)
  .filter(([, passed]) => !passed)
  .map(([name]) => name);

const manifest = {
  product: "Oralyn responsive clinic web portal",
  environment,
  commit_sha: process.env.ORALYN_COMMIT_SHA || process.env.GITHUB_SHA || process.env.RENDER_GIT_COMMIT || "unknown",
  branch: process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || process.env.RENDER_GIT_BRANCH || process.env.ORALYN_BRANCH || "unknown",
  service_worker_cache_name: serviceWorkerCacheName,
  built_at: new Date().toISOString(),
  api_origin: apiOrigin,
  portal_origin: portalOrigin,
  evidence: {
    assistant_api_contract_readonly_verified: flag(process.env.ORALYN_ASSISTANT_API_CONTRACT_READONLY_VERIFIED),
  },
  checks,
  blockers,
  release_status: blockers.length ? "BLOCKED" : "AUTHENTICATED_ACCEPTANCE_REQUIRED",
  patient_ai_enabled: false,
  native_apk_required_for_release: false,
  files: walk(outputDir),
};

const newline = String.fromCharCode(10);
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + newline, "utf8");
process.stdout.write([
  "Oralyn build manifest written: " + path.relative(process.cwd(), manifestPath),
  "Commit: " + manifest.commit_sha,
  "Service worker cache: " + serviceWorkerCacheName,
  "API origin: " + (manifest.api_origin || "not configured"),
  "Public booking API origin: " + (manifest.checks.public_booking_api_origin_configured ? "configured" : "not configured"),
  "Production API origin: " + (manifest.checks.production_public_booking_api_origin_verified ? "verified" : "not verified"),
  "Patient authentication: intentionally not required",
  "Release status: " + manifest.release_status,
  "Release blockers: " + (blockers.length ? blockers.join(", ") : "none"),
  "Checksummed static files: " + manifest.files.length,
].join(newline) + newline);
