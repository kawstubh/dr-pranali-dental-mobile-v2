# Oralyn Web Portal

One responsive React/Vite portal for desktop, tablet and mobile browsers. The portal can be installed as a PWA where supported; native Android apps and APKs are not part of this release.

## Product and security boundaries

- **Patient journey:** public clinic information and account-free appointment requests only. Patients do not create accounts or use passwords, OTP, signup/login, Supabase auth or linked-record sessions.
- **Public booking:** name, Indian mobile number, approved service, preferred date and time. Requests are not confirmed appointments until the clinic contacts the patient. The public API is scoped to the configured Dr Pranali master clinic.
- **Private records:** public patient pages never expose clinical notes, history, odontograms, prescriptions, treatment plans, invoices, receipts or private documents. Patients contact the clinic for copies of records.
- **Doctor workspace:** clinic-issued Doctor authentication is mandatory. Clinical records, billing, workspace administration and Doctor-only clinical intelligence remain server-authenticated and tenant-scoped.
- **Clinic Assistant:** separate identity and sign-in with least-privilege reception, appointment and approved payment-receipt permissions. Assistants cannot use Doctor clinical or AI routes.
- **AI:** clinical intelligence is Doctor-only. No patient-facing diagnosis, triage or self-diagnosis.
- **Google Business Profile:** discovery/referral entry point only. No booking-link change is claimed.
- **Staging data:** use synthetic records only. Never connect this portal to production or recovery data without separate approval.

## Local development

1. Copy `.env.example` to `.env.local`.
2. Set `VITE_DENTAL_API_URL` to the isolated synthetic staging API or an approved local test API.
3. Run `npm ci`, `npm test` and `npm run dev`.

The Vite development server proxies `/v1` to the configured API. Production builds require an explicit canonical HTTPS `VITE_DENTAL_API_URL`; they do not silently fall back to staging. Do not point the portal at production without separate approval.

## Validation

- `npm test` covers routing, account-free public booking, role boundaries, Doctor workflows, Clinic Assistant UI, service catalogue, PWA and branding.
- `npm audit --audit-level=low`
- `npm run build`
- GitHub Actions captures real responsive public pages at desktop, tablet and mobile sizes. Doctor and Assistant fixture screenshots are explicitly synthetic UI fixtures, not live authenticated acceptance.
- The build manifest records commit provenance, API origin and checksums and remains **BLOCKED** until every required live acceptance and operational gate is evidenced.

## Release gates

Private document uploads/sharing stay disabled until a private object-storage bucket and fail-closed malware scanning are provisioned and verified. Live Doctor and Assistant login with API-backed persistence, cross-tenant staging E2E, backup/restore, monitoring/alerting, rollback rehearsal, production database/domain and release approval are still required. A green CI build is not production release approval.
