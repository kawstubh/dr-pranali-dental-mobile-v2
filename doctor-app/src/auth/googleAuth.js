import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

export const GOOGLE_WEB_CLIENT_ID = '56124766906-7qlnhr7b3l1iri981i6p984n12nma9ji.apps.googleusercontent.com';
export const SUPABASE_URL = 'https://jzxbeldubkhwnznrathu.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_85yIYbM2TMw4TyeJ9OWmRg_rwQDswtfuchsiaal2';

GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID, scopes: ['email', 'profile'] });

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});

export class GoogleAuthError extends Error {
  constructor(message, code = '', status = null) {
    super(message);
    this.name = 'GoogleAuthError';
    this.code = code;
    this.status = status;
  }
}

export async function signInWithGoogle(apiUrl) {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) throw new GoogleAuthError('Google sign-in was cancelled.', 'CANCELLED');
    const googleIdToken = response.data.idToken;
    if (!googleIdToken) throw new GoogleAuthError('Google did not return an ID token. Check the Web OAuth client ID configuration.', 'NO_ID_TOKEN');

    const { data: supabaseData, error: supabaseError } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: googleIdToken,
    });
    if (supabaseError || !supabaseData.session?.access_token) {
      throw new GoogleAuthError(
        'Supabase rejected the Google ID token: ' + (supabaseError?.message || 'no Supabase session returned'),
        supabaseError?.name || 'SUPABASE_AUTH_ERROR',
        supabaseError?.status || null,
      );
    }

    const result = await fetch(apiUrl + '/v1/dental/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: supabaseData.session.access_token, google_id_token: googleIdToken }),
    });
    const raw = await result.text();
    let payload = null;
    try { payload = raw ? JSON.parse(raw) : null; } catch {}
    if (!result.ok) {
      const detail = payload?.detail;
      const message = typeof detail === 'string' ? detail : detail?.message;
      const status = detail?.google_status || detail?.status || result.status;
      const code = detail?.google_code || detail?.code || 'API_HTTP_' + result.status;
      throw new GoogleAuthError(
        (message || 'Google authentication failed') + ' (HTTP ' + status + ', code ' + code + ')',
        code,
        status,
      );
    }
    await AsyncStorage.setItem('doctor_session', payload.access_token);
    await AsyncStorage.setItem('doctor_user', JSON.stringify(payload.user || {}));
    return payload;
  } catch (error) {
    if (error instanceof GoogleAuthError) throw error;
    const code = error?.code || error?.name || 'GOOGLE_SIGN_IN_ERROR';
    throw new GoogleAuthError((error?.message || String(error)) + ' (code ' + code + ')', code, error?.status || null);
  }
}

export async function getStoredDoctorSession() { return AsyncStorage.getItem('doctor_session'); }

export async function signOutGoogle() {
  await AsyncStorage.multiRemove(['doctor_session', 'doctor_user']);
  await supabase.auth.signOut().catch(() => {});
  await GoogleSignin.signOut().catch(() => {});
}
