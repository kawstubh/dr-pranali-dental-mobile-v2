# Oralyn Responsive Web Portal

Oralyn is one responsive browser-based portal for Dr. Pranali Dental Clinic. The same application serves desktop, tablet and mobile browsers. Installing it as a Progressive Web App is optional. Native Android/iOS applications and APKs are not part of this product or release.

## Product surfaces

- Public Patient journey: clinic information, the approved 20-service catalogue and an account-free appointment request. A request is not a confirmed appointment; the clinic contacts the patient to confirm.
- Doctor workspace: mandatory authenticated access to the patient directory, clinical profiles, appointments, odontogram, clinical notes, treatment plans, billing, reports and Doctor-only clinical intelligence.
- Clinic Assistant workspace: separate Assistant identity and least-privilege access for reception intake, patient contact, appointment queue/confirmation and approved billing collection. Assistants cannot access clinical notes, odontograms, treatment plans, prescriptions, clinical intelligence, document sharing or owner settings.

The Patient journey has no patient accounts, passwords, OTP, signup/login or Supabase patient authentication. Public pages never expose clinical notes, history, odontograms, prescriptions, invoices, private documents or guessable patient identifiers.

## Active application

The active web application is in the desktop directory. The former root-level Expo/React Native package has been retired from the product build. Any remaining legacy native source files are reference-only and are not built or deployed.

## Local development

Use Node.js 22 or a compatible current LTS release.

From the repository root, run npm run build or npm test. These workspace commands install the locked desktop dependencies and delegate to the active portal.

For development, change into the desktop directory, run npm ci, then npm run dev. Run npm test for regression tests and npm run build for the production bundle.

## Public booking and privacy

The public booking API is scoped to the configured Dr. Pranali master clinic until a verified clinic-slug model is implemented. It stores only the minimum information needed for the clinic to respond, uses timezone-aware future appointment requests and idempotency, and returns an opaque request reference. It is not a patient-record access token.

Patient-specific no-login sharing is deferred. Clinical records, invoices and private documents require authenticated server-side authorization and clinic tenancy checks. Document uploads and sharing remain disabled until private object storage and fail-closed malware scanning are configured.

## Clinical safety and roles

Clinical intelligence is Doctor-only and requires clinician review. The public Patient journey and Clinic Assistant workspace do not provide AI diagnosis, clinical decision support, treatment-plan editing or prescribing.

Assistant permissions are enforced by the backend, not only by hiding controls in the UI. Assistant sessions are distinct from Doctor sessions and are clinic-scoped. Production multi-instance deployment also requires shared rate limiting or a trusted edge/WAF policy.

## Staging and release

Use synthetic data only in staging. Never copy recovery or production patient data into a staging environment. Do not mark authenticated acceptance based on mocked CI fixtures; live Doctor and Assistant login plus API-backed persistence must be verified separately.

The release remains blocked until private document storage and malware scanning, cross-tenant E2E, authenticated Doctor/Assistant acceptance, backup/restore, monitoring and rollback are verified. Production deployment and production migrations require explicit approval.

Google Business Profile is a discovery/referral entry point. No booking-link change is claimed unless authorized access and confirmation exist.

## License

License terms must be selected before external commercial redistribution.
