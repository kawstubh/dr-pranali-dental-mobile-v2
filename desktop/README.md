# Oralyn Web Portal

One responsive React/Vite portal for desktop, tablet and mobile browsers. The portal can be installed as a PWA where supported; native Android apps and APKs are not part of this release.

## Product and security boundaries

- **Patient journey:** public clinic information and account-free appointment requests only. Patients do not create accounts or use passwords, OTP, signup/login, Supabase auth or linked-record sessions.
- **Public booking:** name, Indian mobile number, approved service, preferred date and time. Requests are not confirmed appointments until the clinic contacts the patient. The public API is scoped to the configured Dr Pranali master clinic. Staging CI may submit one clearly synthetic `Oralyn Synthetic` request only after database-identity verification, then replay the same idempotency key to prove no duplicate; never use real patient details in CI.
- **Private records:** public patient pages never expose clinical notes, history, odontograms, prescriptions, treatment plans, invoices, receipts or private documents. Patients contact the clinic for copies of records.
- **Doctor workspace:** clinic-issued Doctor authentication is mandatory. Clinical records, billing, workspace administration and Doctor-only clinical intelligence remain server-authenticated and tenant-scoped.
- **Clinic Assistant:** separate identity and sign-in with least-privilege reception, appointment and approved payment-receipt permissions. The appointment queue exposes patient contact, requested time and status only; it does not expose procedure/treatment type or clinical notes. Assistants cannot use Doctor clinical or AI routes. A read-only route/CORS probe is contract evidence only; it does not count as authenticated Assistant UI-to-API persistence or live data-minimization acceptance. CI-only Doctor/Assistant UI fixtures and screenshots are visual evidence only; they do not count as real authenticated acceptance.
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

- The public booking catalogue contains 20 clinic-approved service labels plus Other dental concern. Do not invent additional services.
- Guest booking uses India-time future validation, idempotency and anti-abuse rate limiting. The current limiter is in-process and is suitable only for the single-instance staging service. Production multi-instance hosting must use shared/distributed rate limiting or a trusted edge/WAF policy; the manifest keeps `production_guest_rate_limiting_verified` false until that is tested.
- Doctor bearer tokens are held in component memory only. They are not written to localStorage or sessionStorage, and refreshing the page signs the Doctor out. This is intentional; live Doctor login and API-backed create/read/update acceptance are still required.
- Clinic Assistant is a separate identity and API role. CI verifies allowed reception/payment-receipt operations, HTTP 403 denials for clinical/owner operations, cross-clinic isolation, revocation and receipt idempotency. No real Assistant account/session or authenticated UI-to-live-API persistence acceptance exists in staging yet.
- Private document uploads, downloads and sharing remain disabled until the private bucket is connected to the API and persistent fail-closed malware scanning is verified. The staging bucket is private and empty; CI ClamAV tests are not a persistent scanner deployment.
- Backup/restore rehearsal, error monitoring and alerting, rollback rehearsal, authenticated Doctor/Assistant screenshots, always-on production hosting, production database, production custom domain and explicit production deployment approval remain outstanding.

A green CI build or synthetic fixture is not production release approval.
