import 'react-native-url-polyfill/auto';
import 'expo-sqlite/localStorage/install';
import { createClient } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://jzxbeldubkhwnznrathu.supabase.co';
const SUPABASE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_85yIYbM2TMw4TyeJ9OWmRg_rwQDswtf';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: globalThis.localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const googleRedirectUri = makeRedirectUri({
  scheme: 'drpranali',
  path: 'auth/callback',
});

function parseAuthParams(url) {
  const query = url.split('?')[1]?.split('#')[0] || '';
  const fragment = url.split('#')[1] || '';
  const parse = (value) => Object.fromEntries(
    value.split('&').filter(Boolean).map(pair => {
      const [k, v = ''] = pair.split('=');
      return [decodeURIComponent(k), decodeURIComponent(v.replace(/\+/g, ' '))];
    })
  );
  return { ...parse(query), ...parse(fragment) };
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: googleRedirectUri,
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;
  if (!data?.url) throw new Error('Google sign-in URL was not returned.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, googleRedirectUri);
  if (result.type !== 'success' || !result.url) {
    throw new Error('Google sign-in was cancelled.');
  }

  const params = parseAuthParams(result.url);
  if (params.error_description || params.error) {
    throw new Error(params.error_description || params.error);
  }

  if (params.code) {
    const exchanged = await supabase.auth.exchangeCodeForSession(params.code);
    if (exchanged.error) throw exchanged.error;
    return exchanged.data.session;
  }

  if (params.access_token && params.refresh_token) {
    const session = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    if (session.error) throw session.error;
    return session.data.session;
  }

  throw new Error('Google authentication completed without a Supabase session.');
}

export async function getGoogleSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signOutGoogle() {
  await supabase.auth.signOut();
}
