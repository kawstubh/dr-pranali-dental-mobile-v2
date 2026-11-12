import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

test("Doctor patient directory can issue a one-time invite for a clinic record", () => {
  assert.match(source, /dentalApi\.createPatientInvite\(token, patientId\)/);
  assert.match(source, /Create invite/);
  assert.match(source, /expires in 24 hours/);
  assert.match(source, /Copy invite code/);
});

test("Doctor appointment schedule supports rescheduling and status updates", () => {
  assert.match(source, /type="datetime-local"/);
  assert.match(source, /dentalApi\.updateAppointment\(token, appointment\.id, changes\)/);
  assert.match(source, /Save changes/);
  assert.match(source, /"rescheduled"/);
});

test("Owner/admin workspace screen provisions clinic-issued doctor accounts", () => {
  assert.match(source, /dentalApi\.createDoctorAccount\(token,/);
  assert.match(source, /Create doctor account/);
  assert.match(source, /minLength=\{12\}/);
  assert.match(source, /Only an organisation owner or administrator can create doctor accounts/);
});

test("Doctor patient invite card wraps within the directory actions column", () => {
  assert.match(source, /<td className="patient-actions-cell">/);
  assert.match(styles, /\.patient-actions-cell\s*\{[^}]*white-space:\s*normal/s);
  assert.match(styles, /\.invite-code-card code\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(styles, /\.invite-code-card code\s*\{[^}]*box-sizing:\s*border-box/s);
});

test("Doctor clinical intelligence renders structured clinician-review sections", () => {
  assert.match(source, /setAiResult\(r\.result \|\| r\)/);
  assert.match(source, /className="airesult-grid"/);
  assert.match(source, /Documented findings/);
  assert.match(source, /Missing information/);
  assert.match(source, /Questions for clinician review/);
  assert.match(source, /airesult-safety/);
  assert.doesNotMatch(source, /setAiResult\(JSON\.stringify/);
});

test("Doctor identity is taken from the signed-in account, not hardcoded clinic branding", () => {
  assert.match(source, /function doctorDisplayName\(user\)/);
  assert.match(source, /function doctorRoleLabel\(user\)/);
  assert.match(source, /Good evening, \{doctorDisplayName\(user\)\}/);
  assert.match(source, /\? doctorDisplayName\(user\)/);
  assert.match(source, /\? doctorRoleLabel\(user\)/);
  assert.doesNotMatch(source, /Good evening, Dr\. Pranali/);
});
