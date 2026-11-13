const assert = require("node:assert/strict");

const API_ORIGIN = (process.env.VITE_DENTAL_API_URL || "").replace(/\/+$/, "");
const PORTAL_ORIGIN = (process.env.ORALYN_PORTAL_ORIGIN || "").replace(/\/+$/, "");

if (!API_ORIGIN || !PORTAL_ORIGIN) {
  throw new Error("Assistant staging contract requires explicit API and portal origins.");
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(path, init = {}) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(API_ORIGIN + path, {
        ...init,
        signal: AbortSignal.timeout(20000),
      });
      if ([502, 503, 504].includes(response.status) && attempt < 2) {
        await wait(1200 * (attempt + 1));
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < 2) await wait(1200 * (attempt + 1));
    }
  }
  throw lastError || new Error("Assistant staging API did not respond.");
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
  await expectStatus("/v1/dental/health", 200);

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
  console.log("Verified " + required.length + " Assistant paths, " + assistantPaths.length + " Assistant routes, protected 401 boundaries, CORS and security headers.");
})().catch((error) => {
  console.error("Assistant staging API contract failed:", error);
  process.exitCode = 1;
});
