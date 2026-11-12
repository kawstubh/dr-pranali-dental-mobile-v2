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

test("clinical notes use doctor-scoped APIs and optimistic version checks", () => {
  assert.ok(api.includes("/doctor/patients/${encodeURIComponent(patientId)}/clinical-notes"));
  assert.ok(api.includes("/doctor/clinical-notes/${encodeURIComponent(noteId)}"));
  assert.ok(care.includes("expected_version: note.version"));
  assert.ok(care.includes("patient_visible: !note.patient_visible"));
  assert.ok(care.includes("New notes are private to the clinic by default."));
});

test("patient clinical notes are fetched only through the patient-authenticated linked-record API", () => {
  assert.ok(api.includes("/patient/clinical-notes${query({ patient_id: patientId })}"));
  assert.ok(care.includes("dentalApi.patientClinicalNotes(session.access_token, patientId)"));
  assert.ok(care.includes("Clinical notes shared by your clinic"));
});

test("clinic messages use separate doctor and patient identity-scoped routes", () => {
  assert.ok(api.includes("/doctor/patients/${encodeURIComponent(patientId)}/messages"));
  assert.ok(api.includes("/patient/messages${query({ patient_id: patientId })}"));
  assert.ok(care.includes("dentalApi.doctorMessages(authToken, recordId)"));
  assert.ok(care.includes("dentalApi.patientMessages(authToken, recordId)"));
  assert.ok(care.includes("dentalApi.sendDoctorMessage(authToken, recordId"));
  assert.ok(care.includes("dentalApi.sendPatientMessage(authToken, recordId"));
});

test("portal exposes notes, private documents and clinic messaging in the correct role navigation", () => {
  assert.ok(main.includes('["notes", "Clinical notes", FileText]'));
  assert.ok(main.includes('["files", "Private documents", FileText]'));
  assert.ok(main.includes('["messages", "Patient messages", MessageCircle]'));
  assert.ok(main.includes('["messages", "Clinic messages", MessageCircle]'));
  assert.ok(main.includes('page === "settings"'));
});

test("patient messaging does not add diagnosis or clinical decision-support actions", () => {
  assert.ok(!/patient.*(diagnos|triage|clinical recommendation)/i.test(care));
  assert.ok(main.includes("Patient-facing AI diagnosis and self-diagnosis are not available."));
});

test("patient treatment journey owns and resets its shared clinical-note state", () => {
  const start = care.indexOf("export function PatientCareManagement");
  const end = care.indexOf("export function DoctorClinicalNotes", start);
  assert.ok(start >= 0 && end > start, "PatientCareManagement component must exist");
  const patientCare = care.slice(start, end);
  assert.match(patientCare, /const \[clinicalNotes, setClinicalNotes\] = useState\(\[\]\)/);
  assert.match(patientCare, /const \[notesError, setNotesError\] = useState\("?"?\)/);
  assert.match(patientCare, /setClinicalNotes\(\[\]\)/);
  assert.match(patientCare, /setNotesError\(/);
  assert.match(patientCare, /clinicalNotes\.length/);
  assert.match(patientCare, /notesError \|\|/);
});

test("patient-scoped records and clinic messages hide prior patient data while a new scope loads", () => {
  assert.match(care, /const scopeKey = .*patientId/);
  assert.match(care, /setLoadedScope\(""\)/);
  assert.match(care, /loadedScope !== scopeKey/);
  assert.match(care, /setPlans\(\[\]\)/);
  assert.match(care, /setInvoices\(\[\]\)/);
  assert.match(care, /setDocuments\(\[\]\)/);
  assert.match(care, /setMessages\(\[\]\)/);
  assert.match(care, /setDraft\(""\)/);
});
