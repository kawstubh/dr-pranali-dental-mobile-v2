import { DOCTOR_API_URL } from './apiConfig';

const API_URL = DOCTOR_API_URL;

export async function request(path, token, options = {}) {
  const { timeoutMs = 15000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(API_URL + path, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(fetchOptions.headers || {}),
      },
    });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch {}
    if (!response.ok) {
      const detail = data?.detail;
      const message = typeof detail === 'string' ? detail : detail?.message;
      const code = detail?.google_code || detail?.code || ('HTTP_' + response.status);
      const status = detail?.google_status || detail?.status || response.status;
      const apiError = new Error(
        (message || data?.message || 'API request failed') +
          ' (HTTP ' + status + ', code ' + code + ')'
      );
      apiError.status = status;
      apiError.code = code;
      throw apiError;
    }
    return data;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('The clinic service took too long to respond. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export const listAppointments = (token) => request('/v1/dental/appointments', token);

export const listDoctorWorkspaces = (token) =>
  request('/v1/dental/auth/workspaces', token);

export const switchDoctorWorkspace = (token, clinicId) =>
  request('/v1/dental/auth/workspace/switch', token, {
    method: 'POST',
    body: JSON.stringify({ clinic_id: clinicId }),
  });

export const listOrganisationWorkspaces = (token, organisationId) =>
  request('/v1/dental/organisations/' + encodeURIComponent(organisationId) + '/workspaces', token);

export const createOrganisationWorkspace = (token, organisationId, payload) =>
  request('/v1/dental/organisations/' + encodeURIComponent(organisationId) + '/workspaces', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const createDentalOrganisation = (token, payload) =>
  request('/v1/dental/organisations', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const createDoctorAccount = (token, payload) =>
  request('/v1/dental/auth/doctors', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const createWorkspaceMembership = (token, clinicId, payload) =>
  request('/v1/dental/workspaces/' + encodeURIComponent(clinicId) + '/memberships', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const listPatients = (token) => request('/v1/dental/patients', token);

export const updateAppointment = (token, id, payload) =>
  request('/v1/dental/appointments/' + encodeURIComponent(id), token, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const createPatient = (token, payload) =>
  request('/v1/dental/patients', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const getHealth = () => request('/v1/dental/health', null);

export const getDentalChart = (token, patientId) =>
  request('/v1/dental/patients/' + encodeURIComponent(patientId) + '/chart', token);

export const saveDentalChartEntry = (token, patientId, payload) =>
  request('/v1/dental/patients/' + encodeURIComponent(patientId) + '/chart', token, {
    method: 'POST',
    body: JSON.stringify({ ...payload, patient_id: patientId }),
  });

export const getPeriodontogram = (token, patientId) =>
  request('/v1/dental/patients/' + encodeURIComponent(patientId) + '/periodontogram', token);

export const savePeriodontogramEntry = (token, patientId, payload) =>
  request('/v1/dental/patients/' + encodeURIComponent(patientId) + '/periodontogram', token, {
    method: 'POST',
    body: JSON.stringify({ ...payload, patient_id: patientId }),
  });
