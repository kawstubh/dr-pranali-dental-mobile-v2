import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  listDoctorWorkspaces,
  switchDoctorWorkspace,
} from '../api/doctorApi';

const SESSION_KEY = 'doctor_session';
const USER_KEY = 'doctor_user';
const {
  persistWorkspaceSession,
  createSessionWriteCoordinator,
} = require('./workspaceContext');

const sessionWrites = createSessionWriteCoordinator(
  (session) => persistWorkspaceSession(AsyncStorage, session),
  () => AsyncStorage.multiRemove([SESSION_KEY, USER_KEY])
);

export class DoctorAuthError extends Error {
  constructor(message, code = '', status = null) {
    super(message);
    this.name = 'DoctorAuthError';
    this.code = code;
    this.status = status;
  }
}


async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new DoctorAuthError('The clinic service took too long to respond. Please try again.', 'REQUEST_TIMEOUT');
    }
    throw error;
  } finally {
    clearTimeout(timer);
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
  const generation = sessionWrites.beginMutation();
  try {
    const response = await fetchWithTimeout(apiUrl.replace(/\/$/, '') + '/v1/dental/auth/password/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    }, 15000);
    const payload = await parseResponse(response);
    if (!payload.access_token || !payload.user) {
      throw new DoctorAuthError('The clinic API returned an incomplete login session.', 'INVALID_SESSION_RESPONSE');
    }
    const saved = await sessionWrites.writeIfCurrent(generation, payload);
    if (!saved) {
      throw new DoctorAuthError('A newer session operation replaced this sign-in.', 'SESSION_SUPERSEDED');
    }
    return saved;
  } catch (error) {
    sessionWrites.finishMutation(generation);
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
  // A refresh is a read, not a new session mutation. It must not begin while a
  // login, logout or workspace switch is in flight.
  const generation = sessionWrites.captureRead();
  if (generation === null) return null;

  const token = await getStoredDoctorSession();
  const user = await getStoredDoctorUser();
  if (!token || !user) return null;

  const payload = await listDoctorWorkspaces(token);
  // Ignore responses from an older workspace/session context. The coordinator
  // serializes storage writes so a late response cannot restore an old token.
  return sessionWrites.writeIfCurrent(generation, {
    access_token: token,
    user,
    workspaces: payload?.workspaces || [],
  });
}

export async function switchStoredDoctorWorkspace(clinicId) {
  const generation = sessionWrites.beginMutation();
  try {
    const token = await getStoredDoctorSession();
    if (!token) {
      throw new DoctorAuthError('Sign in again before switching workspaces.', 'SESSION_REQUIRED');
    }
    const session = await switchDoctorWorkspace(token, clinicId);
    const saved = await sessionWrites.writeIfCurrent(generation, session);
    if (!saved) {
      throw new DoctorAuthError('A newer session operation replaced this workspace switch.', 'SESSION_SUPERSEDED');
    }
    return saved;
  } catch (error) {
    sessionWrites.finishMutation(generation);
    throw error;
  }
}

export async function signOutDoctor(apiUrl) {
  const generation = sessionWrites.beginMutation();
  let token = null;
  try {
    token = await AsyncStorage.getItem(SESSION_KEY);
  } catch {
    // Local sign-out must still clear credentials if the token read fails.
  }
  // Clear local credentials before the best-effort server logout. A later
  // sign-in increments the generation and cannot be erased by this logout.
  await sessionWrites.clearIfCurrent(generation);
  if (token) {
    await fetchWithTimeout(apiUrl.replace(/\/$/, '') + '/v1/dental/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
    }, 5000).catch(() => {});
  }
}
