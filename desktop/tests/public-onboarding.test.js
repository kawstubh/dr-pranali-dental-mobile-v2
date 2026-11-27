import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const demo = await readFile(
  new URL("../public/demo/index.html", import.meta.url),
  "utf8",
);
const activation = await readFile(
  new URL("../public/owner-activate/index.html", import.meta.url),
  "utf8",
);

test("public clinic demo intake is account-free and uses the anonymous API", () => {
  assert.match(demo, /\/v1\/dental\/public\/demo-requests/);
  assert.match(demo, /idempotency_key/);
  assert.match(demo, /clinic_name/);
  assert.match(demo, /owner_name/);
  assert.match(demo, /type="email"/);
  assert.match(demo, /name="website"/);
  assert.match(demo, /credentials:"omit"/);
  assert.match(demo, /trial starts only after the workspace is provisioned/i);
  assert.doesNotMatch(demo, /<input[^>]+type=["']password/i);
  assert.doesNotMatch(demo, /name=["'](?:otp|verification_code)["']/i);
});

test("owner activation consumes only the one-time token and never asks for clinic identity", () => {
  assert.match(activation, /\/v1\/dental\/public\/owner-activate/);
  assert.match(activation, /URLSearchParams\(window\.location\.search\)/);
  assert.match(activation, /history\.replaceState/);
  assert.match(activation, /minlength="12"/);
  assert.match(activation, /password!==confirm/);
  assert.match(activation, /credentials:"omit"/);
  assert.match(activation, /This one-time activation link is valid for 24 hours/i);
});
