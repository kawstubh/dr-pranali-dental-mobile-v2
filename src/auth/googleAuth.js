import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

export const GOOGLE_WEB_CLIENT_ID = '56124766906-7qlnhr7b3l1iri981i6p984n12nma9ji.apps.googleusercontent.com';
export const SUPABASE_URL = 'https://jzxbeldubkhwnznrathu.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_85yIYbM2TMw4TyeJ9OWmRg_rwQDswtf';

GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID, scopes: ['email', 'profile'] });

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});

export async function signInWithGoogle() {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) throw new Error('Google sign-in was cancelled.');
  const idToken = response.data.idToken;
  if (!idToken) throw new Error('Google did not return an ID token. Check the Web OAuth client ID configuration.');
  const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
  if (error) throw new Error('Supabase rejected Google sign-in: ' + error.message + (error.status ? ' (HTTP ' + error.status + ')' : ''));
  return data.session;
}

export async function signOutGoogle() {
  await supabase.auth.signOut().catch(() => {});
  await GoogleSignin.signOut().catch(() => {});
}
