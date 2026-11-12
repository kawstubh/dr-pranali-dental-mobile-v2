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
