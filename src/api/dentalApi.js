const API_URL = 'https://dr-pranali-dental-api.onrender.com';

async function request(path, options = {}) {
  const response = await fetch(API_URL + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  if (!response.ok) throw new Error((data && (data.detail || data.message)) || 'API request failed');
  return data;
}

export async function requestPublicAppointment(payload) {
  return request('/v1/dental/public/appointments', { method: 'POST', body: JSON.stringify(payload) });
}

export async function getDentalHealth() {
  return request('/v1/dental/health');
}
