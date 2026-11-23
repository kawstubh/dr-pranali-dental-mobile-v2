import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Script } from "node:vm";
import openApiSecurity from "../scripts/openapi-security.cjs";
import stagingWriteGuard from "../scripts/staging-write-guard.cjs";

const { inspectOpenApiBearerAuth } = openApiSecurity;

test("synthetic Doctor capture script parses before browser CI executes it", () => {
  const file = join(process.cwd(), "scripts", "capture-synthetic-doctor.cjs");
  const source = readFileSync(file, "utf8");

  assert.doesNotThrow(() => new Script(source, { filename: file }));
});

test("synthetic Doctor capture uses a safely quoted clinic workspace selector", () => {
  const file = join(process.cwd(), "scripts", "capture-synthetic-doctor.cjs");
  const source = readFileSync(file, "utf8");
  const selector = "document.querySelector('select[aria-label=\"Switch clinic workspace\"]')";

  assert.equal(source.split(selector).length - 1, 3);
});

test("synthetic Doctor capture submits the current premium login form", () => {
  const source = readFileSync(join(process.cwd(), "scripts", "capture-synthetic-doctor.cjs"), "utf8");
  assert.match(source, /oralyn-auth-card form/);
  assert.match(source, /Sign in with your clinic-issued email and password/);
  assert.doesNotMatch(source, /\.authcard form|Sign in with your clinic doctor account/);
});

test("synthetic Doctor capture proves memory-only token behavior across refresh and expiry", () => {
  const source = readFileSync(join(process.cwd(), "scripts", "capture-synthetic-doctor.cjs"), "utf8");
  assert.match(source, /auth\/password\/login/);
  assert.match(source, /submitDoctorLogin/);
  assert.match(source, /doctor_token_storage=memory_only/);
  assert.match(source, /doctor_session_reload=requires_login/);
  assert.match(source, /noPersistentTokenAfterReload/);
  assert.doesNotMatch(source, /localStorage\.setItem\('oralyn_doctor_token'/);
});

test("synthetic Doctor capture uses SPA navigation while the bearer token is memory-only", () => {
  const source = readFileSync(join(process.cwd(), "scripts", "capture-synthetic-doctor.cjs"), "utf8");
  const start = source.indexOf("async function navigate(route, expectedText)");
  const end = source.indexOf("async function submitDoctorLogin", start);
  assert.ok(start >= 0 && end > start);
  const helper = source.slice(start, end);
  assert.match(helper, /history\.pushState/);
  assert.match(helper, /PopStateEvent\('popstate'\)/);
  assert.doesNotMatch(helper, /Page\.navigate/);
});


test("real browser capture verifies legacy Assistant admin route redirects to Doctor sign-in", () => {
  const file = join(process.cwd(), "scripts", "capture-actual-desktop.cjs");
  const source = readFileSync(file, "utf8");

  assert.doesNotThrow(() => new Script(source, { filename: file }));
  assert.match(source, /assistant-admin-redirect-gate/);
  assert.match(source, /redirectedToDoctorSettings/);
  assert.match(source, /doctorSignInVisible/);
  assert.match(source, /assistantManagementFormVisible/);
  assert.match(source, /assistant_admin_redirect_gate=passed/);
});


test("real browser capture verifies the approved Oralyn wordmark and app icon load", () => {
  const source = readFileSync(join(process.cwd(), "scripts", "capture-actual-desktop.cjs"), "utf8");
  assert.match(source, /oralyn-official-logo\.png/);
  assert.match(source, /oralyn-app-icon-approved\.webp/);
  assert.match(source, /approvedLogoAssets\.wordmark/);
  assert.match(source, /approvedLogoAssets\.appIcon/);
});

test("real browser capture follows the current premium Doctor login and patient-services link", () => {
  const source = readFileSync(join(process.cwd(), "scripts", "capture-actual-desktop.cjs"), "utf8");
  assert.match(source, /Sign in with your clinic-issued email and password/);
  assert.match(source, /Patient services & appointment requests/);
  assert.doesNotMatch(source, /Sign in with your clinic doctor account|Public patient services/);
});

test("synthetic Assistant capture exercises the SPA route, memory-only login, reception, appointments and billing", () => {
  const file = join(process.cwd(), "scripts", "capture-synthetic-assistant.cjs");
  const source = readFileSync(file, "utf8");

  assert.doesNotThrow(() => new Script(source, { filename: file }));
  assert.ok(source.includes('baseUrl + "/assistant/"'));
  assert.ok(source.includes("v1/dental/assistant/auth/login"));
  assert.ok(source.includes("assistant-login"));
  assert.ok(source.includes("appointment-reschedule"));
  assert.ok(source.includes("assistant_appointment_reschedule=passed_fixture"));
  assert.ok(source.includes("receipt-recorded"));
  assert.ok(source.includes("assistant_receipt_recording=passed_fixture"));
  assert.ok(source.includes("UNHANDLED_SYNTHETIC_PATH"));
  assert.ok(source.includes("staging_assistant_login_verified=false"));
  assert.ok(!source.includes("treatment_type"));
  assert.ok(source.includes("doctor_clinical_ai_visible=false"));
  assert.ok(!source.includes("sessionStorage.setItem"));
});

test("Assistant intake clears contact fields after the API-backed save resolves", () => {
  const file = join(process.cwd(), "src", "assistant.jsx");
  const source = readFileSync(file, "utf8");
  assert.ok(source.includes('setPatientForm({ name: "", phone: "" })'));
  assert.ok(source.includes("Patient contact details added."));
  assert.ok(source.includes('assistantRequest("/v1/dental/assistant/patients"'));
});


const { inspectSyntheticStagingBookingWriteGate } = stagingWriteGuard;

test("live browser booking writes require staging database identity, branch identity and API commit attestation", () => {
  const valid = {
    ORALYN_ENVIRONMENT: "staging",
    ORALYN_DATABASE_IDENTITY_VERIFIED: "true",
    ORALYN_STAGING_DATABASE_BRANCH_VERIFIED: "true",
    ORALYN_STAGING_API_COMMIT_VERIFIED: "true",
  };
  assert.deepEqual(inspectSyntheticStagingBookingWriteGate(valid), {
    allowed: true,
    missingGates: [],
  });

  for (const gate of [
    "ORALYN_DATABASE_IDENTITY_VERIFIED",
    "ORALYN_STAGING_DATABASE_BRANCH_VERIFIED",
    "ORALYN_STAGING_API_COMMIT_VERIFIED",
  ]) {
    const result = inspectSyntheticStagingBookingWriteGate({ ...valid, [gate]: "false" });
    assert.equal(result.allowed, false);
    assert.ok(result.missingGates.includes(gate));
  }

  const production = inspectSyntheticStagingBookingWriteGate({
    ...valid,
    ORALYN_ENVIRONMENT: "production",
  });
  assert.equal(production.allowed, false);
  assert.ok(production.missingGates.includes("ORALYN_ENVIRONMENT=staging"));
});

test("browser capture skips live synthetic writes when any staging attestation is missing", () => {
  const capture = readFileSync(join(process.cwd(), "scripts", "capture-actual-desktop.cjs"), "utf8");
  const workflow = readFileSync(join(process.cwd(), "..", ".github", "workflows", "oralyn-desktop.yml"), "utf8");
  assert.match(capture, /inspectSyntheticStagingBookingWriteGate/);
  assert.match(capture, /if \(bookingWriteGate\.allowed\)/);
  assert.match(capture, /Live synthetic booking write skipped/);
  assert.match(capture, /ORALYN_GUEST_BOOKING_BROWSER_E2E_VERIFIED=true/);
  assert.doesNotMatch(
    workflow,
    /echo ["']ORALYN_GUEST_BOOKING_BROWSER_E2E_VERIFIED=true["']\s*>>\s*["']\$GITHUB_ENV["']/,
  );
});

test("live staging contract probe writes only one idempotent synthetic booking after database identity verification", () => {
  const file = join(process.cwd(), "scripts", "verify-staging-contract.cjs");
  const source = readFileSync(file, "utf8");

  assert.doesNotThrow(() => new Script(source, { filename: file }));
  const identityGate = source.indexOf('if (health?.database_identity_verified === true && branchIdentityOk && apiCommitOk && apiRuntimeCommit)');
  const postMethod = source.indexOf('method: "POST"');
  assert.ok(identityGate >= 0 && postMethod > identityGate);
  assert.equal((source.match(/method: "POST"/g) || []).length, 2);
  assert.equal((source.match(/body: JSON.stringify\(syntheticPayload\)/g) || []).length, 2);
  assert.match(source, /method: "OPTIONS"/);
  assert.match(source, /name: "Oralyn Synthetic /);
  assert.match(source, /intelligence_request: false/);
  assert.match(source, /idempotency_key: idempotencyKey/);
  assert.match(source, /replayBooking/);
  assert.match(source, /noPrivateIdentifiers/);
  assert.match(source, /ORALYN_GUEST_BOOKING_E2E_VERIFIED/);
  assert.match(source, /ORALYN_GUEST_BOOKING_IDEMPOTENCY_VERIFIED/);
  assert.match(source, /ORALYN_STAGING_API_COMMIT_VERIFIED/);
  assert.match(source, /ORALYN_STAGING_PORTAL_COMMIT_VERIFIED/);
  const workflowFile = join(process.cwd(), "..", ".github", "workflows", "oralyn-desktop.yml");
  const workflow = readFileSync(workflowFile, "utf8");
  assert.match(workflow, /pull-requests: read/);
  assert.match(workflow, /GITHUB_TOKEN: \$\{\{ github\.token \}\}/);
});

test("preview server stays alive for responsive and synthetic UI captures in one CI step", () => {
  const file = join(process.cwd(), "..", ".github", "workflows", "oralyn-desktop.yml");
  const source = readFileSync(file, "utf8");
  const start = source.indexOf("Start preview and capture responsive, Doctor and Assistant UI evidence");
  const end = source.indexOf("Record responsive browser acceptance gates", start);
  assert.ok(start >= 0 && end > start);
  const captureStep = source.slice(start, end);
  assert.match(captureStep, /node_modules\/\.bin\/vite preview/);
  assert.match(captureStep, /trap cleanup_preview EXIT/);
  assert.match(captureStep, /verify-portal-security-headers\.cjs/);
  assert.match(captureStep, /capture-actual-desktop\.cjs/);
  assert.match(captureStep, /capture-synthetic-doctor\.cjs/);
  assert.match(captureStep, /capture-synthetic-assistant\.cjs/);
});

test("release workflow derives live gates instead of hard-coding them true", () => {
  const file = join(process.cwd(), "..", ".github", "workflows", "oralyn-desktop.yml");
  const source = readFileSync(file, "utf8");

  assert.match(source, /verify-staging-contract\.cjs/);
  assert.doesNotMatch(
    source,
    /ORALYN_(?:BACKEND_STACK|CORS|DATABASE_IDENTITY|SECURITY_HEADERS|PATIENT_ACCOUNT_FREE|SERVICE_CATALOG_API)_VERIFIED:\s*["']true["']/,
  );
});

test("strict CSP release gate checks live patient routes and preview verification cannot overwrite it", () => {
  const workflow = readFileSync(join(process.cwd(), "..", ".github", "workflows", "oralyn-desktop.yml"), "utf8");
  const staging = readFileSync(join(process.cwd(), "scripts", "verify-staging-contract.cjs"), "utf8");
  const manifest = readFileSync(join(process.cwd(), "scripts", "write-build-manifest.cjs"), "utf8");

  assert.match(staging, /function strictPortalCsp/);
  assert.match(staging, /ORALYN_STRICT_CSP_VERIFIED/);
  assert.match(staging, /'unsafe-inline'|'unsafe-eval'/);
  assert.match(staging, /all inline scripts hash-allowlisted/);
  assert.match(staging, /all inline styles hash-allowlisted/);
  assert.match(manifest, /strict_content_security_policy_verified/);
  assert.match(manifest, /preview_security_headers_verified/);
  assert.match(manifest, /legacy_public_patient_auth_surfaces_retired_verified/);
  assert.match(staging, /ORALYN_LEGACY_PATIENT_AUTH_SURFACES_RETIRED_VERIFIED/);
  assert.match(workflow, /ORALYN_PREVIEW_SECURITY_HEADERS_VERIFIED=true/);
  assert.doesNotMatch(workflow, /echo ["']ORALYN_SECURITY_HEADERS_VERIFIED=true/);
});

test("synthetic Doctor and Assistant fixtures record PWA state without duplicating the real-browser control gate", () => {
  const doctor = readFileSync(join(process.cwd(), "scripts", "capture-synthetic-doctor.cjs"), "utf8");
  const assistant = readFileSync(join(process.cwd(), "scripts", "capture-synthetic-assistant.cjs"), "utf8");
  const realBrowser = readFileSync(join(process.cwd(), "scripts", "capture-actual-desktop.cjs"), "utf8");
  assert.ok(doctor.includes("registration?.active && registration.active.state === 'activated'"));
  assert.match(doctor, /pwa_service_worker_active=true/);
  assert.match(doctor, /pwa_service_worker_controlled=/);
  assert.doesNotMatch(doctor, /Synthetic Doctor capture is not controlled/);
  assert.ok(assistant.includes("registration?.active && registration.active.state === 'activated'"));
  assert.match(assistant, /pwa_service_worker_active=true/);
  assert.match(assistant, /pwa_service_worker_controlled=/);
  assert.doesNotMatch(assistant, /Synthetic Assistant capture is not controlled/);
  assert.ok(realBrowser.includes("Oralyn service worker activated but did not take control"));
  assert.ok(realBrowser.includes("!status.controlled"));
});;


test("real browser capture verifies public booking API origin matches the configured API", () => {
  const capture = readFileSync(join(process.cwd(), "scripts", "capture-actual-desktop.cjs"), "utf8");
  assert.ok(capture.includes('meta[name="oralyn-api-origin"]'));
  assert.ok(capture.includes("const expectedApiOrigin = new URL(apiBase).origin;"));
  assert.ok(capture.includes("Public booking API origin does not match the configured portal API"));
});


test("real browser capture verifies keyboard-visible focus and reduced-motion behavior", () => {
  const file = join(process.cwd(), "scripts", "capture-actual-desktop.cjs");
  const source = readFileSync(file, "utf8");

  assert.doesNotThrow(() => new Script(source, { filename: file }));
  assert.match(source, /async function verifyKeyboardFocus/);
  assert.ok(source.includes("Input.dispatchKeyEvent"));
  assert.ok(source.includes('active.matches(":focus-visible")'));
  assert.match(source, /visibleIndicator/);
  assert.match(source, /async function verifyReducedMotion/);
  assert.match(source, /prefers-reduced-motion/);
  assert.match(source, /keyboard_focus_doctor_login=passed/);
  assert.match(source, /keyboard_focus_assistant_login=passed/);
  assert.match(source, /keyboard_focus_guest_booking=passed/);
  assert.match(source, /reduced_motion_preference=passed/);
  assert.match(source, /accessibleName/);
  assert.match(source, /requiredLabelFields/);
  assert.match(source, /hasAssociatedLabel/);
  assert.match(source, /guest_booking_required_field_labels=passed/);
});


test("patient booking capture permits vertical scrolling when the submit action remains reachable", () => {
  const source = readFileSync(join(process.cwd(), "scripts", "capture-actual-desktop.cjs"), "utf8");
  assert.match(source, /async function verifyBookingScrollReachability/);
  assert.match(source, /window\.scrollTo\(0, scrollHeight\)/);
  assert.match(source, /submitReachable/);
  assert.match(source, /await verifyBookingScrollReachability\(height\)/);
  assert.doesNotMatch(source, /verifyNoVerticalOverflow/);
});

test("real browser capture fails before screenshot when a responsive viewport has horizontal page overflow", () => {
  const source = readFileSync(join(process.cwd(), "scripts", "capture-actual-desktop.cjs"), "utf8");
  assert.match(source, /async function verifyNoHorizontalOverflow/);
  assert.match(source, /rootScrollWidth/);
  assert.match(source, /bodyScrollWidth/);
  assert.match(source, /Math\.max\(rootScrollWidth, bodyScrollWidth\) > viewportWidth \+ 1/);
  assert.match(source, /await verifyNoHorizontalOverflow\(width\)/);
  assert.match(source, /Horizontal page overflow at/);
});


test("release manifest separately verifies HTTP BearerAuth on every protected OpenAPI operation", () => {
  const staging = readFileSync(join(process.cwd(), "scripts", "verify-staging-contract.cjs"), "utf8");
  const manifest = readFileSync(join(process.cwd(), "scripts", "write-build-manifest.cjs"), "utf8");

  assert.match(staging, /require\("\.\/openapi-security\.cjs"\)/);
  assert.match(staging, /inspectOpenApiBearerAuth\(openapi\)/);
  assert.match(staging, /bearerAuthReport\.missingProtectedOperations/);
  assert.match(staging, /ORALYN_OPENAPI_BEARER_AUTH_VERIFIED/);
  assert.match(manifest, /openapi_bearer_auth_verified/);
  assert.match(manifest, /ORALYN_OPENAPI_BEARER_AUTH_VERIFIED/);
});


test("OpenAPI BearerAuth gate covers every protected dental operation and only explicit public exceptions", () => {
  const bearer = { security: [{ BearerAuth: [] }] };
  const openapi = {
    components: {
      securitySchemes: {
        BearerAuth: { type: "http", scheme: "bearer", bearerFormat: "opaque" },
      },
    },
    paths: {
      "/v1/dental/health": { get: {} },
      "/v1/dental/auth/password/login": { post: {} },
      "/v1/dental/assistant/auth/login": { post: {} },
      "/v1/dental/public/appointments": { post: {} },
      "/v1/dental/billing/plans": { get: {} },
      "/v1/dental/billing/razorpay/webhook": { post: {} },
      "/v1/dental/workspaces/{clinic_id}/memberships": { get: bearer },
      "/v1/dental/scans/screen": { post: bearer },
      "/v1/dental/whatsapp/template": { post: bearer },
      "/v1/dental/patients/{patient_id}/chart": { get: bearer, post: bearer },
      "/v1/dental/billing/membership": { get: bearer },
      "/v1/dental/assistant/appointments": { get: bearer },
      "/v1/dental/doctor/patients/{patient_id}/documents/upload-intent": { post: bearer },
      "/v1/dental/ai/doctor/patient-summary": { post: bearer },
      "/v1/dental/auth/me": { get: bearer },
      "/v1/dental/organisations": { post: bearer },
    },
  };

  const result = inspectOpenApiBearerAuth(openapi);
  assert.equal(result.passed, true);
  assert.equal(result.expectedPublicOperationCount, 6);
  assert.equal(result.missingPublicOperations.length, 0);
  assert.equal(result.securedPublicOperations.length, 0);
  assert.equal(result.missingProtectedOperations.length, 0);
  assert.equal(result.protectedOperationCount, 11);
  assert.equal(result.verifiedProtectedOperationCount, 11);
});

test("OpenAPI BearerAuth gate fails closed for newly added protected dental routes", () => {
  const bearer = { security: [{ BearerAuth: [] }] };
  const openapi = {
    components: { securitySchemes: { BearerAuth: { type: "http", scheme: "bearer" } } },
    paths: {
      "/v1/dental/health": { get: {} },
      "/v1/dental/auth/password/login": { post: {} },
      "/v1/dental/assistant/auth/login": { post: {} },
      "/v1/dental/public/appointments": { post: {} },
      "/v1/dental/billing/plans": { get: {} },
      "/v1/dental/billing/razorpay/webhook": { post: {} },
      "/v1/dental/appointments": { get: bearer },
      "/v1/dental/appointments/{appointment_id}/reschedule": { post: {} },
    },
  };

  const result = inspectOpenApiBearerAuth(openapi);
  assert.equal(result.passed, false);
  assert.deepEqual(result.missingProtectedOperations, [
    "POST /v1/dental/appointments/{appointment_id}/reschedule",
  ]);
});

test("OpenAPI BearerAuth gate rejects a public operation that becomes protected", () => {
  const openapi = {
    components: { securitySchemes: { BearerAuth: { type: "http", scheme: "bearer" } } },
    paths: {
      "/v1/dental/health": { get: {} },
      "/v1/dental/auth/password/login": { post: {} },
      "/v1/dental/assistant/auth/login": { post: {} },
      "/v1/dental/public/appointments": { post: { security: [{ BearerAuth: [] }] } },
      "/v1/dental/billing/plans": { get: {} },
      "/v1/dental/billing/razorpay/webhook": { post: {} },
      "/v1/dental/appointments": { get: { security: [{ BearerAuth: [] }] } },
    },
  };

  const result = inspectOpenApiBearerAuth(openapi);
  assert.equal(result.passed, false);
  assert.deepEqual(result.securedPublicOperations, ["POST /v1/dental/public/appointments"]);
});


test("OpenAPI BearerAuth gate rejects anonymous OR and non-Bearer security alternatives", () => {
  const openapi = {
    components: { securitySchemes: { BearerAuth: { type: "http", scheme: "bearer" } } },
    paths: {
      "/v1/dental/health": { get: {} },
      "/v1/dental/auth/password/login": { post: {} },
      "/v1/dental/assistant/auth/login": { post: {} },
      "/v1/dental/public/appointments": { post: {} },
      "/v1/dental/billing/plans": { get: {} },
      "/v1/dental/billing/razorpay/webhook": { post: {} },
      "/v1/dental/patients": { get: { security: [{ BearerAuth: [] }, {}] } },
      "/v1/dental/appointments": { get: { security: [{ ApiKeyAuth: [] }] } },
      "/v1/dental/assistant/appointments": { get: { security: [] } },
    },
  };

  const result = inspectOpenApiBearerAuth(openapi);
  assert.equal(result.passed, false);
  assert.deepEqual(result.missingProtectedOperations, [
    "GET /v1/dental/patients",
    "GET /v1/dental/appointments",
    "GET /v1/dental/assistant/appointments",
  ]);
});
