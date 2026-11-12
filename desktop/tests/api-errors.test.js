import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { dentalApi } from "../src/api.js";

const apiSource = readFileSync(new URL("../src/api.js", import.meta.url), "utf8");
const captureSource = readFileSync(new URL("../scripts/capture-actual-desktop.cjs", import.meta.url), "utf8");

test("production portal builds require an explicit API origin instead of silently falling back to staging", () => {
  assert.match(apiSource, /ENV\.VITE_DENTAL_API_URL \|\| ""/);
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

test("patient API 401 responses expire only the patient session", async () => {
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
    JSON.stringify({ detail: { code: "PATIENT_SESSION_INVALID", message: "Patient sign-in needs refreshing." } }),
    { status: 401, headers: { "Content-Type": "application/json" } },
  );
  try {
    await assert.rejects(dentalApi.patientAppointments("expired-patient-token", "synthetic-patient-1"), (error) => {
      assert.equal(error.status, 401);
      assert.equal(error.code, "PATIENT_SESSION_INVALID");
      return true;
    });
    assert.deepEqual(events, ["oralyn:patient-session-expired"]);
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

test("patient linking, appointments and chart use authenticated non-AI patient routes", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, init) => {
    requests.push({ url: String(url), init });
    return new Response(JSON.stringify({ result: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  try {
    await dentalApi.patientLink("patient-token", "ABC12345");
    await dentalApi.patientAppointments("patient-token", "patient-record-1");
    await dentalApi.patientChart("patient-token", "patient-record-1");

    assert.match(requests[0].url, /\/v1\/dental\/patient\/link$/);
    assert.match(requests[1].url, /\/v1\/dental\/patient\/appointments\?patient_id=patient-record-1$/);
    assert.match(requests[2].url, /\/v1\/dental\/patient\/chart\?patient_id=patient-record-1$/);
    for (const request of requests) {
      assert.equal(request.init.headers.Authorization, "Bearer patient-token");
      assert.doesNotMatch(request.url, /\/dental\/ai\/patient\/(?:link|appointments|chart)/);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("signed-in patient appointment requests are attached to the verified clinic record", async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl = "";
  let requestInit;
  globalThis.fetch = async (url, init) => {
    requestUrl = String(url);
    requestInit = init;
    return new Response(JSON.stringify({ result: { id: "request-1", status: "requested" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  try {
    const response = await dentalApi.patientRequestAppointment(
      "patient-token",
      "linked-record-1",
      { starts_at: "2027-01-15T04:30:00.000Z", treatment_type: "Dental check-up" },
    );
    assert.match(requestUrl, /\/v1\/dental\/patient\/appointments\?patient_id=linked-record-1$/);
    assert.equal(requestInit.method, "POST");
    assert.equal(requestInit.headers.Authorization, "Bearer patient-token");
    assert.deepEqual(JSON.parse(requestInit.body), {
      starts_at: "2027-01-15T04:30:00.000Z",
      treatment_type: "Dental check-up",
    });
    assert.equal(response.result.status, "requested");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
