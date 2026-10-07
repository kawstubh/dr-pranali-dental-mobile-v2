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

// Explicit native redirect: production Android builds must return to the
// installed app rather than an environment-dependent Expo URL.
export const googleRedirectUri = makeRedirectUri({
  native: 'drpranali-doctor://auth/callback',
});

function parseAuthParams(url) {
  const query = url.split('?')[1]?.split('#')[0] || '';
  const fragment = url.split('#')[1] || '';
  const parse = (value) =>
    Object.fromEntries(
      value.split('&').filter(Boolean).map((pair) => {
        const [k, v = ''] = pair.split('=');
        return [decodeURIComponent(k), decodeURIComponent(v.replace(/\+/g, ' '))];
      }),
    );
  return { ...parse(query), ...parse(fragment) };
}

async function ensureGoogleProviderEnabled() {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY },
    });
    if (response.ok) {
      const settings = await response.json();
      if (settings?.external?.google === false) {
        throw new Error(
          "Google sign-in is disabled on the authentication server. Enable Google in Supabase Authentication > Sign In / Providers.",
        );
      }
    }
  } catch (error) {
    if (error?.message?.includes("Google sign-in is disabled")) throw error;
    // Do not block login if the settings endpoint itself is temporarily unavailable.
  }
}

export async function signInWithGoogle() {
  await ensureGoogleProviderEnabled();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: googleRedirectUri,
      skipBrowserRedirect: true,
    },
  });
  if (error) {
    throw new Error(`Supabase OAuth setup failed: ${error.message}`);
  }
  if (!data?.url) {
    throw new Error('Google sign-in URL was not returned by Supabase.');
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, googleRedirectUri);

  if (result.type === 'cancel') {
    throw new Error(
      'Google sign-in was cancelled before the app received the callback. If you did not press Back/Close, the Android redirect is not reaching the app.',
    );
  }
  if (result.type === 'dismiss') {
    throw new Error('Google sign-in window was dismissed before verification completed.');
  }
  if (result.type === 'error') {
    throw new Error(
      result.error?.message ||
        result.errorCode ||
        'Google authentication returned an error.',
    );
  }
  if (result.type !== 'success' || !result.url) {
    throw new Error(`Google authentication ended with status: ${result.type}.`);
  }

  const params = parseAuthParams(result.url);
  if (params.error_description || params.error) {
    throw new Error(
      `Google/Supabase authentication failed: ${params.error_description || params.error}`,
    );
  }

  if (params.code) {
    const exchanged = await supabase.auth.exchangeCodeForSession(params.code);
    if (exchanged.error) {
      throw new Error(`Supabase session exchange failed: ${exchanged.error.message}`);
    }
    return exchanged.data.session;
  }

  if (params.access_token && params.refresh_token) {
    const session = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    if (session.error) {
      throw new Error(`Supabase session setup failed: ${session.error.message}`);
    }
    return session.data.session;
  }

  throw new Error(
    'Google returned to the app without an authorization code or session. Check the Supabase redirect allowlist.',
  );
}

export async function getGoogleSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signOutGoogle() {
  await supabase.auth.signOut();
}
