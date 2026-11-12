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
const bookingSource = fs.readFileSync(path.join(root, "public", "patient", "booking", "index.html"), "utf8");

test("global patient search is rendered only in the Doctor workspace", () => {
  assert.match(source, /\{role === "doctor" && \(\s*<div className="search">/);
});

test("Doctor workspace still requires a verified Doctor session", () => {
  assert.match(source, /if \(role === "doctor" && \(!user \|\| booting\)\)/);
  assert.match(source, /dentalApi\.me\(token\)/);
  assert.match(source, /Your session expired\. Please sign in again\./);
  assert.match(source, /window\.addEventListener\("oralyn:doctor-session-expired"/);
});

test("Patient portal is account-free and exposes only public home and booking navigation", () => {
  assert.match(source, /\["home", "Home", LayoutDashboard\]/);
  assert.match(source, /\["booking", "Book appointment", CalendarDays\]/);
  const navStart = source.indexOf("const patientNav = [");
  const navEnd = source.indexOf("const nav = role ===", navStart);
  const patientNav = source.slice(navStart, navEnd);
  assert.doesNotMatch(patientNav, /\["appointments", "Appointments", CalendarDays\]/);
  assert.doesNotMatch(source, /\["journey", "Treatment journey"/);
  assert.doesNotMatch(source, /\["records", "Records & prescriptions"/);
  assert.doesNotMatch(source, /\["invoices", "Invoices & payments"/);
  assert.doesNotMatch(source, /\["settings", "Account settings"/);
  assert.doesNotMatch(source, /return\s*\(\s*<PatientAccessScreen/);
  assert.doesNotMatch(source, /supabase\.auth/);
});

test("Patient landing page explains no account is needed and sends visitors to guest booking", () => {
  assert.match(patientSource, /if \(page !== "booking"\)/);
  assert.match(patientSource, /No patient account or password is needed/);
  assert.match(patientSource, /P\("booking"\)/);
  assert.match(patientSource, /Your clinical records, prescriptions and invoices remain private/);
});

test("guest booking collects minimum contact details and uses public appointment intake", () => {
  assert.match(patientSource, /Your full name/);
  assert.match(patientSource, /Mobile number/);
  assert.match(patientSource, /dentalApi\.publicAppointment\(/);
  assert.match(apiSource, /publicAppointment:/);
  assert.match(patientSource, /Request received/);
});

test("guest booking sends a stable idempotency key and validates future IST time", () => {
  assert.match(bookingSource, /idempotency_key:\\s*idempotencyKey/);
  assert.match(bookingSource, /oralyn_public_booking_idempotency/);
  assert.match(bookingSource, /Asia\\/Kolkata/);
  assert.match(bookingSource, /India Standard Time/);
  assert.match(bookingSource, /startsAt <= new Date\\(\\)/);
  assert.match(bookingSource, /intelligence_request:\\s*false/);
});

test("patient private records are not rendered in the public account-free experience", () => {
  const landingIndex = patientSource.indexOf('if (page !== "booking")');
  const bookingIndex = patientSource.indexOf('if (page === "booking")');
  assert.ok(landingIndex >= 0 && bookingIndex > landingIndex);
  assert.match(patientSource.slice(0, bookingIndex), /Your clinical records, prescriptions and invoices remain private/);
  assert.match(source, /const patientNav = \[/);
  assert.match(source, /\["booking", "Book appointment", CalendarDays\]/);
});

test("Doctor clinical records remain scoped to Doctor-authenticated APIs", () => {
  assert.match(apiSource, /doctorTreatmentPlans:/);
  assert.match(apiSource, /doctorInvoices:/);
  assert.match(apiSource, /createDocumentUploadIntent/);
  assert.match(careSource, /createTreatmentPlan\(token, activePatient\.id/);
  assert.match(careSource, /createInvoice\(token, activePatient\.id/);
});

test("Doctor-only intelligence is not exposed in the Patient component", () => {
  assert.doesNotMatch(patientSource, /DoctorAIActionCard|IntelligenceCard|clinical intelligence/i);
  assert.doesNotMatch(patientSource, /AI diagnosis|self-diagnosis|diagnose yourself/i);
});

test("private clinical documents require Doctor review before any future patient sharing", () => {
  assert.match(apiSource, /reviewDocument:/);
  assert.match(careSource, /Mark as reviewed/);
  assert.match(careSource, /A doctor must review each file before patient sharing is enabled/);
});

test("patient session and account-linking flows are not required or initialized", () => {
  assert.doesNotMatch(source, /supabase\.auth/);
  assert.doesNotMatch(source, /patientAccess/);
  assert.doesNotMatch(source, /patientLinkedRecords\(patientSession/);
  assert.match(source, /setPatientSession\(null\)/);
  assert.match(source, /setPatientBoot\(false\)/);
});

test("public patient booking remains separate from Doctor identity and tenant APIs", () => {
  assert.match(patientSource, /dentalApi\.publicAppointment\(/);
  assert.match(apiSource, /publicAppointment:/);
  assert.match(apiSource, /appointments: \(token\) => request\("\/v1\/dental\/appointments", \{ token \}\)/);
  assert.doesNotMatch(patientSource, /dentalApi\.patients\(/);
  assert.doesNotMatch(patientSource, /dentalApi\.patientChart\(/);
});
