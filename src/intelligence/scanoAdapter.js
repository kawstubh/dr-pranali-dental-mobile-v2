/**
 * Scano integration boundary.
 *
 * This is intentionally provider-neutral: no Scano API is claimed to exist yet.
 * When Scano supplies an API/SDK/data contract, map it into this normalized model.
 */

export const SCANO_ADAPTER_VERSION = '0.1.0';

export function normalizeScanoScan(input = {}) {
  return {
    source: 'scano',
    integration_status: 'adapter_ready',
    external_scan_id: input.scanId || input.id || null,
    patient_reference: input.patientReference || input.patient_id || null,
    captured_at: input.capturedAt || input.created_at || null,
    modality: input.modality || 'unknown',
    findings: Array.isArray(input.findings) ? input.findings : [],
    raw_reference: input.rawReference || null,
    provenance: {
      provider: 'Scano',
      verified: false,
      note: 'Awaiting official Scano API/SDK contract; no live Scano connection is claimed.',
    },
  };
}

export function buildScanoIntelligenceRequest({ scan, patientContext = null, question = '', language = 'en', region = 'IN-MH' }) {
  const normalizedScan = normalizeScanoScan(scan);
  return {
    engine: 'universal-intelligence-engine',
    application: 'dr-pranali-dental',
    domain: 'dental-scanning',
    intent: 'scan-intelligence',
    language,
    region,
    patient_context: patientContext,
    scan: normalizedScan,
    question: String(question || '').trim(),
    constraints: {
      clinician_review_required: true,
      autonomous_diagnosis: false,
      autonomous_treatment_decision: false,
      autonomous_referral: false,
      autonomous_patient_notification: false,
    },
  };
}

export function buildScanoWebhookEvent({ event, payload }) {
  return {
    provider: 'scano',
    event: String(event || 'scan.updated'),
    received_at: new Date().toISOString(),
    payload: normalizeScanoScan(payload),
    status: 'awaiting_provider_contract',
  };
}
