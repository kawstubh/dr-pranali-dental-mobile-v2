import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Script } from "node:vm";

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
  assert.match(source, /oralyn-logo-approved\.webp/);
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

test("live staging contract probe writes only one idempotent synthetic booking after database identity verification", () => {
  const file = join(process.cwd(), "scripts", "verify-staging-contract.cjs");
  const source = readFileSync(file, "utf8");

  assert.doesNotThrow(() => new Script(source, { filename: file }));
  const identityGate = source.indexOf('if (health?.database_identity_verified === true && branchIdentityOk && expectedApiCommit)');
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
