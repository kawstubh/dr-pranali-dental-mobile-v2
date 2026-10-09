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

export class PatientAuthError extends Error {
  constructor(message, code, stage) {
    super(message);
    this.name = 'PatientAuthError';
    this.code = code || 'AUTH_ERROR';
    this.stage = stage || 'Unknown stage';
  }
}

function stageWithTimeout(stage, operation, onStage) {
  onStage?.(stage);
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new PatientAuthError(stage + ' timed out after 20 seconds. Please retry.', 'AUTH_STAGE_TIMEOUT', stage)), AUTH_STAGE_TIMEOUT_MS);
  });
  return Promise.race([Promise.resolve().then(operation), timeout])
    .catch(error => {
      if (error instanceof PatientAuthError) throw error;
      const code = error?.code || error?.name || 'AUTH_ERROR';
      throw new PatientAuthError(error?.message || String(error), code, stage);
    })
    .finally(() => clearTimeout(timeoutId));
}

export async function signInWithGoogle(onStage) {
  await stageWithTimeout('Opening Google...', () => GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true }), onStage);
  const response = await stageWithTimeout('Verifying with Google...', () => GoogleSignin.signIn(), onStage);
  if (!isSuccessResponse(response)) throw new PatientAuthError('Google sign-in was cancelled.', 'CANCELLED', 'Verifying with Google...');
  const idToken = response.data.idToken;
  if (!idToken) throw new PatientAuthError('Google did not return an ID token. Check the Web OAuth client ID configuration.', 'NO_ID_TOKEN', 'Verifying with Google...');
  const result = await stageWithTimeout('Signing in...', () => supabase.auth.signInWithIdToken({ provider: 'google', token: idToken }), onStage);
  if (result.error) throw new PatientAuthError('Supabase rejected Google sign-in: ' + result.error.message, result.error.status ? 'SUPABASE_HTTP_' + result.error.status : 'SUPABASE_AUTH_ERROR', 'Signing in...');
  if (!result.data?.session) throw new PatientAuthError('Supabase returned no session.', 'NO_SESSION', 'Signing in...');
  return result.data.session;
}

export async function signOutGoogle() {
  await supabase.auth.signOut().catch(() => {});
  await GoogleSignin.signOut().catch(() => {});
}
