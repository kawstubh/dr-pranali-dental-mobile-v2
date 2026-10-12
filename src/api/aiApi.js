import { supabase } from '../auth/googleAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkEmergency } from '../safety/emergencyCheck';

const API_URL = 'https://dr-pranali-dental-api.onrender.com';
const SUPPORTED_LANGUAGES = ['en', 'hi', 'mr'];

async function resolveLanguage(language) {
  if (SUPPORTED_LANGUAGES.includes(language)) return language;
  try {
    const stored = await AsyncStorage.getItem('dental-app-language');
    return SUPPORTED_LANGUAGES.includes(stored) ? stored : 'en';
  } catch {
    return 'en';
  }
}

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

export async function getAIConsent() {
  return (await AsyncStorage.getItem('drpranali_ai_consent')) === 'true';
}

export async function giveAIConsent() {
  const result = await request('/v1/dental/ai/patient/consent', {
    method: 'POST',
    body: JSON.stringify({ consent: true }),
  });
  await AsyncStorage.setItem('drpranali_ai_consent', 'true');
  return result;
}

export async function linkPatient(inviteCode) {
  return request('/v1/dental/ai/patient/link', {
    method: 'POST',
    body: JSON.stringify({ invite_code: inviteCode }),
  });
}

export async function patientAIChat(message, patientId, language) {
  const selectedLanguage = await resolveLanguage(language);
  const emergency = checkEmergency(message, selectedLanguage);
  if (emergency) return emergency;
  return request('/v1/dental/ai/patient/chat', {
    method: 'POST',
    body: JSON.stringify({ message, patient_id: patientId || null, language: selectedLanguage }),
  });
}

export async function explainTreatment(treatmentPlan, patientId, language) {
  const selectedLanguage = await resolveLanguage(language);
  return request('/v1/dental/ai/patient/treatment-explanation', {
    method: 'POST',
    body: JSON.stringify({ treatment_plan: treatmentPlan, patient_id: patientId || null, language: selectedLanguage }),
  });
}

export async function triageSymptoms(symptoms, patientId, language) {
  const selectedLanguage = await resolveLanguage(language);
  const text = typeof symptoms === 'string' ? symptoms : JSON.stringify(symptoms ?? '');
  const emergency = checkEmergency(text, selectedLanguage);
  if (emergency) return emergency;
  return request('/v1/dental/ai/patient/triage', {
    method: 'POST',
    body: JSON.stringify({ symptoms, patient_id: patientId || null, language: selectedLanguage }),
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
