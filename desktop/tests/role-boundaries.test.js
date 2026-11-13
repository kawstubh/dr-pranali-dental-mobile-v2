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
const assistantContractSource = fs.readFileSync(path.join(root, "scripts", "verify-assistant-staging-contract.cjs"), "utf8");
const portalHeadersSource = fs.readFileSync(path.join(root, "scripts", "verify-portal-security-headers.cjs"), "utf8");
const assistantWorkflowSource = fs.readFileSync(path.join(root, "..", ".github", "workflows", "oralyn-desktop.yml"), "utf8");
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

test("public patient journey is served only by account-free static pages", () => {
  assert.doesNotMatch(source, /function Patient\(|patientSession|patientLinks|patientInviteCode|oralyn_patient_record_id/);
  assert.match(patientHomeSource, /No patient account, password or OTP is needed/);
  assert.match(bookingSource, /No account or OTP is required/);
  assert.match(source, /Public patient services/);
  assert.match(source, /No account or OTP required/);
  assert.doesNotMatch(source, /Continue to patient portal/);
  assert.match(patientHomeSource, /href="\/patient\/booking\//);
  const route = resolvePortalRoute("/patient/login");
  assert.equal(route.role, "doctor");
  assert.equal(route.redirectTo, "/patient/home/");
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
  assert.match(patientHomeSource, /No patient account, password or OTP is needed/);
  assert.match(patientHomeSource, /href="\/patient\/booking\//);
  assert.match(patientHomeSource, /clinical records, prescriptions and invoices remain protected/);
});

test("guest booking collects minimum contact details and uses public appointment intake", () => {
  assert.match(bookingSource, /name="name"/);
  assert.match(bookingSource, /name="phone"/);
  assert.match(bookingSource, /\/v1\/dental\/public\/appointments/);
  assert.match(bookingSource, /Your appointment request has been received/);
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
  assert.match(patientHomeSource, /clinical records, prescriptions and invoices remain protected/);
  assert.doesNotMatch(bookingSource, /clinical notes|odontogram|prescription|invoice|patient_id|appointment_id/i);
  assert.doesNotMatch(bookingSource, /Authorization\s*:/i);
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

test("Doctor-only intelligence is not exposed in public patient pages", () => {
  assert.doesNotMatch(patientHomeSource + bookingSource, /AI diagnosis|self-diagnosis|clinical intelligence|diagnose yourself/i);
});

test("private document actions remain fail-closed until storage and malware scanning are verified", () => {
  assert.match(careSource, /VITE_PRIVATE_DOCUMENT_STORAGE_READY/);
  assert.match(careSource, /VITE_DOCUMENT_MALWARE_SCANNING_READY/);
  assert.match(careSource, /PRIVATE_DOCUMENTS_READY/);
  assert.match(careSource, /Uploads, downloads and review are disabled/);
  assert.match(careSource, /Patient-specific sharing is separately deferred/);
  assert.match(careSource, /PRIVATE_DOCUMENTS_READY && document\.status === "available"/);
  assert.match(apiSource, /createDocumentUploadIntent/);
});

test("patient sessions, record linking and patient-account storage are absent from the portal shell", () => {
  assert.doesNotMatch(source, /patientSession|patientLinks|patientInviteCode|oralyn_patient_record_id|Link patient record|Clinic invite code/);
  assert.doesNotMatch(apiSource, /patientLink:|patientLinkedRecords:/);
  assert.match(source, /window\.location\.assign\("\/patient\/home\/"\)/);
});

test("public patient booking remains separate from Doctor identity and tenant APIs", () => {
  assert.match(bookingSource, /\/v1\/dental\/public\/appointments/);
  assert.match(bookingSource, /intelligence_request:\s*false/);
  assert.match(apiSource, /appointments: \(token\) => request\("\/v1\/dental\/appointments", \{ token \}\)/);
  assert.doesNotMatch(bookingSource, /patient_id|appointment_id|\/v1\/dental\/patients/);
  assert.doesNotMatch(bookingSource, /Authorization\s*:/i);
});

test("Clinic Assistant has a distinct route, identity and session namespace", () => {
  assert.ok(source.includes('import AssistantApp, { AssistantManagement } from "./assistant.jsx";'));
  assert.ok(source.includes("isAssistantRoute"));
  assert.ok(assistantAppSource.includes("/v1/dental/assistant/auth/login"));
  assert.ok(!assistantAppSource.includes("sessionStorage"));
  assert.ok(!assistantAppSource.includes("localStorage"));
  assert.ok(assistantAppSource.includes('role !== "assistant"'));
});

test("Clinic Assistant UI calls only its dedicated reception and assistant-auth API namespace", () => {
  const apiPaths = [...assistantAppSource.matchAll(/["']([^"']*\/v1\/dental\/[^"']*)["']/g)].map((match) => match[1]);
  assert.ok(apiPaths.length >= 8, "expected explicit Assistant API calls");
  assert.ok(apiPaths.every((route) =>
    route.startsWith("/v1/dental/assistant/") ||
    route.startsWith("/v1/dental/clinic-assistants")
  ));
  assert.ok(!assistantAppSource.includes("/v1/dental/doctor/"));
  assert.ok(!assistantAppSource.includes("/v1/dental/ai/"));
  assert.ok(!assistantAppSource.includes("/v1/dental/intelligence/"));
});

test("Clinic Assistant UI matches the backend route and result-envelope contract", () => {
  for (const route of [
    "/v1/dental/assistant/auth/login",
    "/v1/dental/assistant/auth/logout",
    "/v1/dental/assistant/me",
    "/v1/dental/assistant/patients",
    "/v1/dental/assistant/appointments",
    "/v1/dental/assistant/billing/invoices",
    "/v1/dental/clinic-assistants",
  ]) assert.ok(assistantAppSource.includes(route), route);
  assert.ok(assistantAppSource.includes("data.result"));
  assert.ok(assistantAppSource.includes('method: "PATCH", body: { status }'));
  assert.doesNotMatch(assistantAppSource, /patient_id/);
  assert.doesNotMatch(assistantAppSource, /\/v1\/dental\/auth\/assistant/);
  assert.doesNotMatch(assistantAppSource, /\/v1\/dental\/auth\/assistants/);
});

test("Assistant account management is restricted to owner and admin identities", () => {
  assert.ok(assistantAppSource.includes('const allowed = ["owner", "admin"]'));
  assert.ok(assistantAppSource.includes("/v1/dental/clinic-assistants"));
  assert.ok(assistantAppSource.includes("method: \"PATCH\""));
  assert.ok(assistantAppSource.includes("body: { active: false }"));
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
  assert.ok(assistantAppSource.includes("/v1/dental/clinic-assistants"));
});


test("Assistant staging contract verification is read-only and never creates a booking", () => {
  assert.match(assistantContractSource, /method: "OPTIONS"/);
  assert.match(assistantContractSource, /method: "GET"/);
  assert.doesNotMatch(assistantContractSource, /method: "(?:POST|PATCH|DELETE)"/);
  assert.match(assistantWorkflowSource, /ORALYN_ASSISTANT_UI_API_VERIFIED=true/);
  assert.match(assistantContractSource, /no credentials or writes used/);
});


test("portal security header probe is a read-only GET check", () => {
  assert.match(portalHeadersSource, /http:\/\/127\.0\.0\.1:4176/);
  assert.match(portalHeadersSource, /content-security-policy/i);
  assert.match(portalHeadersSource, /strict-transport-security/i);
  assert.doesNotMatch(portalHeadersSource, /method:\s*"(?:POST|PATCH|DELETE)"/);
  assert.match(assistantWorkflowSource, /ORALYN_SECURITY_HEADERS_VERIFIED=true/);
});


test("Clinic Assistant appointment queue shows scheduling details without clinical treatment type", () => {
  assert.match(assistantAppSource, /appointment\.starts_at/);
  assert.match(assistantAppSource, /· Appointment/);
  assert.doesNotMatch(assistantAppSource, /appointment\.treatment_type|treatment_type/);
});


test("release manifest blocks production until Doctor token storage is hardened", () => {
  const manifestPath = path.join(root, "scripts", "write-build-manifest.cjs");
  const manifestSource = fs.readFileSync(manifestPath, "utf8");
  assert.ok(manifestSource.includes("doctor_token_storage_hardening_verified"));
  assert.ok(manifestSource.includes("process.env.ORALYN_DOCTOR_TOKEN_STORAGE_HARDENING_VERIFIED"));
});
