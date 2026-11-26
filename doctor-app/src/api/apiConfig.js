// Both native apps use the verified Oralyn staging API origin.
// A build-time override is supported, but an unset variable must never
// produce an empty URL or silently fall back to a retired host.
const DEFAULT_DOCTOR_API_URL = 'https://dr-pranali-dental-api-staging.onrender.com';

export const DOCTOR_API_URL = String(
  process.env.EXPO_PUBLIC_DENTAL_API_URL || DEFAULT_DOCTOR_API_URL
).trim();

export function requireDoctorApiUrl() {
  if (!DOCTOR_API_URL) {
    throw new Error('Oralyn clinic API is not configured for this build. Install the clinic-approved staging build.');
  }
  let parsed;
  try { parsed = new URL(DOCTOR_API_URL); } catch {
    throw new Error('Oralyn clinic API URL is invalid.');
  }
  if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.username || parsed.password ||
      parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error('Oralyn clinic API must be a canonical HTTPS origin.');
  }
  return parsed.origin;
}
