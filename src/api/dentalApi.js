const API_URL = 'https://dr-pranali-dental-api.onrender.com';
const REQUEST_TIMEOUT_MS = 15000;

async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(API_URL + path, {
      ...options,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch {}
    if (!response.ok) {
      const detail = data?.detail;
      const message = typeof detail === 'string' ? detail : detail?.message;
      throw new Error(message || data?.message || 'Clinic service returned HTTP ' + response.status);
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

export async function requestPublicAppointment(payload) {
  return request('/v1/dental/public/appointments', { method: 'POST', body: JSON.stringify(payload) });
}

export async function getDentalHealth() {
  return request('/v1/dental/health');
}
