const ENV = import.meta.env || {};
const API_BASE = (
  ENV.DEV
    ? ""
    : ENV.VITE_DENTAL_API_URL || ""
).replace(/\/$/, "");

function query(values = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      params.set(key, String(value));
    }
  }
  const encoded = params.toString();
  return encoded ? `?${encoded}` : "";
}

async function request(path, { token, method = "GET", body, headers = {} } = {}) {
  if (typeof window !== "undefined" && window.location && !ENV.DEV && !API_BASE) {
    const error = new Error("The portal API URL is not configured for this deployment. Contact the clinic administrator.");
    error.code = "API_BASE_NOT_CONFIGURED";
    throw error;
  }
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (cause) {
    const error = new Error(
      "The clinic service could not be reached. Check your connection or the portal's staging CORS configuration.",
    );
    error.code = "NETWORK_OR_CORS_ERROR";
    error.cause = cause;
    throw error;
  }
  const data =
    response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const isPatientApi = /^\/v1\/dental\/(?:patient\/|ai\/patient\/)/i.test(path);
    if (response.status === 401 && token && typeof window !== "undefined") {
      window.dispatchEvent(new Event(isPatientApi
        ? "oralyn:patient-session-expired"
        : "oralyn:doctor-session-expired"));
    }
    const detail = data?.detail;
    const message =
      typeof detail === "string"
        ? detail
        : detail?.message || detail?.code || response.statusText;
    const error = new Error(
      message || "The clinic service could not complete this request.",
    );
    error.status = response.status;
    error.code = detail?.code;
    throw error;
  }
  return data;
}

export const dentalApi = {
  health: () => request("/v1/dental/health"),
  login: (email, password) =>
    request("/v1/dental/auth/password/login", {
      method: "POST",
      body: { email, password },
    }),
  me: (token) => request("/v1/dental/auth/me", { token }),
  logout: (token) =>
    request("/v1/dental/auth/logout", { token, method: "POST" }),
  workspaces: (token) => request("/v1/dental/auth/workspaces", { token }),
  dashboardSummary: (token) => request("/v1/dental/doctor/dashboard/summary", { token }),
  switchWorkspace: (token, clinic_id) =>
    request("/v1/dental/auth/workspace/switch", {
      token,
      method: "POST",
      body: { clinic_id },
    }),
  organisationWorkspaces: (token, organisationId) =>
    request(`/v1/dental/organisations/${encodeURIComponent(organisationId)}/workspaces`, { token }),
  createOrganisation: (token, body) =>
    request("/v1/dental/organisations", { token, method: "POST", body }),
  createWorkspace: (token, organisationId, body) =>
    request(`/v1/dental/organisations/${encodeURIComponent(organisationId)}/workspaces`, {
      token,
      method: "POST",
      body,
    }),
  createDoctorAccount: (token, body) =>
    request("/v1/dental/auth/doctors", { token, method: "POST", body }),
  createWorkspaceMembership: (token, clinicId, body) =>
    request(`/v1/dental/workspaces/${encodeURIComponent(clinicId)}/memberships`, {
      token,
      method: "POST",
      body,
    }),
  patients: (token) => request("/v1/dental/patients", { token }),
  createPatient: (token, body) =>
    request("/v1/dental/patients", { token, method: "POST", body }),
  appointments: (token) => request("/v1/dental/appointments", { token }),
  createAppointment: (token, body) =>
    request("/v1/dental/appointments", { token, method: "POST", body }),
  updateAppointment: (token, id, body) =>
    request(`/v1/dental/appointments/${encodeURIComponent(id)}`, {
      token,
      method: "PATCH",
      body,
    }),
  chart: (token, patientId) =>
    request(`/v1/dental/patients/${encodeURIComponent(patientId)}/chart`, {
      token,
    }),
  saveChart: (token, patientId, body) =>
    request(`/v1/dental/patients/${encodeURIComponent(patientId)}/chart`, {
      token,
      method: "POST",
      body: { ...body, patient_id: patientId },
    }),
  intelligence: (token, body) =>
    request("/v1/dental/intelligence/run", { token, method: "POST", body }),
  publicAppointment: (body) =>
    request("/v1/dental/public/appointments", { method: "POST", body }),
  patientLink: (token, invite_code) =>
    request("/v1/dental/ai/patient/link", {
      token,
      method: "POST",
      body: { invite_code },
    }),
  patientLinkedRecords: (token) =>
    request("/v1/dental/patient/linked-records", { token }),
  patientAppointments: (token, patientId) =>
    request(`/v1/dental/ai/patient/appointments${query({ patient_id: patientId })}`, { token }),
  patientChart: (token, patientId) =>
    request(`/v1/dental/ai/patient/chart${query({ patient_id: patientId })}`, { token }),
  createPatientInvite: (token, patientId) =>
    request(
      "/v1/dental/ai/doctor/patients/" +
        encodeURIComponent(patientId) +
        "/invite",
      { token, method: "POST" },
    ),
  doctorTreatmentPlans: (token, patientId) =>
    request(`/v1/dental/doctor/patients/${encodeURIComponent(patientId)}/treatment-plans`, { token }),
  createTreatmentPlan: (token, patientId, body) =>
    request(`/v1/dental/doctor/patients/${encodeURIComponent(patientId)}/treatment-plans`, { token, method: "POST", body }),
  updateTreatmentPlan: (token, planId, body) =>
    request(`/v1/dental/doctor/treatment-plans/${encodeURIComponent(planId)}`, { token, method: "PATCH", body }),
  doctorInvoices: (token, patientId) =>
    request(`/v1/dental/doctor/patients/${encodeURIComponent(patientId)}/invoices`, { token }),
  createInvoice: (token, patientId, body) =>
    request(`/v1/dental/doctor/patients/${encodeURIComponent(patientId)}/invoices`, { token, method: "POST", body }),
  issueInvoice: (token, invoiceId, body = {}) =>
    request(`/v1/dental/doctor/invoices/${encodeURIComponent(invoiceId)}/issue`, { token, method: "POST", body }),
  recordInvoiceReceipt: (token, invoiceId, body) =>
    request(`/v1/dental/doctor/invoices/${encodeURIComponent(invoiceId)}/receipts`, { token, method: "POST", body }),
  voidInvoice: (token, invoiceId) =>
    request(`/v1/dental/doctor/invoices/${encodeURIComponent(invoiceId)}/void`, { token, method: "POST" }),
  doctorDocuments: (token, patientId) =>
    request(`/v1/dental/doctor/patients/${encodeURIComponent(patientId)}/documents`, { token }),
  createDocumentUploadIntent: (token, patientId, body) =>
    request(`/v1/dental/doctor/patients/${encodeURIComponent(patientId)}/documents/upload-intent`, { token, method: "POST", body }),
  completeDocumentUpload: (token, documentId) =>
    request(`/v1/dental/doctor/documents/${encodeURIComponent(documentId)}/complete`, { token, method: "POST" }),
  setDocumentVisibility: (token, documentId, patient_visible) =>
    request(`/v1/dental/doctor/documents/${encodeURIComponent(documentId)}`, { token, method: "PATCH", body: { patient_visible } }),
  doctorDocumentDownloadIntent: (token, documentId) =>
    request(`/v1/dental/doctor/documents/${encodeURIComponent(documentId)}/download-intent`, { token, method: "POST" }),
  doctorClinicalNotes: (token, patientId) =>
    request(`/v1/dental/doctor/patients/${encodeURIComponent(patientId)}/clinical-notes`, { token }),
  createClinicalNote: (token, patientId, body) =>
    request(`/v1/dental/doctor/patients/${encodeURIComponent(patientId)}/clinical-notes`, { token, method: "POST", body }),
  updateClinicalNote: (token, noteId, body) =>
    request(`/v1/dental/doctor/clinical-notes/${encodeURIComponent(noteId)}`, { token, method: "PATCH", body }),
  patientClinicalNotes: (token, patientId) =>
    request(`/v1/dental/patient/clinical-notes${query({ patient_id: patientId })}`, { token }),
  doctorMessages: (token, patientId) =>
    request(`/v1/dental/doctor/patients/${encodeURIComponent(patientId)}/messages`, { token }),
  sendDoctorMessage: (token, patientId, body) =>
    request(`/v1/dental/doctor/patients/${encodeURIComponent(patientId)}/messages`, { token, method: "POST", body }),
  patientMessages: (token, patientId) =>
    request(`/v1/dental/patient/messages${query({ patient_id: patientId })}`, { token }),
  sendPatientMessage: (token, patientId, body) =>
    request(`/v1/dental/patient/messages${query({ patient_id: patientId })}`, { token, method: "POST", body }),
  patientTreatmentPlans: (token, patientId) =>
    request(`/v1/dental/patient/treatment-plans${query({ patient_id: patientId })}`, { token }),
  patientInvoices: (token, patientId) =>
    request(`/v1/dental/patient/invoices${query({ patient_id: patientId })}`, { token }),
  patientReceipts: (token, patientId) =>
    request(`/v1/dental/patient/receipts${query({ patient_id: patientId })}`, { token }),
  patientDocuments: (token, patientId) =>
    request(`/v1/dental/patient/documents${query({ patient_id: patientId })}`, { token }),
  patientDocumentDownloadIntent: (token, documentId, patientId) =>
    request(`/v1/dental/patient/documents/${encodeURIComponent(documentId)}/download-intent${query({ patient_id: patientId })}`, { token, method: "POST" }),
};
