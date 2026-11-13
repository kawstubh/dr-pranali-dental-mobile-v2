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
const bookingSource = fs.readFileSync(path.join(root, "public", "patient", "booking", "index.html"), "utf8");
const assistantSource = fs.readFileSync(path.join(root, "public", "assistant", "index.html"), "utf8");
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


test("Clinic Assistant has a separate least-privilege workspace", () => {
  assert.match(assistantSource, /Clinic Assistant sign in/);
  assert.match(assistantSource, /assistant\/auth\/login/);
  assert.match(assistantSource, /assistant\/auth\/logout/);
  assert.match(assistantSource, /assistant\/patients/);
  assert.match(assistantSource, /assistant\/appointments/);
  assert.match(assistantSource, /assistant\/billing\/invoices/);
  assert.match(assistantSource, /sessionStorage/); // receipt idempotency only
  assert.doesNotMatch(assistantSource, /oralyn_assistant_session/);
  assert.doesNotMatch(assistantSource, /sessionStorage\.(?:getItem|setItem|removeItem)\(tokenKey/);
  assert.match(assistantSource, /Assistant bearer tokens remain memory-only/);
  assert.doesNotMatch(assistantSource, /\/v1\/dental\/(?:intelligence|doctor|patients|appointments)(?:\/|["?])/);
  const script = assistantSource.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, "assistant page script must be present");
  assert.doesNotThrow(() => new vm.Script(script));
});

test("Doctor patient directory has no patient-account invitation action", () => {
  assert.doesNotMatch(source, /createPatientInvite|Create invite|invite-code-card/);
  assert.doesNotMatch(apiSource, /createPatientInvite/);
});

test("owner/admin settings expose the separate Clinic Assistant account page", () => {
  assert.match(source, /canManageAssistants/);
  assert.match(source, /accountRole === "owner" \|\| accountRole === "admin"/);
  assert.match(source, /assistant-admin\/index\.html/);
  assert.match(viteSource, /configurePreviewServer/);
  assert.match(viteSource, /assistant-admin\/index\.html/);
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


const assistantAdminSource = fs.readFileSync(
  path.join(root, "public", "assistant-admin", "index.html"),
  "utf8",
);

test("Clinic Assistant account management is gated by the Doctor owner/admin session", () => {
  assert.match(assistantAdminSource, /oralyn_doctor_token/);
  assert.match(assistantAdminSource, /\/v1\/dental\/auth\/me/);
  assert.match(assistantAdminSource, /\["owner","admin"\]/);
  assert.match(assistantAdminSource, /\/v1\/dental\/clinic-assistants/);
  assert.match(assistantAdminSource, /method:"POST"/);
  assert.match(assistantAdminSource, /method:"PATCH"/);
  assert.match(assistantAdminSource, /name="password_confirm"/);
  assert.match(assistantAdminSource, /The passwords do not match/);
  assert.match(assistantAdminSource, /credentials:"omit"/);
  assert.match(assistantAdminSource, /cache:"no-store"/);
  assert.match(assistantAdminSource, /Assistant account deactivated and existing sessions revoked/);
  assert.doesNotMatch(assistantAdminSource, /oralyn_assistant_session/);
  assert.doesNotMatch(assistantAdminSource, /\/v1\/dental\/assistant\//);
  const script = assistantAdminSource.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, "Assistant admin page script must be present");
  assert.doesNotThrow(() => new vm.Script(script));
});


test("release manifest blocks production until Doctor token storage is hardened", () => {
  const manifestPath = path.join(root, "scripts", "write-build-manifest.cjs");
  const manifestSource = fs.readFileSync(manifestPath, "utf8");
  assert.ok(manifestSource.includes("doctor_token_storage_hardening_verified"));
  assert.ok(manifestSource.includes("process.env.ORALYN_DOCTOR_TOKEN_STORAGE_HARDENING_VERIFIED"));
});


test("release manifest keeps Assistant data minimization blocked until live authenticated verification", () => {
  const manifest = fs.readFileSync(path.join(root, "scripts", "write-build-manifest.cjs"), "utf8");
  assert.ok(manifest.includes("assistant_data_minimization_live_verified"));
  assert.ok(manifest.includes("assistant_api_contract_readonly_verified"));
});
