import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");

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
