/**
 * Clinician copilot orchestration contracts.
 * The copilot may organize evidence and options; the clinician remains the decision maker.
 */

import { buildDoctorIntelligenceRequest } from './dentalIntelligence';
import { buildScanoIntelligenceRequest } from './scanoAdapter';

export const DENTAL_COPILOT_VERSION = '0.1.0';

export function buildClinicianCopilotRequest({ question, patientContext, treatmentContext, scan = null, module = 'patient-intelligence', language = 'en', region = 'IN-MH' }) {
  const base = buildDoctorIntelligenceRequest({
    module,
    question,
    patientContext,
    treatmentContext,
    language,
    region,
  });

  return {
    ...base,
    scan_context: scan ? buildScanoIntelligenceRequest({
      scan,
      patientContext,
      question,
      language,
      region,
    }).scan : null,
    output_requirements: {
      evidence_required: true,
      provenance_required: true,
      uncertainty_required: true,
      clinician_approval_required: true,
    },
  };
}

export function buildTreatmentReview({ patientContext, treatmentContext, scan, question = 'Summarize relevant evidence and treatment considerations for clinician review.' }) {
  return buildClinicianCopilotRequest({
    question,
    patientContext,
    treatmentContext,
    scan,
    module: 'treatment-research',
  });
}
