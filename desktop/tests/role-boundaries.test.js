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

test("authenticated users cannot switch into another role without signing out", () => {
  assert.match(source, /className="workspace-chip" aria-label=\{role === "doctor" \? "Doctor portal" : "Patient portal"\}/);
  assert.doesNotMatch(source, /<select\s+value=\{role\}/);
  assert.match(source, /onPatient=\{\(\) => \{\s*R\("patient"\)/);
  assert.match(source, /onDoctor=\{\(\) => \{\s*R\("doctor"\)/);
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
  assert.match(careSource, /private storage/);
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

test("patient API expiry clears only the patient Supabase session and linked clinic context", () => {
  assert.match(apiSource, /oralyn:patient-session-expired/);
  assert.match(source, /window\.addEventListener\("oralyn:patient-session-expired"/);
  assert.match(source, /supabase\?\.auth\.signOut\(\{ scope: "local" \}\)/);
  assert.match(source, /localStorage\.removeItem\("oralyn_patient_record_id"\)/);
  assert.match(source, /Your patient session has expired\. Please sign in again\./);
});

test("patient-facing application contains no AI diagnosis or self-diagnosis actions", () => {
  assert.doesNotMatch(patientSource, /AI diagnosis|self-diagnosis|diagnose yourself/i);
  assert.doesNotMatch(patientSource, /DoctorAIActionCard|IntelligenceCard/);
});

test("authenticated patient booking, linking and chart reads stay outside the AI route namespace", () => {
  assert.match(apiSource, /patientLink: \(token, invite_code\)[\s\S]*?\/v1\/dental\/patient\/link/);
  assert.match(apiSource, /patientRequestAppointment: \(token, patientId, body\)[\s\S]*?\/v1\/dental\/patient\/appointments/);
  assert.match(apiSource, /patientChart: \(token, patientId\)[\s\S]*?\/v1\/dental\/patient\/chart/);
  assert.doesNotMatch(apiSource, /\/v1\/dental\/ai\/patient\/(?:link|appointments|chart)/);
  assert.match(patientSource, /patientRequestAppointment\(\s*patientSession\.access_token/);
  assert.match(patientSource, /patientSession\?\.access_token/);
});

test("clinic and patient record changes clear prior tenant-scoped data before the new scope renders", () => {
  const workspaceStart = source.indexOf("const switchWorkspace = async");
  const workspaceEnd = source.indexOf("const activeWorkspace =", workspaceStart);
  assert.ok(workspaceStart >= 0 && workspaceEnd > workspaceStart);
  const workspaceSwitch = source.slice(workspaceStart, workspaceEnd);
  assert.ok(workspaceSwitch.indexOf("setPatients([])") < workspaceSwitch.indexOf("setToken(accessToken)"));
  assert.ok(workspaceSwitch.indexOf("setAppointments([])") < workspaceSwitch.indexOf("setToken(accessToken)"));
  assert.ok(workspaceSwitch.indexOf("F({})") < workspaceSwitch.indexOf("setToken(accessToken)"));

  const selectStart = source.indexOf("const selectPatientRecord =");
  const selectEnd = source.indexOf("const linkPatient =", selectStart);
  assert.ok(selectStart >= 0 && selectEnd > selectStart);
  const selection = source.slice(selectStart, selectEnd);
  assert.ok(selection.indexOf("setPatientAppointments([])") < selection.indexOf("setSelectedPatientRecordId("));
  assert.ok(selection.indexOf("setPatientChart([])") < selection.indexOf("setSelectedPatientRecordId("));
  assert.match(careSource, /loadedScope !== scopeKey/);
  assert.match(careSource, /const scopeKey = .*patientId/);
});

test("linked patient booking is attached to the verified record while guest intake stays separate", () => {
  assert.match(patientSource, /patientRequestAppointment\(/);
  assert.match(patientSource, /patientSession\?\.access_token/);
  assert.match(patientSource, /publicAppointment\(/);
  assert.match(patientSource, /Link your clinic record before booking/);
  assert.match(apiSource, /patientRequestAppointment: \(token, patientId, body\)/);
});

test("patient record selection persistence is bound to the Supabase user identity", () => {
  assert.match(source, /oralyn_patient_record_user_id/);
  assert.match(source, /storedOwnerId !== patientUserId/);
  assert.match(source, /localStorage\.removeItem\("oralyn_patient_record_user_id"\)/);
});

test("private clinical documents require a doctor review before patient sharing", () => {
  assert.match(apiSource, /reviewDocument: \(token, documentId\)[\s\S]*?\/v1\/dental\/doctor\/documents\/[\s\S]*?\/review/);
  assert.match(careSource, /dentalApi\.reviewDocument\(token, document\.id\)/);
  assert.match(careSource, /Mark as reviewed/);
  assert.match(careSource, /document\.status === "available" && !document\.reviewed_at/);
  assert.match(careSource, /document\.status === "available" && document\.reviewed_at &&/);
  assert.match(careSource, /A doctor must review each file before patient sharing is enabled/);
});

test("doctor patient invitations use a clinic-scoped non-AI management route", () => {
  assert.match(apiSource, /createPatientInvite:[\\s\\S]*?\\/v1\\/dental\\/doctor\\/patients\\/.*?\\/invite/);
  assert.doesNotMatch(apiSource, /\\/v1\\/dental\\/ai\\/doctor\\/patients\\/.*?\\/invite/);
});
