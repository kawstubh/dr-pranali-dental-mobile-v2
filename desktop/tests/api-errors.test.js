import assert from "node:assert/strict";
import { test } from "node:test";

import { dentalApi } from "../src/api.js";

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

test("patient API 401 responses do not clear the separate doctor session", async () => {
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
    assert.deepEqual(events, []);
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
