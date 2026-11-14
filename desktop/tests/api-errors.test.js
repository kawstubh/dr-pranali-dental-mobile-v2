import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { dentalApi, resolveApiBase } from "../src/api.js";

const apiSource = readFileSync(new URL("../src/api.js", import.meta.url), "utf8");
const captureSource = readFileSync(new URL("../scripts/capture-actual-desktop.cjs", import.meta.url), "utf8");

test("production API configuration accepts only a canonical HTTPS origin", () => {
  assert.deepEqual(resolveApiBase({ VITE_DENTAL_API_URL: "https://api.oralyn.example" }), {
    base: "https://api.oralyn.example",
    error: null,
  });
  assert.deepEqual(resolveApiBase({ VITE_DENTAL_API_URL: "https://api.oralyn.example/" }), {
    base: "https://api.oralyn.example",
    error: null,
  });
});

test("production API configuration rejects insecure, credentialed and path-based URLs", () => {
  for (const value of [
    "http://api.oralyn.example",
    "https://user:secret@api.oralyn.example",
    "https://api.oralyn.example/v1",
    "https://api.oralyn.example?tenant=clinic",
    "https://api.oralyn.example#token",
    "//api.oralyn.example",
    "not-a-url",
  ]) {
    assert.deepEqual(resolveApiBase({ VITE_DENTAL_API_URL: value }), {
      base: "",
      error: "API_BASE_INVALID",
    }, value);
  }
});

test("development keeps the same-origin Vite proxy instead of an arbitrary configured API URL", () => {
  assert.deepEqual(resolveApiBase({
    DEV: true,
    VITE_DENTAL_API_URL: "http://untrusted.example",
  }), { base: "", error: null });
});

test("production API configuration fails closed when the API origin is missing", () => {
  assert.deepEqual(resolveApiBase({}), {
    base: "",
    error: "API_BASE_NOT_CONFIGURED",
  });
});

test("production portal builds require an explicit API origin instead of silently falling back to staging", () => {
  assert.match(apiSource, /env\.VITE_DENTAL_API_URL \|\| ""/);
  assert.match(apiSource, /API_BASE_NOT_CONFIGURED/);
  assert.doesNotMatch(apiSource, /https:\/\/oralyn-multitenant-staging\.onrender\.com/);
  assert.match(captureSource, /process\.env\.VITE_DENTAL_API_URL \|\| "not-configured"/);
});

test("API network and CORS failures produce a clinic-safe recovery message", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => {
      throw new TypeError("Failed to fetch");
    };
    await assert.rejects(dentalApi.health(), (error) => {
      assert.equal(error.code, "NETWORK_OR_CORS_ERROR");
      assert.match(error.message, /clinic service could not be reached/i);
      assert.ok(error.cause instanceof TypeError);
      return true;
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("API authentication failures preserve the server's stable error code", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(
      JSON.stringify({ detail: { code: "SESSION_EXPIRED", message: "Please sign in again." } }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
    await assert.rejects(dentalApi.health(), (error) => {
      assert.equal(error.status, 401);
      assert.equal(error.code, "SESSION_EXPIRED");
      assert.equal(error.message, "Please sign in again.");
      return true;
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("expired doctor API tokens trigger the portal session-expiry handler", async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const events = [];
  globalThis.window = {
    dispatchEvent(event) {
      events.push(event.type);
      return true;
    },
  };
  globalThis.fetch = async () => new Response(
    JSON.stringify({ detail: { code: "SESSION_EXPIRED", message: "Please sign in again." } }),
    { status: 401, headers: { "Content-Type": "application/json" } },
  );
  try {
    await assert.rejects(dentalApi.patients("expired-doctor-token"), (error) => {
      assert.equal(error.status, 401);
      assert.equal(error.code, "SESSION_EXPIRED");
      return true;
    });
    assert.deepEqual(events, ["oralyn:doctor-session-expired"]);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});


test("doctor dashboard summary uses the authenticated active-workspace endpoint", async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl = "";
  let requestInit;
  globalThis.fetch = async (url, init) => {
    requestUrl = String(url);
    requestInit = init;
    return new Response(JSON.stringify({
      result: {
        patient_count: 0,
        appointment_count: 0,
        pending_appointment_requests: 0,
        active_treatment_plan_count: 0,
        issued_invoice_count: 0,
        invoiced_total_paise: 0,
        collected_total_paise: 0,
        outstanding_balance_paise: 0,
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    const response = await dentalApi.dashboardSummary("synthetic-doctor-token");
    assert.match(requestUrl, /\/v1\/dental\/doctor\/dashboard\/summary$/);
    assert.equal(requestInit.method, "GET");
    assert.equal(requestInit.headers.Authorization, "Bearer synthetic-doctor-token");
    assert.equal(requestInit.body, undefined);
    assert.equal(response.result.patient_count, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});




test("public patient journey does not expose authenticated patient-account API methods", () => {
  for (const method of [
    "patientLink", "patientLinkedRecords", "patientAppointments",
    "patientRequestAppointment", "patientChart", "patientClinicalNotes",
    "patientMessages", "sendPatientMessage", "patientTreatmentPlans",
    "patientInvoices", "patientReceipts", "patientDocuments",
    "patientDocumentDownloadIntent",
  ]) assert.equal(typeof dentalApi[method], "undefined", method);
});
