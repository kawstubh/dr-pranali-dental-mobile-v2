import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const careSource = fs.readFileSync(path.join(root, "src", "careScreens.jsx"), "utf8");
const apiSource = fs.readFileSync(path.join(root, "src", "api.js"), "utf8");
const mainSource = fs.readFileSync(path.join(root, "src", "main.jsx"), "utf8");

test("patient-specific record viewers and patient-authenticated messaging are not shipped", () => {
  assert.doesNotMatch(careSource, /PatientCareManagement/);
  assert.doesNotMatch(careSource, /dentalApi\.patient(?:TreatmentPlans|ClinicalNotes|Invoices|Receipts|Documents|DocumentDownloadIntent|Messages)/);
  assert.doesNotMatch(careSource, /session\?\.access_token|sendPatientMessage|patientMessages/);
  assert.doesNotMatch(apiSource, /patientLink:|patientLinkedRecords:|patientTreatmentPlans:|patientClinicalNotes:|patientInvoices:|patientReceipts:|patientDocuments:|patientMessages:/);
  assert.doesNotMatch(mainSource, /PatientCareManagement|session=\{patientSession\}|patientId=\{selectedPatientRecordId\}/);
});

test("clinic communication is Doctor-authenticated and uses only Doctor message APIs", () => {
  assert.match(careSource, /export function PatientCommunication\(\{ token, activePatient \}\)/);
  assert.match(careSource, /dentalApi\.doctorMessages\(authToken, recordId\)/);
  assert.match(careSource, /dentalApi\.sendDoctorMessage\(authToken, recordId/);
  assert.doesNotMatch(careSource, /dentalApi\.patientMessages|dentalApi\.sendPatientMessage/);
  assert.match(mainSource, /<PatientCommunication token=\{token\} activePatient=\{activePatient\} \/>/);
  assert.match(apiSource, /doctorMessages:/);
  assert.match(apiSource, /sendDoctorMessage:/);
});
