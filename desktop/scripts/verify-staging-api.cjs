"use strict";

const fs = require("node:fs");

const apiBase = String(process.env.VITE_DENTAL_API_URL || "").replace(/\\/+$/, "");
const portalOrigin = String(process.env.ORALYN_PORTAL_ORIGIN || "").replace(/\\/+$/, "");
const timeoutMs = 90000;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function includesHeader(response, name, expected) {
  const actual = String(response.headers.get(name) || "").toLowerCase();
  return actual.includes(String(expected).toLowerCase());
}

async function getJson(path, init = {}) {
  const response = await fetch(apiBase + path, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  });
  let body = null;
  try { body = await response.json(); } catch {}
  return { response, body };
}

async function main() {
  assert(/^https:\/\//.test(apiBase), "VITE_DENTAL_API_URL must be an HTTPS staging API URL.");
  assert(/^https:\/\//.test(portalOrigin), "ORALYN_PORTAL_ORIGIN must be an HTTPS staging portal origin.");

  const health = await getJson("/health");
  assert(health.response.status === 200 && health.body?.status === "ok", "Staging /health failed: " + health.response.status);
  assert(health.body?.dental_api === true, "Staging /health did not report dental_api=true.");
  assert(health.body?.providers?.knowledge === true && health.body?.providers?.reasoning === true, "Staging UIE providers are not configured.");

  const ready = await getJson("/ready");
  assert(ready.response.status === 200 && ready.body?.database === "postgres", "Staging /ready did not verify PostgreSQL.");

  const dentalHealth = await getJson("/v1/dental/health");
  assert(dentalHealth.response.status === 200, "Staging dental health failed: " + dentalHealth.response.status);
  assert(dentalHealth.body?.database === "postgres" && dentalHealth.body?.uie_configured === true, "Staging dental API/database/UIE identity check failed.");

  const preflight = await fetch(apiBase + "/v1/dental/patients", {
    method: "OPTIONS",
    headers: {
      Origin: portalOrigin,
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Headers": "authorization",
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  assert(preflight.status === 200, "CORS preflight did not return 200: " + preflight.status);
  assert(preflight.headers.get("access-control-allow-origin") === portalOrigin, "CORS preflight did not allow the exact Oralyn staging origin.");
  assert(preflight.headers.get("access-control-allow-credentials") === "true", "CORS preflight did not allow credentials.");
  assert(includesHeader(preflight, "access-control-allow-methods", "GET"), "CORS preflight did not allow GET.");
  assert(includesHeader(preflight, "access-control-allow-headers", "authorization"), "CORS preflight did not allow Authorization.");

  const privatePatients = await getJson("/v1/dental/patients", {
    headers: { Origin: portalOrigin, Authorization: "Bearer invalid-synthetic-cors-check" },
  });
  assert(privatePatients.response.status === 401, "Invalid bearer token must receive 401, got " + privatePatients.response.status);
  assert(privatePatients.response.headers.get("access-control-allow-origin") === portalOrigin, "401 patient response is missing the exact CORS origin.");
  assert(privatePatients.response.headers.get("access-control-allow-credentials") === "true", "401 patient response is missing CORS credentials.");
  assert(includesHeader(privatePatients.response, "access-control-expose-headers", "cache-control"), "CORS response does not expose Cache-Control.");

  const privateAppointments = await getJson("/v1/dental/appointments", {
    headers: { Origin: portalOrigin },
  });
  assert(privateAppointments.response.status === 401, "Unauthenticated appointments must receive 401, got " + privateAppointments.response.status);
  assert(privateAppointments.response.headers.get("access-control-allow-origin") === portalOrigin, "401 appointments response is missing the exact CORS origin.");

  const security = privatePatients.response;
  assert(includesHeader({ headers: security.headers }, "cache-control", "no-store"), "Clinical API response is missing no-store Cache-Control.");
  assert(includesHeader({ headers: security.headers }, "pragma", "no-cache"), "Clinical API response is missing Pragma: no-cache.");
  assert(security.headers.get("expires") === "0", "Clinical API response is missing Expires: 0.");
  assert(security.headers.get("x-content-type-options") === "nosniff", "Clinical API response is missing nosniff.");
  assert(includesHeader({ headers: security.headers }, "strict-transport-security", "max-age="), "Clinical API response is missing HSTS.");
  assert(security.headers.get("referrer-policy") === "strict-origin-when-cross-origin", "Clinical API response has an unexpected Referrer-Policy.");
  assert(security.headers.get("x-frame-options") === "DENY", "Clinical API response is missing X-Frame-Options: DENY.");
  assert(Boolean(security.headers.get("permissions-policy")), "Clinical API response is missing Permissions-Policy.");

  const verified = [
    "ORALYN_BACKEND_STACK_VERIFIED=true",
    "ORALYN_DATABASE_IDENTITY_VERIFIED=true",
    "ORALYN_CORS_VERIFIED=true",
    "ORALYN_SECURITY_HEADERS_VERIFIED=true",
  ].join("\\n") + "\\n";
  if (process.env.GITHUB_ENV) fs.appendFileSync(process.env.GITHUB_ENV, verified);
  console.log(JSON.stringify({
    staging_api: apiBase,
    portal_origin: portalOrigin,
    health: health.response.status,
    ready: ready.body,
    dental_health: dentalHealth.body,
    cors_preflight: preflight.status,
    invalid_patient_token: privatePatients.response.status,
    unauthenticated_appointments: privateAppointments.response.status,
    security_headers: "verified",
    release_gates_written: Boolean(process.env.GITHUB_ENV),
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
