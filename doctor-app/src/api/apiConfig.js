// Expo inlines EXPO_PUBLIC_* values into the native JavaScript bundle.
// Pull-request builds use staging; only a push to master targets production.
export const DOCTOR_API_URL =
  process.env.EXPO_PUBLIC_DENTAL_API_URL ||
  'https://dr-pranali-dental-api.onrender.com';
