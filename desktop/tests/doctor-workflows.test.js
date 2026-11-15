import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const captureSource = readFileSync(new URL("../scripts/capture-synthetic-doctor.cjs", import.meta.url), "utf8");

test("Doctor patient directory has no patient-account invite workflow", () => {
  assert.doesNotMatch(source, /createPatientInvite|Create invite|invite-code-card/);
  assert.doesNotMatch(captureSource, /patient-invite|SYNTHETIC-INVITE/);
  assert.match(captureSource, /patient_invite_controls=absent/);
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

test("patient directory action cell remains responsive without account-invite UI", () => {
  assert.match(source, /<td className="patient-actions-cell">/);
  assert.match(styles, /\.patient-actions-cell\s*\{[^}]*white-space:\s*normal/s);
  assert.doesNotMatch(styles, /invite-code-card/);
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
  assert.match(source, /\{greeting\}, \{doctorDisplayName\(user\)\}/);
  assert.match(source, /\{doctorDisplayName\(user\)\}/);
  assert.match(source, /\{doctorRoleLabel\(user\)\}/);
  assert.doesNotMatch(source, /Good evening, Dr\. Pranali/);
});

test("Doctor empty workspace fixture covers zero patients and zero appointments", () => {
  assert.match(captureSource, /clinic-synthetic-empty/);
  assert.match(captureSource, /patient_count: clinicId === clinicThree \? 0 : 1/);
  assert.match(captureSource, /doctor-empty-dashboard-1440x1000\.png/);
  assert.match(captureSource, /doctor-empty-patient-directory-1440x1000\.png/);
  assert.match(source, /No appointments are available for this clinic account yet/);
  assert.match(source, /No patient records are available for this clinic account\./);
});

test("Doctor synthetic browser capture covers clinical notes, treatment plans, billing and reports on desktop and mobile", () => {
  for (const route of ["/doctor/notes", "/doctor/treatments", "/doctor/billing", "/doctor/reports"]) {
    assert.ok(captureSource.includes('navigate("' + route + '"'));
  }
  for (const screen of [
    "doctor-clinical-notes-1440x1000.png",
    "doctor-clinical-notes-390x844.png",
    "doctor-treatment-plans-1440x1000.png",
    "doctor-treatment-plans-390x844.png",
    "doctor-billing-1440x1000.png",
    "doctor-billing-390x844.png",
    "doctor-reports-1440x1000.png",
    "doctor-reports-390x844.png",
  ]) assert.ok(captureSource.includes(screen), screen);
  assert.ok(captureSource.includes("No clinical notes have been recorded for this patient."));
  assert.ok(captureSource.includes("No treatment plans have been created for this patient."));
  assert.ok(captureSource.includes("No invoices have been created for this patient."));
  assert.ok(captureSource.includes("Outstanding balance"));
});

test("mobile workspace switcher prioritizes the clinic name over role text", () => {
  assert.match(source, /<option key=\{workspace\.id \|\| workspace\.clinic_id\} value=\{workspace\.id \|\| workspace\.clinic_id\}>\{workspace\.name\}<\/option>/);
  assert.doesNotMatch(source, /\{workspace\.name\} \| \{workspace\.role\}/);
  assert.match(styles, /@media \(max-width: 560px\)[\s\S]*?\.topright select \{[^}]*max-width: 128px !important/s);
});
