"use strict";

const REQUIRED_SYNTHETIC_BOOKING_GATES = Object.freeze([
  "ORALYN_DATABASE_IDENTITY_VERIFIED",
  "ORALYN_STAGING_DATABASE_BRANCH_VERIFIED",
  "ORALYN_STAGING_API_COMMIT_VERIFIED",
]);

function inspectSyntheticStagingBookingWriteGate(env = process.env) {
  const missingGates = [];
  if (String(env.ORALYN_ENVIRONMENT || "").trim().toLowerCase() !== "staging") {
    missingGates.push("ORALYN_ENVIRONMENT=staging");
  }
  for (const name of REQUIRED_SYNTHETIC_BOOKING_GATES) {
    if (String(env[name] || "").trim().toLowerCase() !== "true") {
      missingGates.push(name);
    }
  }
  return { allowed: missingGates.length === 0, missingGates };
}

module.exports = {
  REQUIRED_SYNTHETIC_BOOKING_GATES,
  inspectSyntheticStagingBookingWriteGate,
};
