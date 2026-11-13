import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const api = fs.readFileSync(path.join(root, "src", "api.js"), "utf8");
const care = fs.readFileSync(path.join(root, "src", "careScreens.jsx"), "utf8");
const main = fs.readFileSync(path.join(root, "src", "main.jsx"), "utf8");
const patientHome = fs.readFileSync(path.join(root, "public", "patient", "home", "index.html"), "utf8");
const patientBooking = fs.readFileSync(path.join(root, "public", "patient", "booking", "index.html"), "utf8");

test("clinical notes use doctor-scoped APIs and optimistic version checks", () => {
  assert.ok(api.includes("/doctor/patients/${encodeURIComponent(patientId)}/clinical-notes"));
  assert.ok(api.includes("/doctor/clinical-notes/${encodeURIComponent(noteId)}"));
  assert.ok(care.includes("expected_version: note.version"));
  assert.doesNotMatch(care, /patient_visible:\s*!note\.patient_visible/);
  assert.doesNotMatch(care, /Share with patient|Withdraw patient access/);
  assert.ok(care.includes("New notes are private to the clinic by default."));
});

test("private clinical notes remain Doctor-only in the account-free patient journey", () => {
  assert.ok(api.includes("/doctor/patients/${encodeURIComponent(patientId)}/clinical-notes"));
  assert.ok(!api.includes("/patient/clinical-notes"));
  assert.ok(!api.includes("patientClinicalNotes:"));
  assert.ok(main.includes("isDisabledPatientRoute"));
  assert.ok(main.includes("/patient/home/"));
});

test("clinic messages remain Doctor-authenticated; no patient account messaging API is shipped", () => {
  assert.ok(api.includes("/doctor/patients/${encodeURIComponent(patientId)}/messages"));
  assert.ok(api.includes("doctorMessages:"));
  assert.ok(api.includes("sendDoctorMessage:"));
  assert.ok(!api.includes("/patient/messages"));
  assert.ok(!api.includes("patientMessages:"));
  assert.ok(!api.includes("sendPatientMessage:"));
  assert.ok(care.includes("dentalApi.doctorMessages(authToken, recordId)"));
  assert.ok(care.includes("dentalApi.sendDoctorMessage(authToken, recordId"));
});

test("portal keeps clinical navigation in Doctor workspace and patient navigation account-free", () => {
  assert.ok(main.includes('["notes", "Clinical notes", FileText]'));
  assert.ok(main.includes('["files", "Private documents", FileText]'));
  assert.ok(main.includes('["messages", "Patient messages", MessageCircle]'));
  assert.ok(patientHome.includes('href="/patient/booking/"'));
  assert.ok(patientHome.includes("No patient account, password or OTP is needed."));
  assert.ok(patientBooking.includes("/v1/dental/public/appointments"));
  assert.ok(!main.includes("function Patient("));
  assert.ok(!main.includes('["messages", "Clinic messages", MessageCircle]'));
});

test("public patient experience does not expose diagnosis or clinical decision-support actions", () => {
  assert.ok(main.includes("Patient-facing AI diagnosis and self-diagnosis are not available."));
  assert.ok(!api.includes("/patient/messages"));
  assert.ok(!api.includes("/patient/clinical-notes"));
});




test("legacy patient paths redirect to the public account-free landing or booking page", () => {
  assert.ok(main.includes("isDisabledPatientRoute"));
  assert.ok(main.includes('"/patient/home/"'));
  assert.ok(main.includes('"/patient/booking/"'));
});
