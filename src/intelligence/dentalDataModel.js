/**
 * Normalized dental intelligence data model.
 * Keeps the domain independent from any single scanner/vendor.
 */

export const DENTAL_DATA_MODEL_VERSION = '0.1.0';

export function createDentalPatient({ id, name, phone, metadata = {} }) {
  return { id: id || null, name: name || null, phone: phone || null, metadata };
}

export function createDentalVisit({ id, patientId, startedAt, treatment, notes = '' }) {
  return { id: id || null, patient_id: patientId || null, started_at: startedAt || null, treatment: treatment || null, notes };
}

export function createDentalScan({ id, patientId, provider = 'scano', externalId = null, capturedAt = null, findings = [] }) {
  return {
    id: id || null,
    patient_id: patientId || null,
    provider,
    external_id: externalId,
    captured_at: capturedAt,
    findings: Array.isArray(findings) ? findings : [],
  };
}

export function createTreatmentPlan({ id, patientId, diagnosisContext = null, options = [], selectedOption = null, status = 'draft' }) {
  return {
    id: id || null,
    patient_id: patientId || null,
    diagnosis_context: diagnosisContext,
    options,
    selected_option: selectedOption,
    status,
    clinician_approved: false,
  };
}

export function createDentalJourney({ patientId, visits = [], scans = [], treatments = [], followUps = [] }) {
  return { patient_id: patientId || null, visits, scans, treatments, follow_ups: followUps };
}
