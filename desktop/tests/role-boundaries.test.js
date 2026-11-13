import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { resolvePortalRoute } from "../src/routing.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const source = fs.readFileSync(path.join(root, "src", "main.jsx"), "utf8");
const patientStart = source.indexOf("function Patient(");
const patientSource = patientStart >= 0 ? source.slice(patientStart) : "";
const careSource = fs.readFileSync(path.join(root, "src", "careScreens.jsx"), "utf8");
const apiSource = fs.readFileSync(path.join(root, "src", "api.js"), "utf8");
const assistantAppSource = fs.readFileSync(path.join(root, "src", "assistant.jsx"), "utf8");
const bookingSource = fs.readFileSync(path.join(root, "public", "patient", "booking", "index.html"), "utf8");
const viteSource = fs.readFileSync(path.join(root, "vite.config.js"), "utf8");
const packageManifest = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const patientHomeSource = fs.readFileSync(path.join(root, "public", "patient", "home", "index.html"), "utf8");


test("global patient search is rendered only in the Doctor workspace", () => {
  assert.match(source, /\{role === "doctor" && \(\s*<div className="search">/);
});

test("legacy patient login routes redirect to the public patient journey", () => {
  const route = resolvePortalRoute("/patient/login");
  assert.equal(route.role, "doctor");
  assert.equal(route.redirectTo, "/patient/home/");
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
  assert.doesNotMatch(source, /PatientAccessScreen|Create your patient account|Sign in to patient portal/);
  assert.doesNotMatch(source, /supabase\.auth/);
});

test("public patient pages ship without Supabase or patient account credentials", () => {
  assert.equal(packageManifest.dependencies?.["@supabase/supabase-js"], undefined);
  assert.equal(fs.existsSync(path.join(root, "src", "supabase.js")), false);
  for (const page of [patientHomeSource, bookingSource]) {
    assert.doesNotMatch(page, /<input\b[^>]*type=["']password/i);
    assert.doesNotMatch(page, /patient\/(?:login|signup|register)/i);
    assert.doesNotMatch(page, /supabase/i);
  }
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
  assert.match(bookingSource, /idempotency_key:\s*idempotencyKey/);
  assert.match(bookingSource, /oralyn_public_booking_idempotency/);
  assert.match(bookingSource, /Asia\/Kolkata/);
  assert.match(bookingSource, /India Standard Time/);
  assert.match(bookingSource, /startsAt <= new Date\(\)/);
  assert.match(bookingSource, /intelligence_request:\s*false/);
  assert.match(bookingSource, /dateInput\.setAttribute\("min", localToday\)/);
  assert.match(bookingSource, /All appointment times are shown in India Standard Time/);
  assert.match(bookingSource, /validateIndianMobile/);
  assert.match(bookingSource, /10-digit Indian mobile number/);
  assert.match(bookingSource, /id="phone-error"/);
  assert.doesNotMatch(bookingSource, /name="note"/);
  assert.match(bookingSource, /name="date" id="date" type="date" required/);
  assert.match(bookingSource, /dateInput\.min = localToday/);
  assert.match(bookingSource, /form\.addEventListener\("invalid"/);
  assert.match(bookingSource, /name="phone" id="phone" type="tel"/);
});

test("patient private records are not rendered in the public account-free experience", () => {
  const landingIndex = patientSource.indexOf('if (page !== "booking")');
  const bookingIndex = patientSource.indexOf('if (page === "booking")');
  assert.ok(landingIndex >= 0 && bookingIndex > landingIndex);
  assert.match(patientSource.slice(0, bookingIndex), /Your clinical records, prescriptions and invoices remain private/);
  assert.match(source, /const patientNav = \[/);
  assert.match(source, /\["booking", "Book appointment", CalendarDays\]/);
});



test("Doctor patient directory has no patient-account invitation action", () => {
  assert.doesNotMatch(source, /createPatientInvite|Create invite|invite-code-card/);
  assert.doesNotMatch(apiSource, /createPatientInvite/);
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

test("private document actions remain fail-closed until storage and malware scanning are verified", () => {
  assert.match(careSource, /VITE_PRIVATE_DOCUMENT_STORAGE_READY/);
  assert.match(careSource, /VITE_DOCUMENT_MALWARE_SCANNING_READY/);
  assert.match(careSource, /PRIVATE_DOCUMENTS_READY/);
  assert.match(careSource, /Uploads, downloads, review and patient sharing are disabled/);
  assert.match(careSource, /PRIVATE_DOCUMENTS_READY && document\.status === "available"/);
  assert.match(apiSource, /createDocumentUploadIntent/);
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




test("Clinic Assistant has a distinct route, identity and session namespace", () => {
  assert.ok(source.includes('import AssistantApp, { AssistantManagement } from "./assistant.jsx";'));
  assert.ok(source.includes("isAssistantRoute"));
  assert.ok(assistantAppSource.includes("/v1/dental/auth/assistant/login"));
  assert.ok(!assistantAppSource.includes("sessionStorage"));
  assert.ok(!assistantAppSource.includes("localStorage"));
  assert.ok(assistantAppSource.includes('role !== "assistant"'));
});

test("Clinic Assistant UI calls only its dedicated reception and assistant-auth API namespace", () => {
  const apiPaths = [...assistantAppSource.matchAll(/["']([^"']*\/v1\/dental\/[^"']*)["']/g)].map((match) => match[1]);
  assert.ok(apiPaths.length >= 8, "expected explicit Assistant API calls");
  assert.ok(apiPaths.every((route) =>
    route.startsWith("/v1/dental/assistant/") ||
    route.startsWith("/v1/dental/auth/assistant") ||
    route.startsWith("/v1/dental/auth/assistants")
  ));
  assert.ok(!assistantAppSource.includes("/v1/dental/doctor/"));
  assert.ok(!assistantAppSource.includes("/v1/dental/ai/"));
  assert.ok(!assistantAppSource.includes("/v1/dental/intelligence/"));
});

test("Assistant account management is restricted to owner and admin identities", () => {
  assert.ok(assistantAppSource.includes('const allowed = ["owner", "admin"]'));
  assert.ok(assistantAppSource.includes("/v1/dental/auth/assistants"));
  assert.ok(assistantAppSource.includes("/deactivate"));
});

test("legacy patient-linked API methods are absent from the shipped client", () => {
  for (const method of [
    "patientLink:", "patientLinkedRecords:", "patientAppointments:",
    "patientRequestAppointment:", "patientChart:", "patientClinicalNotes:",
    "patientMessages:", "sendPatientMessage:", "patientTreatmentPlans:",
    "patientInvoices:", "patientReceipts:", "patientDocuments:",
    "patientDocumentDownloadIntent:",
  ]) assert.ok(!apiSource.includes(method), method);
});


test("Clinic Assistant route is served by the main SPA rather than a legacy static page", () => {
  assert.equal(fs.existsSync(path.join(root, "public", "assistant", "index.html")), false);
  assert.equal(fs.existsSync(path.join(root, "public", "assistant-admin", "index.html")), false);
  assert.ok(source.includes("isAssistantRoute"));
  assert.ok(source.includes("isLegacyAssistantAdminRoute"));
});

test("Doctor settings embeds the real owner/admin-gated Assistant management component", () => {
  assert.ok(source.includes("<AssistantManagement token={token} user={user} />"));
  assert.ok(assistantAppSource.includes('const allowed = ["owner", "admin"]'));
  assert.ok(assistantAppSource.includes("/v1/dental/auth/assistants"));
});
