/**
 * Dr. Pranali Dental domain adapter for the shared Universal Intelligence Engine.
 *
 * This module defines the dental-domain contract only. Clinical decisions remain
 * with the dentist; AI output is advisory and must be reviewed by a qualified
 * clinician.
 */

export const DENTAL_ENGINE_VERSION = '0.1.0';

export function buildPatientCareRequest({ patient, treatment, language = 'en', region = 'IN-MH' }) {
  return {
    engine: 'universal-intelligence-engine',
    application: 'dr-pranali-dental',
    domain: 'dental-care',
    intent: 'patient-care-planning',
    language,
    region,
    patient_context: patient || {},
    treatment_context: treatment || {},
    constraints: {
      clinician_review_required: true,
      autonomous_diagnosis: false,
      autonomous_treatment_decision: false,
      autonomous_hospital_referral: false,
    },
  };
}

export function recommendCarePackage(treatment) {
  const name = String(treatment || '').toLowerCase();
  const rules = [
    ['scaling', ['soft toothbrush', 'floss', 'after-care instructions']],
    ['extraction', ['soft toothbrush', 'gauze guidance', 'after-care instructions']],
    ['root canal', ['oral-care instructions', 'follow-up reminder', 'after-care instructions']],
    ['braces', ['orthodontic brush', 'interdental cleaning aid', 'wax / care guidance']],
    ['implant', ['post-operative care guidance', 'specialist-approved oral-care items', 'follow-up reminder']],
    ['kids', ['child toothbrush', 'age-appropriate toothpaste guidance', 'parent instructions']],
  ];

  const matched = rules.find(([key]) => name.includes(key));
  return {
    treatment,
    matched: Boolean(matched),
    items: matched ? matched[1] : ['personalized oral-care instructions'],
    clinician_review_required: true,
  };
}

export function buildReferralRequest({ reason, specialty, region = 'IN-MH' }) {
  return {
    engine: 'universal-intelligence-engine',
    application: 'dr-pranali-dental',
    domain: 'dental-referral',
    intent: 'facility-or-specialist-research',
    reason,
    specialty: specialty || null,
    region,
    clinician_review_required: true,
    autonomous_referral: false,
  };
}


export function buildDoctorIntelligenceRequest({
  module,
  question,
  patientContext = null,
  treatmentContext = null,
  language = 'en',
  region = 'IN-MH',
}) {
  const allowedModules = [
    'patient-intelligence',
    'clinical-research',
    'treatment-research',
    'product-intelligence',
    'supplier-intelligence',
    'practice-intelligence',
    'referral-intelligence',
  ];

  if (!allowedModules.includes(module)) {
    throw new Error('Unsupported dental intelligence module');
  }

  return {
    engine: 'universal-intelligence-engine',
    application: 'dr-pranali-dental',
    domain: 'dental-care',
    intent: module,
    question: String(question || '').trim(),
    language,
    region,
    patient_context: patientContext,
    treatment_context: treatmentContext,
    constraints: {
      clinician_review_required: true,
      patient_data_authorized_only: true,
      autonomous_diagnosis: false,
      autonomous_treatment_decision: false,
      autonomous_product_purchase: false,
      autonomous_referral: false,
    },
  };
}

export function buildSupplierResearchRequest({ product, region = 'IN-MH', language = 'en' }) {
  return buildDoctorIntelligenceRequest({
    module: 'supplier-intelligence',
    question: `Find manufacturers, authorized distributors, regional sellers and availability for: ${product}`,
    language,
    region,
  });
}

export function buildClinicalResearchRequest({ question, treatment, region = 'IN-MH', language = 'en' }) {
  return buildDoctorIntelligenceRequest({
    module: 'clinical-research',
    question,
    treatmentContext: treatment,
    language,
    region,
  });
}
