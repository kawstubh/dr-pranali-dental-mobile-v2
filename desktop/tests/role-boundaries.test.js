import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, "..", "src", "main.jsx"), "utf8");
const patientStart = source.indexOf("function Patient(");
const patientSource = patientStart >= 0 ? source.slice(patientStart) : "";

test("global patient search is rendered only in the doctor workspace", () => {
  assert.match(source, /\{role === "doctor" && \(\s*<div className="search">/);
});

test("patient billing and documents are explicit service blockers, not fabricated records", () => {
  assert.match(patientSource, /Private document storage and invoice\/receipt APIs are not connected in this staging build/);
  assert.match(patientSource, /No patient files, balances, totals or payment statuses are fabricated/);
});

test("patient treatment journey does not imply treatment-plan CRUD is available", () => {
  assert.match(patientSource, /Treatment plans are not yet connected in this staging build/);
});

test("patient-facing application contains no AI diagnosis or self-diagnosis actions", () => {
  assert.doesNotMatch(patientSource, /AI diagnosis|self-diagnosis|diagnose yourself/i);
  assert.doesNotMatch(patientSource, /DoctorAIActionCard|IntelligenceCard/);
});