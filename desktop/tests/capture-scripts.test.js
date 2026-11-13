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


test("synthetic Assistant capture covers reception, appointment and billing without Doctor AI APIs", () => {
  const file = join(process.cwd(), "scripts", "capture-synthetic-assistant.cjs");
  const source = readFileSync(file, "utf8");

  assert.doesNotThrow(() => new Script(source, { filename: file }));
  assert.match(source, /assistant\/auth\/login/);
  assert.match(source, /ORALYN_API_BASE = 'https:\/\/oralyn-staging-api-assistant\.onrender\.com'/);
  assert.match(source, /form\.checkValidity\(\)/);
  assert.match(source, /phone\.value = '9876543210'/);
  assert.match(source, /Synthetic Assistant patient intake did not persist in the UI/);
  assert.match(source, /assistant\/patients/);
  assert.match(source, /assistant\/appointments/);
  assert.match(source, /assistant\/billing\/invoices/);
  assert.match(source, /assistant_mobile_layout/);
  assert.match(source, /doctor_ai_api_calls=none/);
  assert.match(source, /clinical_controls=none/);
  assert.match(source, /unhandled_api_paths=none/);
});

test("Assistant intake resets the captured form after its asynchronous save", () => {
  const file = join(process.cwd(), "public", "assistant", "index.html");
  const source = readFileSync(file, "utf8");
  assert.match(source, /const form = event\.currentTarget; const data = new FormData\(form\);/);
  assert.match(source, /form\.reset\(\); await loadWorkspace\(\); showMessage\(workspaceMessage,"Patient contact saved\."/);
  assert.doesNotMatch(source, /event\.currentTarget\.reset\(\)/);
});


test("live staging contract probe writes only one idempotent synthetic booking after database identity verification", () => {
  const file = join(process.cwd(), "scripts", "verify-staging-contract.cjs");
  const source = readFileSync(file, "utf8");

  assert.doesNotThrow(() => new Script(source, { filename: file }));
  const identityGate = source.indexOf('if (health?.database_identity_verified === true && expectedApiCommit)');
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

test("release workflow derives live gates instead of hard-coding them true", () => {
  const file = join(process.cwd(), "..", ".github", "workflows", "oralyn-desktop.yml");
  const source = readFileSync(file, "utf8");

  assert.match(source, /verify-staging-contract\.cjs/);
  assert.doesNotMatch(
    source,
    /ORALYN_(?:BACKEND_STACK|CORS|DATABASE_IDENTITY|SECURITY_HEADERS|PATIENT_ACCOUNT_FREE|SERVICE_CATALOG_API)_VERIFIED:\s*["']true["']/,
  );
});
