import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  listDoctorWorkspaces,
  switchDoctorWorkspace,
} from '../api/doctorApi';

const SESSION_KEY = 'doctor_session';
const USER_KEY = 'doctor_user';
const {
  persistWorkspaceSession,
  switchAndPersistWorkspaceSession,
} = require('./workspaceContext');

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
    return await persistWorkspaceSession(AsyncStorage, payload);
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

export async function getStoredDoctorUser() {
  const raw = await AsyncStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function refreshStoredDoctorWorkspaces() {
  const token = await getStoredDoctorSession();
  const user = await getStoredDoctorUser();
  if (!token || !user) return null;
  const payload = await listDoctorWorkspaces(token);
  return persistWorkspaceSession(AsyncStorage, {
    access_token: token,
    user,
    workspaces: payload?.workspaces || [],
  });
}

export async function switchStoredDoctorWorkspace(clinicId) {
  const token = await getStoredDoctorSession();
  return switchAndPersistWorkspaceSession(
    AsyncStorage,
    token,
    clinicId,
    switchDoctorWorkspace
  );
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
