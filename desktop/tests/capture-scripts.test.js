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


test("real browser capture verifies the gated Assistant admin page at desktop, tablet and mobile sizes", () => {
  const file = join(process.cwd(), "scripts", "capture-actual-desktop.cjs");
  const source = readFileSync(file, "utf8");

  assert.doesNotThrow(() => new Script(source, { filename: file }));
  assert.match(source, /\/assistant-admin\//);
  assert.match(source, /assistant_admin_gate=passed/);
  assert.match(source, /assistant-admin-gate-1440x1000\.png/);
  assert.match(source, /assistant-admin-gate-768x1024\.png/);
  assert.match(source, /assistant-admin-gate-390x844\.png/);
  assert.match(source, /adminWorkspaceHidden/);
  assert.match(source, /createFormVisible/);
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


test("live staging contract probe is read-only and verifies the deployed commit identities", () => {
  const file = join(process.cwd(), "scripts", "verify-staging-contract.cjs");
  const source = readFileSync(file, "utf8");

  assert.doesNotThrow(() => new Script(source, { filename: file }));
  assert.match(source, /method: "OPTIONS"/);
  assert.doesNotMatch(source, /method: "POST"/);
  assert.match(source, /database_identity_verified/);
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
