const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const outputDir = path.resolve(process.env.ORALYN_BUILD_DIR || path.join(process.cwd(), "dist"));
const manifestPath = path.join(outputDir, "oralyn-build-manifest.json");

if (!fs.existsSync(outputDir) || !fs.statSync(outputDir).isDirectory()) {
  throw new Error("Portal build output does not exist: " + outputDir);
}

function flag(value) {
  return ["1", "true", "yes"].includes(String(value || "").trim().toLowerCase());
}

function originOf(value) {
  if (!value) return null;
  const parsed = new URL(value);
  if (!["https:", "http:"].includes(parsed.protocol)) {
    throw new Error("Portal API origin must use HTTP or HTTPS.");
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

const supabaseAuthConfigured = Boolean(
  process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);
const portalOrigin = originOf(process.env.ORALYN_PORTAL_ORIGIN || "");
const apiOrigin = originOf(process.env.VITE_DENTAL_API_URL || "");

const checks = {
  supabase_auth_configured: supabaseAuthConfigured,
  isolated_portal_origin_assigned: Boolean(portalOrigin),
  backend_stack_verified: flag(process.env.ORALYN_BACKEND_STACK_VERIFIED),
  cors_verified_for_portal_origin: flag(process.env.ORALYN_CORS_VERIFIED),
  auth_redirects_verified_for_portal_origin: flag(process.env.ORALYN_AUTH_REDIRECTS_VERIFIED),
  private_document_storage_verified: flag(process.env.ORALYN_PRIVATE_STORAGE_VERIFIED),
};
const blockers = Object.entries(checks)
  .filter(([, passed]) => !passed)
  .map(([name]) => name);

const manifest = {
  product: "Oralyn responsive Doctor and Patient web portal",
  environment: process.env.ORALYN_ENVIRONMENT || "local",
  commit_sha: process.env.GITHUB_SHA || process.env.ORALYN_COMMIT_SHA || "unknown",
  branch: process.env.GITHUB_REF_NAME || process.env.ORALYN_BRANCH || "unknown",
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
  "API origin: " + (manifest.api_origin || "not configured"),
  "Patient Supabase auth: " + (supabaseAuthConfigured ? "configured" : "NOT CONFIGURED"),
  "Release status: " + manifest.release_status,
  "Release blockers: " + (blockers.length ? blockers.join(", ") : "none"),
  "Checksummed static files: " + manifest.files.length,
].join(newline) + newline);
