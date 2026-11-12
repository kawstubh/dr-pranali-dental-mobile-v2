const API_BASE = (
  import.meta.env.DEV
    ? ""
    : import.meta.env.VITE_DENTAL_API_URL ||
      "https://oralyn-multitenant-staging.onrender.com"
).replace(/\/$/, "");

async function request(path, { token, method = "GET", body } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data =
    response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const detail = data?.detail;
    const message =
      typeof detail === "string"
        ? detail
        : detail?.message || detail?.code || response.statusText;
    const error = new Error(
      message || "The clinic service could not complete this request.",
    );
    error.status = response.status;
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
  patientAppointments: (token) =>
    request("/v1/dental/ai/patient/appointments", { token }),
  patientChart: (token) => request("/v1/dental/ai/patient/chart", { token }),
  createPatientInvite: (token, patientId) =>
    request(
      "/v1/dental/ai/doctor/patients/" +
        encodeURIComponent(patientId) +
        "/invite",
      { token, method: "POST" },
    ),
};
