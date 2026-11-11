import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

export const GOOGLE_WEB_CLIENT_ID = '56124766906-7qlnhr7b3l1iri981i6p984n12nma9ji.apps.googleusercontent.com';
export const SUPABASE_URL = 'https://jzxbeldubkhwnznrathu.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_85yIYbM2TMw4TyeJ9OWmRg_rwQDswtf';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: true, flowType: 'pkce' },
});

export async function signInWithGoogle() {
  const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, queryParams: { access_type: 'offline', prompt: 'select_account' } },
  });
  if (error) throw new Error('Unable to start Google sign-in: ' + error.message);
  return null;
}

export async function signOutGoogle() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}