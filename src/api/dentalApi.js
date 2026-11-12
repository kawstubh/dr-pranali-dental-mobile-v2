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
    throw new Error((typeof detail === 'string' ? detail : detail?.message) || 'API request failed (HTTP ' + response.status + ')');
  }
  return data;
}

export async function requestPublicAppointment(payload) {
  return request('/v1/dental/public/appointments', { method: 'POST', body: JSON.stringify(payload) });
}

export async function getDentalHealth() {
  return request('/v1/dental/health');
}

export async function getPublicClinic() {
  return request('/v1/dental/public/clinic');
}
