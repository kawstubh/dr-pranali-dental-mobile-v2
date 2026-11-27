import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const apiSource = readFileSync(new URL("../src/api.js", import.meta.url), "utf8");
const activationSource = readFileSync(
  new URL("../src/OwnerActivation.jsx", import.meta.url),
  "utf8",
);
const mainSource = readFileSync(
  new URL("../src/main.jsx", import.meta.url),
  "utf8",
);

test("owner activation page submits the one-time public activation token", () => {
  assert.match(apiSource, /publicOwnerActivate:\s*\(body\)\s*=>\s*request\("\/v1\/dental\/public\/owner-activate"/);
  assert.match(activationSource, /new URLSearchParams\(window\.location\.search\)\.get\("token"\)/);
  assert.match(activationSource, /dentalApi\.publicOwnerActivate\(\{ token, password \}\)/);
  assert.match(activationSource, /password\.length < 12/);
  assert.match(activationSource, /password !== confirmPassword/);
  assert.match(activationSource, /expires after 24 hours and can be used only once/);
});

test("owner activation is a dedicated public route, separate from patient routes", () => {
  assert.match(mainSource, /normalizedPath === "\/owner-activate"/);
  assert.match(mainSource, /<OwnerActivation \/>/);
  assert.doesNotMatch(activationSource, /patient login|patient portal|AI diagnosis/i);
});
