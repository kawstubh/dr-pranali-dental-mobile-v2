import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { isRuntimeEquivalentCompare } = require("../scripts/staging-commit-equivalence.cjs");

const compare = (files) => ({
  status: "ahead",
  ahead_by: files.length,
  behind_by: 0,
  too_large: false,
  files: files.map((filename) => ({ filename })),
});

test("accepts an ancestor deployment followed only by Markdown documentation changes", () => {
  assert.equal(isRuntimeEquivalentCompare(compare(["docs/DENTAL_PRIVATE_DOCUMENTS.md"])), true);
});

test("accepts Python test-only changes because they do not alter the deployed runtime", () => {
  assert.equal(isRuntimeEquivalentCompare(compare(["tests/test_dental_assistant.py"])), true);
});

test("accepts a mixed documentation and Python test-only range", () => {
  assert.equal(isRuntimeEquivalentCompare(compare([
    "docs/release.md",
    "docs/security/storage.md",
    "tests/test_dental_assistant.py",
  ])), true);
});

test("rejects runtime, configuration, non-Python test and unsafe path changes", () => {
  for (const filename of [
    "src/universal_intelligence_engine/api.py",
    "pyproject.toml",
    ".github/workflows/release.yml",
    "README.md",
    "docs/storage.py",
    "tests/test.js",
    "tests/fixtures/payload.json",
    "tests/../src/api.py",
    "tests//invalid.py",
    "../tests/test_dental_assistant.py",
  ]) {
    assert.equal(isRuntimeEquivalentCompare(compare([filename])), false, filename);
  }
});

test("rejects divergent, incomplete, truncated or malformed comparisons", () => {
  for (const value of [
    null,
    {},
    { status: "behind", ahead_by: 0, behind_by: 1, files: [{ filename: "docs/a.md" }] },
    { status: "ahead", ahead_by: 1, behind_by: 1, files: [{ filename: "docs/a.md" }] },
    { status: "ahead", ahead_by: 1, behind_by: 0, too_large: true, files: [{ filename: "docs/a.md" }] },
    { status: "ahead", ahead_by: 1, behind_by: 0, files: [] },
    { status: "ahead", ahead_by: 1, behind_by: 0, files: [{ filename: null }] },
  ]) {
    assert.equal(isRuntimeEquivalentCompare(value), false);
  }
});
