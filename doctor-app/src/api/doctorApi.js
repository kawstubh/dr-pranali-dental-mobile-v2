const API_URL = 'https://dr-pranali-dental-api.onrender.com';

async function request(path, token, options = {}) {
  const response = await fetch(API_URL + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(options.headers || {}),
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
    throw new Error((message || data?.message || 'API request failed') + ' (HTTP ' + status + ', code ' + code + ')');
  }
  return data;
}

export const listAppointments = (token) => request('/v1/dental/appointments', token);
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
