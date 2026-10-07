import { request } from './doctorApi';

const INTELLIGENCE_TIMEOUT_MS = 45000;

function friendlyError(error) {
  const message = error?.message || 'Clinical AI is temporarily unavailable.';
  if (/PROVIDER_NOT_CONFIGURED/i.test(message)) return 'Clinical AI is not configured on the clinic server yet.';
  if (/PATIENT_CLINIC_ACCESS_DENIED/i.test(message)) return 'This patient is not accessible from your clinic.';
  if (/AI_.*LIMIT|429/i.test(message)) return 'The clinic AI usage limit has been reached. Please try again later.';
  if (/took too long|timeout/i.test(message)) return 'Clinical AI took too long to respond. Please retry.';
  if (/401|expired|Bearer access token/i.test(message)) return 'Your doctor session has expired. Please sign in again.';
  return message.replace(/\s*\(HTTP\s+\d+,[^)]+\)$/, '');
}

async function callAI(token, path, payload = {}) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await request(path, token, {
        method: 'POST',
        timeoutMs: INTELLIGENCE_TIMEOUT_MS,
        body: JSON.stringify(payload),
      });
    } catch (error) {
      lastError = error;
      if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 350));
    }
  }
  throw new Error(friendlyError(lastError));
}

export async function runDentalIntelligence(token, payload) {
  return callAI(token, '/v1/dental/intelligence/run', payload);
}
export async function doctorPatientSummary(token, patient_id) {
  return callAI(token, '/v1/dental/ai/doctor/patient-summary', { patient_id });
}
export async function doctorTreatmentPlan(token, patient_id) {
  return callAI(token, '/v1/dental/ai/doctor/treatment-plan', { patient_id });
}
export async function doctorChartInsights(token, patient_id) {
  return callAI(token, '/v1/dental/ai/doctor/chart-insights', { patient_id });
}
export async function doctorClinicalNote(token, patient_id, visit_context = '') {
  return callAI(token, '/v1/dental/ai/doctor/clinical-note', { patient_id, visit_context });
}
export async function doctorFollowUp(token, patient_id) {
  return callAI(token, '/v1/dental/ai/doctor/follow-up', { patient_id });
}
export async function doctorDailySummary(token) {
  return callAI(token, '/v1/dental/ai/doctor/daily-summary', {});
}
export async function doctorScanAnalysis(token, payload) {
  return callAI(token, '/v1/dental/ai/doctor/scan-analysis', payload);
}
export async function approveDoctorAI(token, payload) {
  return callAI(token, '/v1/dental/ai/doctor/approve', payload);
}
export function extractEvidence(result) {
  return Array.isArray(result?.sources) ? result.sources : (Array.isArray(result?.evidence) ? result.evidence : []);
}
