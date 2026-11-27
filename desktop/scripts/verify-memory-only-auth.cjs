const fs = require("node:fs");
const path = require("node:path");

const sourceDir = path.join(process.cwd(), "src");
const doctorPath = path.join(sourceDir, "main.jsx");
const assistantPath = path.join(sourceDir, "assistant.jsx");
for (const file of [doctorPath, assistantPath]) {
  if (!fs.existsSync(file)) throw new Error("Required authentication source is missing: " + file);
}
const doctor = fs.readFileSync(doctorPath, "utf8");
const assistant = fs.readFileSync(assistantPath, "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
assert(/\[\s*token\s*,\s*setToken\s*\]\s*=\s*useState\s*\(\s*["']{2}\s*\)/.test(doctor),
  "Doctor access token must remain in component memory (React state).");
assert(/\[\s*token\s*,\s*setToken\s*\]\s*=\s*useState\s*\(\s*["']{2}\s*\)/.test(assistant),
  "Assistant access token must remain in component memory (React state).");

const authStorageKey = /(?:localStorage|sessionStorage)\s*\.\s*(?:setItem|removeItem|getItem)\s*\(\s*["'`][^"'`]*(?:token|auth|access|refresh|credential)[^"'`]*["'`]/i;
for (const [label, source] of [["Doctor", doctor], ["Assistant", assistant]]) {
  assert(!authStorageKey.test(source), label + " auth tokens must not be persisted in browser storage.");
  assert(!/(?:localStorage|sessionStorage)\s*\.\s*(?:token|accessToken|refreshToken)\s*=/i.test(source),
    label + " auth tokens must not be assigned to browser storage.");
}
process.stdout.write("Doctor and Assistant access tokens are held in React memory; no auth-token browser-storage writes found.\n");
