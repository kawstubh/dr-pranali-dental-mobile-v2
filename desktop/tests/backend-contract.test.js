import assert from "node:assert/strict";
import { test } from "node:test";

import { dentalApi } from "../src/api.js";

async function captureRequests(run) {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, init = {}) => {
    requests.push({ url: String(url), init });
    return new Response(JSON.stringify({ result: { accepted: true } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  try {
    await run(requests);
    return requests;
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function assertBearer(requests, token) {
  for (const request of requests) {
    assert.equal(request.init.headers.Authorization, `Bearer ${token}`);
  }
}

test("doctor treatment-plan and invoice calls match the tenant-scoped billing API", async () => {
  const token = "synthetic-doctor-token";
  const requests = await captureRequests(async () => {
    await dentalApi.doctorTreatmentPlans(token, "patient-1");
    await dentalApi.createTreatmentPlan(token, "patient-1", {
      title: "Preventive care",
      summary: "Clinic-authored plan",
      items: [{ description: "Professional cleaning" }],
    });
    await dentalApi.updateTreatmentPlan(token, "plan-1", {
      expected_version: 1,
      patient_visible: true,
      status: "proposed",
    });
    await dentalApi.doctorInvoices(token, "patient-1");
    await dentalApi.createInvoice(token, "patient-1", {
      idempotency_key: "oralyn-invoice-test-0001",
      discount_paise: 0,
      patient_note: "",
      items: [{ description: "Cleaning", quantity_milli: 1000, unit_price_paise: 125000, tax_rate_bps: 0 }],
    });
    await dentalApi.issueInvoice(token, "invoice-1", {});
    await dentalApi.recordInvoiceReceipt(token, "invoice-1", {
      amount_paise: 125000,
      method: "upi",
      reference: "synthetic-reference",
      idempotency_key: "oralyn-receipt-test-0001",
    });
    await dentalApi.voidInvoice(token, "invoice-2");
  });

  assert.deepEqual(requests.map(({ url, init }) => [url, init.method || "GET"]), [
    ["/v1/dental/doctor/patients/patient-1/treatment-plans", "GET"],
    ["/v1/dental/doctor/patients/patient-1/treatment-plans", "POST"],
    ["/v1/dental/doctor/treatment-plans/plan-1", "PATCH"],
    ["/v1/dental/doctor/patients/patient-1/invoices", "GET"],
    ["/v1/dental/doctor/patients/patient-1/invoices", "POST"],
    ["/v1/dental/doctor/invoices/invoice-1/issue", "POST"],
    ["/v1/dental/doctor/invoices/invoice-1/receipts", "POST"],
    ["/v1/dental/doctor/invoices/invoice-2/void", "POST"],
  ]);
  assertBearer(requests, token);
  assert.equal(JSON.parse(requests[4].init.body).items[0].unit_price_paise, 125000);
  assert.ok(JSON.parse(requests[4].init.body).idempotency_key);
  assert.ok(JSON.parse(requests[6].init.body).idempotency_key);
});

test("patient billing and document reads are scoped to the authenticated linked record", () => {
  const linkedRecordMethods = Object.keys(dentalApi).filter((key) => key.startsWith("patient") && key !== "patients");
  assert.deepEqual(linkedRecordMethods, []);
  for (const method of ["doctorTreatmentPlans", "doctorInvoices", "recordInvoiceReceipt", "doctorDocuments"]) {
    assert.equal(typeof dentalApi[method], "function", method);
  }
});

test("private document upload, completion, clinical review and sharing use separate doctor actions", async () => {
  const token = "synthetic-doctor-token";
  const requests = await captureRequests(async () => {
    await dentalApi.createDocumentUploadIntent(token, "patient-1", {
      file_name: "synthetic-report.pdf",
      content_type: "application/pdf",
      size_bytes: 1024,
      checksum_sha256: "a".repeat(64),
    });
    await dentalApi.completeDocumentUpload(token, "document-1");
    await dentalApi.reviewDocument(token, "document-1");
    await dentalApi.setDocumentVisibility(token, "document-1", true);
    await dentalApi.doctorDocumentDownloadIntent(token, "document-1");
  });

  assert.deepEqual(requests.map(({ url, init }) => [url, init.method || "GET"]), [
    ["/v1/dental/doctor/patients/patient-1/documents/upload-intent", "POST"],
    ["/v1/dental/doctor/documents/document-1/complete", "POST"],
    ["/v1/dental/doctor/documents/document-1/review", "POST"],
    ["/v1/dental/doctor/documents/document-1", "PATCH"],
    ["/v1/dental/doctor/documents/document-1/download-intent", "POST"],
  ]);
  assertBearer(requests, token);
  assert.equal(JSON.parse(requests[0].init.body).checksum_sha256, "a".repeat(64));
  assert.deepEqual(JSON.parse(requests[3].init.body), { patient_visible: true });
  assert.equal(requests[2].init.body, undefined);
});

test("doctor appointment updates and doctor provisioning use authenticated clinic routes", async () => {
  const token = "synthetic-doctor-token";
  const requests = await captureRequests(async () => {
    await dentalApi.updateAppointment(token, "appointment-1", {
      starts_at: "2026-11-13T04:30:00.000Z",
      status: "confirmed",
    });
    await dentalApi.createDoctorAccount(token, {
      email: "doctor@example.test",
      password: "synthetic-long-password-123",
      role: "doctor",
    });
  });

  assert.deepEqual(requests.map(({ url, init }) => [url, init.method || "GET"]), [
    ["/v1/dental/appointments/appointment-1", "PATCH"],
    ["/v1/dental/auth/doctors", "POST"],
  ]);
  assertBearer(requests, token);
  assert.equal(dentalApi.createPatientInvite, undefined);
  assert.deepEqual(JSON.parse(requests[0].init.body), {
    starts_at: "2026-11-13T04:30:00.000Z",
    status: "confirmed",
  });
  assert.deepEqual(JSON.parse(requests[1].init.body), {
    email: "doctor@example.test",
    password: "synthetic-long-password-123",
    role: "doctor",
  });
});


test("public client does not expose linked-record billing or document methods", () => {
  const linkedRecordMethods = Object.keys(dentalApi).filter((key) => key.startsWith("patient") && key !== "patients");
  assert.deepEqual(linkedRecordMethods, []);
});
