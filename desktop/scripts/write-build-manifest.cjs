const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const outputDir = path.resolve(process.env.ORALYN_BUILD_DIR || path.join(process.cwd(), "dist"));
const manifestPath = path.join(outputDir, "oralyn-build-manifest.json");

if (!fs.existsSync(outputDir) || !fs.statSync(outputDir).isDirectory()) {
  throw new Error("Portal build output does not exist: " + outputDir);
}

const buildIdSource =
  process.env.GITHUB_SHA ||
  process.env.ORALYN_COMMIT_SHA ||
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
if (!serviceWorkerSource.includes("__ORALYN_BUILD_ID__")) {
  throw new Error("Oralyn service worker build ID placeholder is missing.");
}
const serviceWorkerCacheName = "oralyn-portal-shell-" + buildId;
fs.writeFileSync(
  serviceWorkerPath,
  serviceWorkerSource.replace(/__ORALYN_BUILD_ID__/g, buildId),
  "utf8",
);

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

const environment = process.env.ORALYN_ENVIRONMENT || "local";
const requireHttpsOrigins = ["staging", "production"].includes(environment.toLowerCase());
const portalOrigin = originOf(process.env.ORALYN_PORTAL_ORIGIN || "", {
  requireHttps: requireHttpsOrigins,
  label: "Portal origin",
});
const apiOrigin = originOf(process.env.VITE_DENTAL_API_URL || "", {
  requireHttps: requireHttpsOrigins,
  label: "Portal API origin",
});

const checks = {
  isolated_portal_origin_assigned: Boolean(portalOrigin),
  backend_stack_verified: flag(process.env.ORALYN_BACKEND_STACK_VERIFIED),
  cors_verified_for_portal_origin: flag(process.env.ORALYN_CORS_VERIFIED),
  private_document_storage_verified: flag(process.env.ORALYN_PRIVATE_STORAGE_VERIFIED),
  document_malware_scanning_verified: flag(process.env.ORALYN_DOCUMENT_SCAN_VERIFIED),
  https_security_headers_verified: flag(process.env.ORALYN_SECURITY_HEADERS_VERIFIED),
  database_identity_verified: flag(process.env.ORALYN_DATABASE_IDENTITY_VERIFIED),
  backup_restore_verified: flag(process.env.ORALYN_BACKUP_RESTORE_VERIFIED),
  error_monitoring_verified: flag(process.env.ORALYN_ERROR_MONITORING_VERIFIED),
  rollback_plan_verified: flag(process.env.ORALYN_ROLLBACK_VERIFIED),
  doctor_auth_e2e_verified: flag(process.env.ORALYN_DOCTOR_AUTH_E2E_VERIFIED),
  assistant_role_e2e_verified: flag(process.env.ORALYN_ASSISTANT_ROLE_E2E_VERIFIED),
  patient_guest_booking_e2e_verified: flag(process.env.ORALYN_GUEST_BOOKING_E2E_VERIFIED),
  patient_account_routes_disabled_verified: flag(process.env.ORALYN_PATIENT_ACCOUNT_FREE_VERIFIED),
  guest_booking_idempotency_verified: flag(process.env.ORALYN_GUEST_BOOKING_IDEMPOTENCY_VERIFIED),
  assistant_ui_api_verified: flag(process.env.ORALYN_ASSISTANT_UI_API_VERIFIED),
  cross_tenant_e2e_verified: flag(process.env.ORALYN_CROSS_TENANT_E2E_VERIFIED),
  authenticated_screenshots_verified: flag(process.env.ORALYN_AUTHENTICATED_SCREENSHOTS_VERIFIED),
  mobile_browser_e2e_verified: flag(process.env.ORALYN_MOBILE_BROWSER_E2E_VERIFIED),
};
const blockers = Object.entries(checks)
  .filter(([, passed]) => !passed)
  .map(([name]) => name);

const manifest = {
  product: "Oralyn responsive clinic web portal",
  environment,
  commit_sha: process.env.GITHUB_SHA || process.env.ORALYN_COMMIT_SHA || "unknown",
  branch: process.env.GITHUB_REF_NAME || process.env.ORALYN_BRANCH || "unknown",
  service_worker_cache_name: serviceWorkerCacheName,
  built_at: new Date().toISOString(),
  api_origin: apiOrigin,
  portal_origin: portalOrigin,
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
  "Patient authentication: intentionally not required",
  "Release status: " + manifest.release_status,
  "Release blockers: " + (blockers.length ? blockers.join(", ") : "none"),
  "Checksummed static files: " + manifest.files.length,
].join(newline) + newline);
