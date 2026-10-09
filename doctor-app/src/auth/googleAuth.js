import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://dr-pranali-dental-api.onrender.com';

async function post(path, payload) {
  const response = await fetch(API_URL + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const raw = await response.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch {}
  if (!response.ok) {
    const detail = data?.detail;
    const message = typeof detail === 'string' ? detail : detail?.message;
    throw new Error(message || data?.message || 'Sign-in failed (HTTP ' + response.status + ')');
  }
  if (!data?.access_token) throw new Error('The clinic server did not return a session.');
  await AsyncStorage.setItem('doctor_session', data.access_token);
  await AsyncStorage.setItem('doctor_user', JSON.stringify(data.user || {}));
  return data;
}

export async function signInWithPassword(email, password) {
  return post('/v1/dental/auth/password', { email: email.trim().toLowerCase(), password });
}

export async function setupFirstDoctor({ email, password, displayName, setupKey }) {
  return post('/v1/dental/auth/bootstrap', {
    email: email.trim().toLowerCase(),
    password,
    display_name: displayName.trim(),
    setup_key: setupKey,
  });
}

export async function getStoredDoctorSession() {
  return AsyncStorage.getItem('doctor_session');
}

export async function signOutDoctor() {
  const token = await AsyncStorage.getItem('doctor_session');
  if (token) {
    await fetch(API_URL + '/v1/dental/auth/logout', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
    }).catch(() => {});
  }
  await AsyncStorage.multiRemove(['doctor_session', 'doctor_user']);
}
