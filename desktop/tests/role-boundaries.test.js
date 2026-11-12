import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const source = fs.readFileSync(path.join(root, "src", "main.jsx"), "utf8");
const patientStart = source.indexOf("function Patient(");
const patientSource = patientStart >= 0 ? source.slice(patientStart) : "";
const careSource = fs.readFileSync(path.join(root, "src", "careScreens.jsx"), "utf8");
const apiSource = fs.readFileSync(path.join(root, "src", "api.js"), "utf8");

test("global patient search is rendered only in the doctor workspace", () => {
  assert.match(source, /\{role === "doctor" && \(\s*<div className="search">/);
});

test("patient billing and documents use authenticated, patient-scoped APIs", () => {
  assert.match(patientSource, /PatientCareManagement page=\{page\}/);
  assert.match(careSource, /patientInvoices\(session\.access_token, patientId\)/);
  assert.match(careSource, /patientReceipts\(session\.access_token, patientId\)/);
  assert.match(careSource, /patientDocuments\(session\.access_token, patientId\)/);
  assert.match(careSource, /patientDocumentDownloadIntent/);
  assert.match(apiSource, /\/v1\/dental\/patient\/documents/);
});

test("treatment plans are persisted and shared only through explicit doctor actions", () => {
  assert.match(careSource, /createTreatmentPlan\(token, activePatient\.id/);
  assert.match(careSource, /updateTreatmentPlan\(token, plan\.id/);
  assert.match(careSource, /patient_visible: true/);
  assert.match(careSource, /patientTreatmentPlans\(session\.access_token, patientId\)/);
  assert.match(apiSource, /\/v1\/dental\/doctor\/patients/);
});

test("invoice creation, issue and receipt actions use idempotent server APIs", () => {
  assert.match(careSource, /idempotency_key: idempotencyKey\("oralyn-invoice"\)/);
  assert.match(careSource, /issueInvoice\(token, invoice\.id/);
  assert.match(careSource, /recordInvoiceReceipt\(token, invoice\.id/);
  assert.match(careSource, /amount_paise: Math\.round\(amount \* 100\)/);
});

test("private documents use checksum verification and direct signed object upload", () => {
  assert.match(careSource, /SHA-256/);
  assert.match(careSource, /createDocumentUploadIntent/);
  assert.match(careSource, /method: "PUT"/);
  assert.match(careSource, /completeDocumentUpload/);
  assert.match(careSource, /setDocumentVisibility/);
  assert.match(careSource, /private object bucket/);
  assert.doesNotMatch(careSource, /localStorage\.setItem\([^\n]*document/i);
});

test("patient clinic switching selects a linked patient record and never trusts an arbitrary id", () => {
  assert.match(source, /patientLinkedRecords\(patientSession\.access_token\)/);
  assert.match(source, /PATIENT_RECORD_SELECTION_REQUIRED|selectedPatientRecordId/);
  assert.match(source, /patient_id/);
  assert.match(source, /oralyn_patient_record_id/);
  assert.match(apiSource, /patientLinkedRecords/);
  assert.match(apiSource, /patientAppointments: \(token, patientId\)/);
});

test("doctor API session expiry clears the saved doctor identity without touching patient auth", () => {
  assert.match(apiSource, /oralyn:doctor-session-expired/);
  assert.match(source, /window\.addEventListener\("oralyn:doctor-session-expired"/);
  assert.match(source, /localStorage\.removeItem\("oralyn_doctor_token"\)/);
  assert.match(source, /Your clinic session has expired\. Please sign in again\./);
  assert.match(apiSource, /isPatientApi/);
});

test("patient-facing application contains no AI diagnosis or self-diagnosis actions", () => {
  assert.doesNotMatch(patientSource, /AI diagnosis|self-diagnosis|diagnose yourself/i);
  assert.doesNotMatch(patientSource, /DoctorAIActionCard|IntelligenceCard/);
});
