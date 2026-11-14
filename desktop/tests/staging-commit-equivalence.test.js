import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { isDocsOnlyCompare } = require("../scripts/staging-commit-equivalence.cjs");

test("accepts an ancestor deployment followed only by Markdown documentation changes", () => {
  assert.equal(isDocsOnlyCompare({
    status: "ahead",
    ahead_by: 1,
    behind_by: 0,
    too_large: false,
    files: [{ filename: "docs/DENTAL_PRIVATE_DOCUMENTS.md", status: "modified" }],
  }), true);
});

test("accepts multiple Markdown files only under docs/", () => {
  assert.equal(isDocsOnlyCompare({
    status: "ahead",
    ahead_by: 2,
    behind_by: 0,
    files: [
      { filename: "docs/release.md" },
      { filename: "docs/security/storage.md" },
    ],
  }), true);
});

test("rejects any runtime or configuration change in the deployed-to-PR range", () => {
  for (const filename of [
    "src/universal_intelligence_engine/api.py",
    "pyproject.toml",
    ".github/workflows/release.yml",
    "README.md",
    "docs/storage.py",
  ]) {
    assert.equal(isDocsOnlyCompare({
      status: "ahead",
      ahead_by: 1,
      behind_by: 0,
      files: [{ filename }],
    }), false, filename);
  }
});

test("rejects divergent, incomplete, truncated or malformed comparisons", () => {
  for (const compare of [
    null,
    {},
    { status: "behind", ahead_by: 0, behind_by: 1, files: [{ filename: "docs/a.md" }] },
    { status: "ahead", ahead_by: 1, behind_by: 1, files: [{ filename: "docs/a.md" }] },
    { status: "ahead", ahead_by: 1, behind_by: 0, too_large: true, files: [{ filename: "docs/a.md" }] },
    { status: "ahead", ahead_by: 1, behind_by: 0, files: [] },
    { status: "ahead", ahead_by: 1, behind_by: 0, files: [{ filename: "docs/../src/app.py" }] },
    { status: "ahead", ahead_by: 1, behind_by: 0, files: [{ filename: "../docs/a.md" }] },
  ]) {
    assert.equal(isDocsOnlyCompare(compare), false);
  }
});
