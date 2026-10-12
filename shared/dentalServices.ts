export type DentalService = {
  id: string;
  name: string;
  description: string;
  category: 'General' | 'Preventive' | 'Cosmetic' | 'Restorative' | 'Surgical' | 'Orthodontic' | 'Pediatric' | 'Emergency';
  icon: string;
};

export const DENTAL_SERVICES: DentalService[] = [
  { id: 'checkup', name: 'Dental Check-up & Consultation', description: 'Routine oral examination and personalised care advice.', category: 'General', icon: '🦷' },
  { id: 'scaling', name: 'Scaling & Cleaning', description: 'Professional removal of plaque and tartar.', category: 'Preventive', icon: '🪥' },
  { id: 'whitening', name: 'Teeth Whitening', description: 'Options to brighten the appearance of your smile.', category: 'Cosmetic', icon: '✨' },
  { id: 'filling', name: 'Tooth Filling', description: 'Restore a tooth affected by decay or minor damage.', category: 'Restorative', icon: '🦷' },
  { id: 'rct', name: 'Root Canal Treatment (RCT)', description: 'Treatment for infection or inflammation inside a tooth.', category: 'Restorative', icon: '🩺' },
  { id: 'crowns', name: 'Dental Crowns & Caps', description: 'Protect and restore a weakened or damaged tooth.', category: 'Restorative', icon: '👑' },
  { id: 'implants', name: 'Dental Implants', description: 'Assessment for replacing missing teeth with implants.', category: 'Surgical', icon: '🦷' },
  { id: 'extraction', name: 'Tooth Extraction', description: 'Assessment and removal of a tooth when indicated.', category: 'Surgical', icon: '🦷' },
  { id: 'braces', name: 'Braces Treatment', description: 'Orthodontic assessment and tooth alignment treatment.', category: 'Orthodontic', icon: '😁' },
  { id: 'aligners', name: 'Clear Aligners (Invisible Braces)', description: 'Assessment for clear removable orthodontic aligners.', category: 'Orthodontic', icon: '😁' },
  { id: 'dentures', name: 'Dentures (Full / Partial)', description: 'Removable options to replace missing teeth.', category: 'Restorative', icon: '😁' },
  { id: 'veneers', name: 'Veneers (Smile Makeover)', description: 'Cosmetic coverings to improve selected tooth features.', category: 'Cosmetic', icon: '✨' },
  { id: 'gum-care', name: 'Gum Treatment (Periodontal Care)', description: 'Assessment and care for gum inflammation and disease.', category: 'General', icon: '🩺' },
  { id: 'kids', name: 'Kids Dentistry (Child Care)', description: 'Dental check-ups and preventive care for children.', category: 'Pediatric', icon: '🧒' },
  { id: 'emergency', name: 'Emergency Dental Care', description: 'Urgent assessment for dental pain, injury or swelling.', category: 'Emergency', icon: '🚑' },
  { id: 'sensitivity', name: 'Tooth Sensitivity Treatment', description: 'Assessment and care for sensitivity to hot, cold or sweet foods.', category: 'General', icon: '❄️' },
  { id: 'sealants', name: 'Dental Sealants (Cavity Prevention)', description: 'Protective coatings for cavity-prone tooth surfaces.', category: 'Preventive', icon: '🛡️' },
  { id: 'hygiene', name: 'Oral Hygiene Education', description: 'Practical brushing, flossing and daily oral-care guidance.', category: 'Preventive', icon: '🪥' },
  { id: 'smile-makeover', name: 'Smile Makeover (Cosmetic Dentistry)', description: 'Personalised cosmetic options for your smile goals.', category: 'Cosmetic', icon: '✨' },
  { id: 'tmj', name: 'TMJ & Jaw Pain Treatment', description: 'Assessment of jaw discomfort, clicking and related symptoms.', category: 'General', icon: '🦴' },
];

export const DENTAL_SERVICE_CATEGORIES = ['All', ...Array.from(new Set(DENTAL_SERVICES.map(service => service.category)))];
