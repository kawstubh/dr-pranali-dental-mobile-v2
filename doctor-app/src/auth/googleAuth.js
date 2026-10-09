import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://dr-pranali-dental-api.onrender.com';

export class DoctorAuthError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = 'DoctorAuthError';
    this.status = status;
  }
}

export async function signInWithPassword(email, password) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || !password) throw new DoctorAuthError('Enter your registered clinic email and password.');
  let response;
  try {
    response = await fetch(API_BASE + '/v1/dental/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, password }),
    });
  } catch {
    throw new DoctorAuthError('The clinic service could not be reached. Please try again in a moment.');
  }
  const raw = await response.text();
  let payload = null;
  try { payload = raw ? JSON.parse(raw) : null; } catch {}
  if (!response.ok) {
    const detail = payload?.detail;
    const message = typeof detail === 'string' ? detail : detail?.message;
    if (response.status === 401 || response.status === 403) {
      throw new DoctorAuthError('These credentials are not authorised for the clinic. Check your login or contact the clinic administrator.', response.status);
    }
    throw new DoctorAuthError(message || 'Doctor login is temporarily unavailable. Please try again.', response.status);
  }
  if (!payload?.access_token || payload?.user?.role !== 'doctor' && payload?.user?.role !== 'admin') {
    throw new DoctorAuthError('The clinic service returned an invalid doctor session.');
  }
  await AsyncStorage.setItem('doctor_session', payload.access_token);
  await AsyncStorage.setItem('doctor_user', JSON.stringify(payload.user || {}));
  return payload;
}

export async function getStoredDoctorSession() { return AsyncStorage.getItem('doctor_session'); }

export async function signOutGoogle() {
  await AsyncStorage.multiRemove(['doctor_session', 'doctor_user']);
}
