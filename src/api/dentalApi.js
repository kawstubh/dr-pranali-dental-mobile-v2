export const DENTAL_API_URL =
  process.env.EXPO_PUBLIC_DENTAL_API_URL || 'https://oralyn-multitenant-staging.onrender.com';

async function request(path, options = {}) {
  const response = await fetch(DENTAL_API_URL + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  if (!response.ok) {
    const detail = data && (data.detail || data.message);
    const error = new Error((typeof detail === 'string' ? detail : detail?.message) || 'API request failed (HTTP ' + response.status + ')');
    error.status = response.status;
    error.code = detail && typeof detail === 'object' ? detail.code : data?.code;
    throw error;
  }
  return data;
}

export async function requestPublicAppointment(payload) {
  return request('/v1/dental/public/appointments', { method: 'POST', body: JSON.stringify(payload) });
}

function patientAuthHeaders(accessToken) {
  if (!accessToken) throw new Error('Sign in to view your clinic record.');
  return { Authorization: 'Bearer ' + accessToken };
}

export async function getPatientProfile(accessToken) {
  return request('/v1/dental/ai/patient/profile', { headers: patientAuthHeaders(accessToken) });
}

export async function linkPatientRecord(accessToken, inviteCode) {
  const code = String(inviteCode || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
  if (!code) throw new Error('Enter the invite code shared by your clinic.');
  return request('/v1/dental/ai/patient/link', {
    method: 'POST',
    headers: patientAuthHeaders(accessToken),
    body: JSON.stringify({ invite_code: code }),
  });
}

export async function getPatientAppointments(accessToken) {
  return request('/v1/dental/ai/patient/appointments', { headers: patientAuthHeaders(accessToken) });
}

export async function getPatientChart(accessToken) {
  return request('/v1/dental/ai/patient/chart', { headers: patientAuthHeaders(accessToken) });
}

export async function getDentalHealth() {
  return request('/v1/dental/health');
}

export async function getPublicClinic() {
  return request('/v1/dental/public/clinic');
}
