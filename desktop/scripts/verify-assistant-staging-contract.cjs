const assert = require("node:assert/strict");

const API_ORIGIN = (process.env.VITE_DENTAL_API_URL || "").replace(/\/+$/, "");
const PORTAL_ORIGIN = (process.env.ORALYN_PORTAL_ORIGIN || "").replace(/\/+$/, "");

if (!API_ORIGIN || !PORTAL_ORIGIN) {
  throw new Error("Assistant staging contract requires explicit API and portal origins.");
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(path, init = {}) {
  let lastError;
  let lastTransientStatus = null;
  const maxAttempts = 10;
  const retryableStatuses = new Set([502, 503, 504]);
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const delayMs = Math.min(8000, 1500 * (2 ** Math.min(attempt, 3)));
    try {
      const response = await fetch(API_ORIGIN + path, {
        ...init,
        signal: AbortSignal.timeout(12000),
      });
      if (retryableStatuses.has(response.status)) {
        lastTransientStatus = response.status;
        await response.arrayBuffer();
        if (attempt < maxAttempts - 1) {
          console.warn("[Oralyn staging] transient HTTP " + response.status + " for " + path +
            "; retry " + (attempt + 2) + "/" + maxAttempts + " in " + delayMs + "ms.");
          await wait(delayMs);
          continue;
        }
        throw new Error("Assistant staging API remained HTTP " + response.status +
          " for " + path + " after " + maxAttempts + " attempts.");
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts - 1) {
        console.warn("[Oralyn staging] request to " + path + " did not complete; retry " +
          (attempt + 2) + "/" + maxAttempts + " in " + delayMs + "ms.");
        await wait(delayMs);
      }
    }
  }
  if (lastTransientStatus !== null) {
    throw new Error("Assistant staging API remained unavailable for " + path +
      " after " + maxAttempts + " bounded attempts (last HTTP " + lastTransientStatus + ").");
  }
  throw new Error("Assistant staging API did not respond for " + path + " after " +
    maxAttempts + " bounded attempts.", { cause: lastError });
}

async function expectStatus(path, status, { consume = true } = {}) {
  const response = await request(path, { method: "GET" });
  assert.equal(response.status, status, path + " must return " + status);
  if (consume) await response.arrayBuffer();
  return response;
}

(async () => {
  const health = await expectStatus("/health", 200);
  await expectStatus("/ready", 200);
  const dentalHealthResponse = await expectStatus("/v1/dental/health", 200, { consume: false });
  const dentalHealth = await dentalHealthResponse.json();
  assert.equal(dentalHealth.database, "postgres", "Staging API must use PostgreSQL");
  assert.equal(dentalHealth.uie_configured, true, "Staging API must have the UIE provider configured");

  for (const name of [
    "strict-transport-security",
    "x-content-type-options",
    "x-frame-options",
    "referrer-policy",
    "permissions-policy",
  ]) {
    assert.ok(health.headers.get(name), "Missing security response header: " + name);
  }
  assert.equal(health.headers.get("x-content-type-options"), "nosniff");

  const openapiResponse = await expectStatus("/openapi.json", 200, { consume: false });
  const openapi = await openapiResponse.json();
  const paths = Object.keys(openapi.paths || {});
  const required = [
    "/v1/dental/assistant/auth/login",
    "/v1/dental/assistant/auth/logout",
    "/v1/dental/assistant/me",
    "/v1/dental/assistant/patients",
    "/v1/dental/assistant/appointments",
    "/v1/dental/assistant/appointments/{appointment_id}",
    "/v1/dental/assistant/billing/invoices",
    "/v1/dental/assistant/billing/invoices/{invoice_id}/receipts",
    "/v1/dental/clinic-assistants",
  ];
  for (const path of required) assert.ok(paths.includes(path), "Missing Assistant API path: " + path);

  const assistantPaths = paths.filter((path) => path.startsWith("/v1/dental/assistant/"));
  const forbiddenAssistantPaths = assistantPaths.filter((path) =>
    /clinical|intelligence|diagnos|prescri|treatment|odontogram|document|owner|settings/i.test(path)
  );
  assert.deepEqual(forbiddenAssistantPaths, [], "Assistant API must not expose clinical or owner-only routes");

  const patientAccountPaths = paths.filter((path) =>
    path.startsWith("/v1/dental/patient/") || path.startsWith("/v1/dental/auth/patient")
  );
  assert.deepEqual(patientAccountPaths, [], "Patient account and linked-record routes must remain absent");

  for (const path of [
    "/v1/dental/assistant/me",
    "/v1/dental/assistant/patients",
    "/v1/dental/assistant/appointments",
    "/v1/dental/assistant/billing/invoices",
    "/v1/dental/clinic-assistants",
    "/v1/dental/doctor/patients/00000000-0000-0000-0000-000000000001/clinical-notes",
    "/v1/dental/doctor/patients/00000000-0000-0000-0000-000000000001/treatment-plans",
  ]) {
    const response = await expectStatus(path, 401);
    assert.match(response.headers.get("cache-control") || "", /no-store/i);
  }

  const preflight = await request("/v1/dental/assistant/appointments", {
    method: "OPTIONS",
    headers: {
      Origin: PORTAL_ORIGIN,
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Headers": "authorization,content-type",
    },
  });
  assert.ok([200, 204].includes(preflight.status), "Assistant CORS preflight must succeed");
  assert.equal(
    preflight.headers.get("access-control-allow-origin"),
    PORTAL_ORIGIN,
    "Assistant API must allow only the configured portal origin"
  );
  await preflight.arrayBuffer();

  console.log("Assistant staging API contract passed (read-only; no credentials or writes used).");
  console.log("Verified PostgreSQL identity, UIE readiness, " + required.length + " Assistant paths, " + assistantPaths.length + " Assistant routes, protected 401 boundaries, CORS and security headers.");
})().catch((error) => {
  console.error("Assistant staging API contract failed:", error);
  process.exitCode = 1;
});
