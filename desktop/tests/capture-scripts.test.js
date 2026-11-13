import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Script } from "node:vm";

test("synthetic Doctor capture script parses before browser CI executes it", () => {
  const file = join(process.cwd(), "scripts", "capture-synthetic-doctor.cjs");
  const source = readFileSync(file, "utf8");

  assert.doesNotThrow(() => new Script(source, { filename: file }));
  assert.match(source, /baseUrl \+ "\/doctor\/dashboard"/);
  assert.match(source, /Uploads, downloads and review are disabled/);
  assert.doesNotMatch(source, /Uploads, downloads, review and patient sharing are disabled/);
});

test("synthetic Doctor capture uses a safely quoted clinic workspace selector", () => {
  const file = join(process.cwd(), "scripts", "capture-synthetic-doctor.cjs");
  const source = readFileSync(file, "utf8");
  const selector = "document.querySelector('select[aria-label=\"Switch clinic workspace\"]')";

  assert.equal(source.split(selector).length - 1, 3);
});


test("real browser capture verifies Assistant login and legacy admin redirect at desktop, tablet and mobile sizes", () => {
  const file = join(process.cwd(), "scripts", "capture-actual-desktop.cjs");
  const source = readFileSync(file, "utf8");

  assert.doesNotThrow(() => new Script(source, { filename: file }));
  assert.match(source, /assistantLogin/);
  assert.match(source, /Public patient services/);
  assert.doesNotMatch(source, /Continue to patient portal/);
  assert.match(source, /patientLegacyLoginRedirect/);
  assert.match(source, /\/assistant-admin\//);
  assert.match(source, /assistant_admin_redirect_gate=passed/);
  assert.match(source, /assistant-admin-redirect-gate-1440x1000\.png/);
  assert.match(source, /assistant-admin-redirect-gate-768x1024\.png/);
  assert.match(source, /assistant-admin-redirect-gate-390x844\.png/);
  assert.match(source, /assistantManagementFormVisible/);
});


test("synthetic Assistant capture exercises memory-only login, reception and appointment workflows", () => {
  const file = join(process.cwd(), "scripts", "capture-synthetic-assistant.cjs");
  const source = readFileSync(file, "utf8");

  assert.doesNotThrow(() => new Script(source, { filename: file }));
  assert.match(source, /v1\/dental\/assistant\/auth\/login/);
  assert.match(source, /reception\.synthetic@example\.test/);
  assert.match(source, /assistant-login/);
  assert.match(source, /v1\/dental\/assistant\/auth\/logout/);
  assert.match(source, /result: patients/);
  assert.match(source, /patient-create/);
  assert.match(source, /appointment-confirm/);
  assert.match(source, /billing-read/);
  assert.match(source, /receipt-recorded/);
  assert.match(source, /assistant_receipt_recording=passed_fixture/);
  assert.match(source, /UNHANDLED_SYNTHETIC_PATH/);
  assert.match(source, /staging_assistant_login_verified=false/);
  assert.match(source, /doctor_clinical_ai_visible=false/);
  assert.match(source, /unhandled_api_paths=none/);
  assert.doesNotMatch(source, /sessionStorage\.setItem/);
});

test("Assistant intake clears contact fields after the API-backed save resolves", () => {
  const file = join(process.cwd(), "src", "assistant.jsx");
  const source = readFileSync(file, "utf8");
  assert.match(source, /setPatientForm\(\{ name: "", phone: "" \}\)/);
  assert.match(source, /Patient contact details added\./);
  assert.match(source, /assistantRequest\("\/v1\/dental\/assistant\/patients"/);
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

test("Assistant feature branch does not claim or mutate the shared staging deployment", () => {
  const file = join(process.cwd(), "..", ".github", "workflows", "oralyn-desktop.yml");
  const source = readFileSync(file, "utf8");
  assert.ok(source.includes("Record inherited staging evidence for non-canonical feature branches"));
  assert.ok(source.includes("ORALYN_STAGING_CONTRACT_INHERITED_FROM_BASE=true"));
  assert.ok(source.includes("github.event.pull_request.head.ref != 'feat/oralyn-desktop-app'"));
  assert.ok(source.includes("github.event.pull_request.head.ref == 'feat/oralyn-desktop-app'"));
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
