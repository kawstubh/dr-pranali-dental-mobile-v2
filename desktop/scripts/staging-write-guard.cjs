"use strict";

const APPROVED_STAGING_PORTAL_ORIGIN = "https://oralyn-web-portal-spa.onrender.com";

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

  let portalOrigin = "";
  try {
    portalOrigin = new URL(String(env.ORALYN_PORTAL_ORIGIN || "").trim()).origin;
  } catch {
    portalOrigin = "";
  }
  if (portalOrigin !== APPROVED_STAGING_PORTAL_ORIGIN) {
    missingGates.push("ORALYN_PORTAL_ORIGIN=approved-staging-origin");
  }

  for (const name of REQUIRED_SYNTHETIC_BOOKING_GATES) {
    if (String(env[name] || "").trim().toLowerCase() !== "true") {
      missingGates.push(name);
    }
  }
  return { allowed: missingGates.length === 0, missingGates };
}

module.exports = {
  APPROVED_STAGING_PORTAL_ORIGIN,
  REQUIRED_SYNTHETIC_BOOKING_GATES,
  inspectSyntheticStagingBookingWriteGate,
};
