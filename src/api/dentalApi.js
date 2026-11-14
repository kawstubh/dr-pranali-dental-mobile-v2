const API_URL = String(process.env.EXPO_PUBLIC_DENTAL_API_URL || '').trim();

function requireApiUrl() {
  if (!API_URL) throw new Error('Oralyn clinic API is not configured for this build. Install the clinic-approved staging build.');
  let parsed;
  try { parsed = new URL(API_URL); } catch { throw new Error('Oralyn clinic API URL is invalid.'); }
  if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error('Oralyn clinic API must be a canonical HTTPS origin.');
  }
  return parsed.origin;
}

async function request(path, options = {}) {
  const response = await fetch(requireApiUrl() + path, {
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


export async function getPublicClinic() {
  return request('/v1/dental/public/clinic');
}
