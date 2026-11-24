import { test } from "node:test";
import assert from "node:assert/strict";
import stagingWriteGuard from "../scripts/staging-write-guard.cjs";

const { APPROVED_STAGING_PORTAL_ORIGIN, inspectSyntheticStagingBookingWriteGate } = stagingWriteGuard;

const valid = Object.freeze({
  ORALYN_ENVIRONMENT: "staging",
  ORALYN_PORTAL_ORIGIN: APPROVED_STAGING_PORTAL_ORIGIN,
  ORALYN_DATABASE_IDENTITY_VERIFIED: "true",
  ORALYN_STAGING_DATABASE_BRANCH_VERIFIED: "true",
  ORALYN_STAGING_API_COMMIT_VERIFIED: "true",
});

test("synthetic booking writes require the exact HTTPS staging portal origin", () => {
  assert.deepEqual(inspectSyntheticStagingBookingWriteGate(valid), {
    allowed: true,
    missingGates: [],
  });
});

test("synthetic booking writes fail closed when the portal origin is missing", () => {
  const result = inspectSyntheticStagingBookingWriteGate({
    ...valid,
    ORALYN_PORTAL_ORIGIN: "",
  });
  assert.equal(result.allowed, false);
  assert.ok(result.missingGates.includes("ORALYN_PORTAL_ORIGIN=approved-staging-origin"));
});

test("synthetic booking writes reject production and lookalike portal origins", () => {
  for (const origin of [
    "https://oralyn.example.com",
    "https://oralyn-web-portal-spa.onrender.com.attacker.example",
    "http://oralyn-web-portal-spa.onrender.com",
    "not-a-url",
  ]) {
    const result = inspectSyntheticStagingBookingWriteGate({
      ...valid,
      ORALYN_PORTAL_ORIGIN: origin,
    });
    assert.equal(result.allowed, false, origin);
    assert.ok(
      result.missingGates.includes("ORALYN_PORTAL_ORIGIN=approved-staging-origin"),
      origin,
    );
  }
});

test("synthetic booking writes still require staging environment and all runtime attestations", () => {
  const production = inspectSyntheticStagingBookingWriteGate({
    ...valid,
    ORALYN_ENVIRONMENT: "production",
  });
  assert.equal(production.allowed, false);
  assert.ok(production.missingGates.includes("ORALYN_ENVIRONMENT=staging"));

  for (const gate of [
    "ORALYN_DATABASE_IDENTITY_VERIFIED",
    "ORALYN_STAGING_DATABASE_BRANCH_VERIFIED",
    "ORALYN_STAGING_API_COMMIT_VERIFIED",
  ]) {
    const result = inspectSyntheticStagingBookingWriteGate({ ...valid, [gate]: "false" });
    assert.equal(result.allowed, false);
    assert.ok(result.missingGates.includes(gate));
  }
});
