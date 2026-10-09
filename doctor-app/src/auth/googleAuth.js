import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

export const GOOGLE_WEB_CLIENT_ID = '56124766906-7qlnhr7b3l1iri981i6p984n12nma9ji.apps.googleusercontent.com';
export const SUPABASE_URL = 'https://jzxbeldubkhwnznrathu.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_85yIYbM2TMw4TyeJ9OWmRg_rwQDswtf';
export const AUTH_STAGE_TIMEOUT_MS = 20000;

GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID, scopes: ['email', 'profile'] });

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});

export class GoogleAuthError extends Error {
  constructor(message, code = '', status = null, stage = '') {
    super(message);
    this.name = 'GoogleAuthError';
    this.code = code || 'AUTH_ERROR';
    this.status = status;
    this.stage = stage || 'Unknown stage';
  }
}

function stageWithTimeout(stage, operation, onStage) {
  onStage?.(stage);
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new GoogleAuthError(stage + ' timed out after 20 seconds. Please retry.', 'AUTH_STAGE_TIMEOUT', null, stage)), AUTH_STAGE_TIMEOUT_MS);
  });
  return Promise.race([Promise.resolve().then(operation), timeout])
    .catch(error => {
      if (error instanceof GoogleAuthError) throw error;
      const code = error?.code || error?.name || 'AUTH_ERROR';
      throw new GoogleAuthError(error?.message || String(error), code, error?.status || null, stage);
    })
    .finally(() => clearTimeout(timeoutId));
}

export async function signInWithGoogle(apiUrl, onStage) {
  await stageWithTimeout('Opening Google...', () => GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true }), onStage);
  const response = await stageWithTimeout('Verifying with Google...', () => GoogleSignin.signIn(), onStage);
  if (!isSuccessResponse(response)) throw new GoogleAuthError('Google sign-in was cancelled.', 'CANCELLED', null, 'Verifying with Google...');
  const googleIdToken = response.data.idToken;
  if (!googleIdToken) throw new GoogleAuthError('Google did not return an ID token. Check the Web OAuth client ID configuration.', 'NO_ID_TOKEN', null, 'Verifying with Google...');

  const { data: supabaseData, error: supabaseError } = await stageWithTimeout('Signing in...', () => supabase.auth.signInWithIdToken({ provider: 'google', token: googleIdToken }), onStage);
  if (supabaseError || !supabaseData.session?.access_token) {
    throw new GoogleAuthError('Supabase rejected the Google ID token: ' + (supabaseError?.message || 'no Supabase session returned'), supabaseError?.status ? 'SUPABASE_HTTP_' + supabaseError.status : 'SUPABASE_AUTH_ERROR', supabaseError?.status || null, 'Signing in...');
  }

  const result = await stageWithTimeout('Contacting server...', async () => {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    let abortId;
    try {
      const requestTimeout = new Promise((_, reject) => {
        abortId = setTimeout(() => {
          if (controller) controller.abort();
          reject(new GoogleAuthError('Server request timed out after 20 seconds. Please retry.', 'SERVER_TIMEOUT', null, 'Contacting server...'));
        }, AUTH_STAGE_TIMEOUT_MS);
      });
      const request = fetch(apiUrl + '/v1/dental/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: supabaseData.session.access_token, google_id_token: googleIdToken }),
        ...(controller ? { signal: controller.signal } : {}),
      }).then(async response => {
        const raw = await response.text();
        let payload = null;
        try { payload = raw ? JSON.parse(raw) : null; } catch {}
        if (!response.ok) {
          const detail = payload?.detail;
          const message = typeof detail === 'string' ? detail : detail?.message;
          const code = detail?.google_code || detail?.code || 'API_HTTP_' + response.status;
          throw new GoogleAuthError((message || 'Google authentication failed') + ' (HTTP ' + response.status + ', code ' + code + ')', code, response.status, 'Contacting server...');
        }
        return payload;
      });
      return await Promise.race([request, requestTimeout]);
    } finally {
      if (abortId) clearTimeout(abortId);
    }
  }, onStage);

  if (!result?.access_token) throw new GoogleAuthError('Server returned no doctor session token.', 'NO_SERVER_SESSION', null, 'Contacting server...');
  await stageWithTimeout('Saving session...', async () => {
    await AsyncStorage.setItem('doctor_session', result.access_token);
    await AsyncStorage.setItem('doctor_user', JSON.stringify(result.user || {}));
  }, onStage);
  return result;
}

export async function getStoredDoctorSession() { return AsyncStorage.getItem('doctor_session'); }

export async function signOutGoogle() {
  await AsyncStorage.multiRemove(['doctor_session', 'doctor_user']);
  await supabase.auth.signOut().catch(() => {});
  await GoogleSignin.signOut().catch(() => {});
}
