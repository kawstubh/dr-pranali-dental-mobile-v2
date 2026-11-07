// Expo inlines EXPO_PUBLIC_* values into the native JavaScript bundle.
// Pull-request builds and local builds use staging; only a push to master
// explicitly injects the production API URL from the release workflow.
export const DOCTOR_API_URL =
  process.env.EXPO_PUBLIC_DENTAL_API_URL ||
  'https://dr-pranali-dental-api-staging.onrender.com';
