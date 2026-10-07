import { request } from './doctorApi';

const INTELLIGENCE_TIMEOUT_MS = 45000;

function friendlyError(error) {
  const message = error?.message || 'Clinical AI is temporarily unavailable.';
  if (/PROVIDER_NOT_CONFIGURED/i.test(message)) {
    return 'Clinical AI is not configured on the clinic server yet.';
  }
  if (/PATIENT_CLINIC_ACCESS_DENIED/i.test(message)) {
    return 'This patient is not accessible from your clinic.';
  }
  if (/took too long|timeout/i.test(message)) {
    return 'Clinical AI took too long to respond. Please retry.';
  }
  if (/401|expired|Bearer access token/i.test(message)) {
    return 'Your doctor session has expired. Please sign in again.';
  }
  return message.replace(/\s*\(HTTP\s+\d+,[^)]+\)$/, '');
}

export async function runDentalIntelligence(token, payload) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await request('/v1/dental/intelligence/run', token, {
        method: 'POST',
        timeoutMs: INTELLIGENCE_TIMEOUT_MS,
        body: JSON.stringify(payload),
      });
    } catch (error) {
      lastError = error;
      if (attempt === 0) {
        await new Promise(resolve => setTimeout(resolve, 350));
      }
    }
  }
  throw new Error(friendlyError(lastError));
}

export function extractEvidence(result) {
  return Array.isArray(result?.evidence) ? result.evidence : [];
}
