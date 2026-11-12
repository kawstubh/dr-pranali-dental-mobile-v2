const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("synthetic Doctor capture script parses before browser CI executes it", () => {
  const file = path.join(process.cwd(), "scripts", "capture-synthetic-doctor.cjs");
  const source = fs.readFileSync(file, "utf8");

  assert.doesNotThrow(() => new vm.Script(source, { filename: file }));
});

test("synthetic Doctor capture uses a safely quoted clinic workspace selector", () => {
  const file = path.join(process.cwd(), "scripts", "capture-synthetic-doctor.cjs");
  const source = fs.readFileSync(file, "utf8");
  const selector = "document.querySelector('select[aria-label=\"Switch clinic workspace\"]')";

  assert.equal(source.split(selector).length - 1, 2);
});
