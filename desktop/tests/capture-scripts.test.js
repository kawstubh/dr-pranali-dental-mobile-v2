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
