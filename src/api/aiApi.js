import { supabase } from '../auth/googleAuth';

const API_URL = 'https://dr-pranali-dental-api.onrender.com';

async function sessionToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || '';
}

async function request(path, options = {}) {
  const token = await sessionToken();
  if (!token) throw new Error('Please sign in with Google before using Dental AI.');
  const response = await fetch(API_URL + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  if (!response.ok) {
    const detail = data?.detail;
    const message = typeof detail === 'string' ? detail : detail?.message;
    const error = new Error(message || data?.message || 'Dental AI request failed');
    error.code = detail?.code;
    error.status = response.status;
    throw error;
  }
  return data;
}

export const getAIConsent = async () => {
  const raw = await import('@react-native-async-storage/async-storage');
  return (await raw.default.getItem('drpranali_ai_consent')) === 'true';
};

export async function giveAIConsent() {
  const result = await request('/v1/dental/ai/patient/consent', {
    method: 'POST',
    body: JSON.stringify({ consent: true }),
  });
  const raw = await import('@react-native-async-storage/async-storage');
  await raw.default.setItem('drpranali_ai_consent', 'true');
  return result;
}

export async function linkPatient(inviteCode) {
  return request('/v1/dental/ai/patient/link', {
    method: 'POST',
    body: JSON.stringify({ invite_code: inviteCode }),
  });
}

export async function patientAIChat(message, patientId) {
  return request('/v1/dental/ai/patient/chat', {
    method: 'POST',
    body: JSON.stringify({ message, patient_id: patientId || null, language: 'en' }),
  });
}

export async function explainTreatment(treatmentPlan, patientId) {
  return request('/v1/dental/ai/patient/treatment-explanation', {
    method: 'POST',
    body: JSON.stringify({ treatment_plan: treatmentPlan, patient_id: patientId || null, language: 'en' }),
  });
}

export async function triageSymptoms(symptoms, patientId) {
  return request('/v1/dental/ai/patient/triage', {
    method: 'POST',
    body: JSON.stringify({ symptoms, patient_id: patientId || null, language: 'en' }),
  });
}

export async function deleteAIHistory() {
  return request('/v1/dental/ai/patient/history', { method: 'DELETE' });
}

export async function registerExpoPushToken() {
  try {
    const Notifications = await import('expo-notifications');
    const permission = await Notifications.getPermissionsAsync();
    if (permission.status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      if (requested.status !== 'granted') return false;
    }
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    if (!token) return false;
    await request('/v1/dental/ai/patient/device', {
      method: 'POST',
      body: JSON.stringify({ expo_push_token: token }),
    });
    return true;
  } catch {
    return false;
  }
}
