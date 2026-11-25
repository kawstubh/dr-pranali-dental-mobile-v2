// Keep the Doctor portal and public booking flow on the same staging API.
// The release workflow must explicitly inject the production API URL for releases.
export const DOCTOR_API_URL =
  process.env.EXPO_PUBLIC_DENTAL_API_URL ||
  'https://oralyn-staging-api-assistant.onrender.com';
