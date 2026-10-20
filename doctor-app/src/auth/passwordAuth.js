import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = 'doctor_session';
const USER_KEY = 'doctor_user';

export class DoctorAuthError extends Error {
  constructor(message, code = '', status = null) {
    super(message);
    this.name = 'DoctorAuthError';
    this.code = code;
    this.status = status;
  }
}

async function parseResponse(response) {
  const raw = await response.text();
  let payload = null;
  try { payload = raw ? JSON.parse(raw) : null; } catch {}
  if (!response.ok) {
    const detail = payload?.detail;
    const message = typeof detail === 'string' ? detail : detail?.message;
    const code = detail?.code || 'API_HTTP_' + response.status;
    throw new DoctorAuthError(
      message || 'Clinic sign-in failed. Please check your credentials or try again.',
      code,
      response.status
    );
  }
  return payload || {};
}

export async function signInWithPassword(apiUrl, email, password) {
  try {
    const response = await fetch(apiUrl.replace(/\/$/, '') + '/v1/dental/auth/password/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });
    const payload = await parseResponse(response);
    if (!payload.access_token || !payload.user) {
      throw new DoctorAuthError('The clinic API returned an incomplete login session.', 'INVALID_SESSION_RESPONSE');
    }
    await AsyncStorage.setItem(SESSION_KEY, payload.access_token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(payload.user));
    return payload;
  } catch (error) {
    if (error instanceof DoctorAuthError) throw error;
    throw new DoctorAuthError(
      error?.name === 'TypeError'
        ? 'Unable to connect to the clinic service. Check your internet connection and try again.'
        : (error?.message || 'Clinic sign-in failed.'),
      error?.code || error?.name || 'DOCTOR_SIGN_IN_ERROR',
      error?.status || null
    );
  }
}

export async function getStoredDoctorSession() {
  return AsyncStorage.getItem(SESSION_KEY);
}

export async function signOutDoctor(apiUrl) {
  const token = await AsyncStorage.getItem(SESSION_KEY);
  try {
    if (token) {
      await fetch(apiUrl.replace(/\/$/, '') + '/v1/dental/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
      }).catch(() => {});
    }
  } finally {
    await AsyncStorage.multiRemove([SESSION_KEY, USER_KEY]);
  }
}
