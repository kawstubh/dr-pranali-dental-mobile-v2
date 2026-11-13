# Oralyn Web Portal — Release Checklist

**Status: BLOCKED — synthetic staging is operational, but production hosting, authenticated acceptance and security infrastructure are not release-ready.**

Last refreshed: 13 November 2026, 12:36 UTC.

## Product decisions

- One responsive web portal for desktop, tablet and mobile browsers. PWA installation is optional. No separate native apps or APK release.
- Patient discovery, clinic information and appointment requests are public and account-free. No patient accounts, password, OTP, signup/login or Supabase patient auth.
- Public appointment requests are not confirmed bookings. The clinic team contacts the patient to confirm.
- Doctor authentication remains mandatory.
- Clinic Assistant has a separate identity and least-privilege API. Never map Assistant to Doctor.
- Clinical intelligence is Doctor-only. No patient-facing diagnosis, self-diagnosis or clinical AI for Assistants.
- Google Business Profile is a discovery/referral entry point only. No booking-link change is claimed without authorized access and confirmation.
- Public booking references do not grant access to patient records. Patient-specific no-login record sharing remains deferred.

## Current staging architecture and runtime

### Canonical synthetic staging portal

- URL: https://oralyn-web-portal-spa.onrender.com
- Render service: srv-dbr2ttsipgvc739a4tmg
- Type/plan: Node/Vite web service, Free
- Branch: feat/oralyn-desktop-app
- Deployed commit: 7452e65d664cfc4e820cd564b303eb4425a7e610
- The public patient landing, booking page and Doctor deep route load after the service wakes.
- The service spins down after 15 minutes without inbound traffic and can return a temporary 503 on the first request while it restarts. Render documents a roughly one-minute wake-up. This is a staging preview only, not production hosting or an uptime guarantee.
- Do not upgrade or spend money without approval.

### Secondary static alias — not canonical

- URL: https://oralyn-web-portal-staging.onrender.com
- Render service: srv-dbr2qgek1f9s73dq82j0
- Type/plan: Static site, Free
- Branch/commit: feat/oralyn-desktop-app / 7452e65d664cfc4e820cd564b303eb4425a7e610
- The public patient home, booking and static Assistant pages load.
- Live test of /doctor/dashboard/ returned 404. Keep this alias secondary until deep-route fallback is fixed and the full Doctor workspace is independently verified.

### Synthetic staging API

- URL: https://oralyn-staging-api-assistant.onrender.com
- Render service: srv-dbr8m159fdbs73dl404g
- Branch: feat/oralyn-clinic-assistant-rbac
- Draft backend PR #60 head and latest LIVE deployment: b9e3efe31c1f78b0169fbb2d0d39cf3bcd7ad2ef
- Deploy: dep-dbrg3jjm8hqs73cun52g
- Fresh uncached checks after deployment: /health=200, /ready=200, /v1/dental/health=200; database=PostgreSQL, database identity verified=true, UIE configured=true, deployment commit matches the live head.
- Unauthenticated GET /v1/dental/patients, /v1/dental/appointments and /v1/dental/assistant/patients returned 401. Public booking GET returned 405 (POST-only). Legacy patient-record and patient-AI prefixes returned 404.
- Live OpenAPI includes Doctor and separate Assistant routes, but no patient-account/login paths and no patient-AI operation paths. An unused legacy PatientAIIn schema component remains; it is not an operation.
- No booking POST or clinical-data write was performed during this check.

## Current PRs and CI evidence

### Main portal — Draft PR #18

- Repository: kawstubh/dr-pranali-dental-mobile-v2
- Branch: feat/oralyn-desktop-app
- Current head: 7452e65d664cfc4e820cd564b303eb4425a7e610
- [Frontend CI #43388571558](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/runs/43388571558) passed 93/93 tests, zero dependency vulnerabilities, production build, live staging contract and desktop/tablet/mobile browser captures.
- The live patient pages display the full 20-service catalogue plus Other dental concern. No patient account, password or OTP is required.
- The live Doctor route serves the workspace entry; the CI Doctor fixture is synthetic and does not prove live authenticated CRUD persistence.

### Clinic Assistant React UI — Draft PR #21

- Branch: feat/oralyn-assistant-ui-rebased-20261113
- Head: d2e3be0416ad3e19490e968f577b401e36382e97
- [Assistant UI CI #43422232513](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/runs/43422232513) passed.
- The live portal currently serves the older static Assistant page from PR #18 at /assistant/. It uses only /v1/dental/assistant/* routes and holds the bearer token in page memory; sessionStorage is used only for receipt idempotency keys.
- PR #21 is the newer React Assistant UI. Its live staging contract step was deliberately skipped because it is not the canonical deployed branch. Treat its screenshots as synthetic UI evidence, not real authentication acceptance.
- Older PR #20 is superseded by PR #21; do not merge PR #20.

### Backend — Draft PR #60

- Repository: kawstubh/universal-intelligence-engine
- Branch: feat/oralyn-clinic-assistant-rbac
- Head: b9e3efe31c1f78b0169fbb2d0d39cf3bcd7ad2ef
- Engine and PostgreSQL CI workflows #43418656816 and #43418656822 passed.
- The exact head is now deployed to the isolated synthetic staging API, and fresh health/authorization checks passed.

### Expired private-upload cleanup — Draft PR #61

- Branch: feat/oralyn-expired-upload-cleanup-20261113
- Head: 87aa068b2759a60130722f28ea43815227c92d56
- [Engine Tests #43424740289](https://github.com/kawstubh/universal-intelligence-engine/actions/runs/43424740289): 241 passed, 3 skipped.
- [PostgreSQL CI #43424740181](https://github.com/kawstubh/universal-intelligence-engine/actions/runs/43424740181): 244 passed. Migration head 0014_document_quarantine_cleanup and nullable upload_object_key verified.
- Cleanup is dry-run by default; destructive mode requires DENTAL_DOCUMENTS_CLEANUP_ENABLED=true and explicit --apply. It rejects only old pending/verifying rows, deletes only the exact document-scoped pending object key, never selects verified object keys, and retries failed deletes.
- No Render Cron job is provisioned. Render Cron has a minimum $1/month charge per job, so no paid job was created. The lifecycle attestation remains false and document uploads remain disabled.

### Superseded patient/native work

- PR #17 (native Patient UI) and PR #19 (authenticated Patient records) are superseded. Do not merge them.
- Android APK workflows are not part of the Oralyn product.

## Public patient journey and booking

- Google Search/Maps/Business Profile -> public clinic home -> service/date/time request -> minimum contact details -> clinic confirmation.
- Public pages expose no clinical records, prescriptions, invoices, odontograms or guessable patient IDs.
- Twenty approved service labels and local images are present, plus Other dental concern.
- Required fields and future India-time validation are covered by CI browser tests.
- The public endpoint is POST-only; GET returns 405.
- Idempotency replay returns the same opaque reference and does not create a duplicate.
- Rate limiting is currently in-process and suitable only for single-instance staging. Production multi-instance deployment requires shared/distributed rate limiting or a trusted edge/WAF policy.
- Do not submit test bookings except through the synthetic CI contract and isolated synthetic database.

## Synthetic-only Neon database

- Project: silent-king-54610898
- Branch: br-steep-bonus-a1yqarg7
- Database: oralyn_staging
- Current migration: 0013_public_booking_idempotency
- Fresh aggregate counts: 6 patients, 6 appointments, 5 public booking requests, 0 Assistant accounts, 0 Assistant sessions, 0 receipts, 0 documents and 7 audit events.
- All six patient names are explicitly test/synthetic-marked; appointment and booking rows link to those synthetic patients. No patient record values were copied into this checklist.
- The private bucket oralyn-private-documents exists and is empty.
- Public connections remain enabled, HIPAA is disabled, history retention is six hours, and no snapshot schedule or snapshots are present.
- Never copy recovery or production patient data into this project.

## Documents and malware scanning

- Backend code implements private S3-compatible storage, signed URLs, quarantine-to-verified promotion, checksum/file-signature checks, fail-closed ClamAV scanning and Doctor review before any patient visibility.
- The private Neon bucket exists but no API storage credential/endpoint integration is verified.
- CI starts the pinned ClamAV 1.5.4 service, verifies a clean payload and detects Eicar-Test-Signature. This is CI evidence only; no persistent staging scanner service is provisioned.
- PR #61 implements cleanup code, but no scheduled runner is deployed. Keep DENTAL_DOCUMENTS_LIFECYCLE_CLEANUP_VERIFIED=false.
- Document uploads and sharing remain disabled.

## Clinic Assistant permission matrix

Allowed, clinic-scoped operations:
- Minimal patient contact intake.
- Appointment queue, confirmation, rescheduling and cancellation.
- Issued-invoice balance summaries.
- Recording payments already received, with idempotency and audit events.

Denied operations:
- Doctor patient directory/profile, odontogram, periodontal chart and clinical notes.
- Treatment-plan creation/editing, prescription signing or clinical decisions.
- Clinical intelligence, scan screening or Doctor-only AI.
- Private document upload/download/share.
- Owner, organisation, workspace settings and membership administration.
- Invoice creation, issue, edit or void.
- Patient account creation, linking or record sharing.

Backend tests cover allowed writes, 403 denials, cross-clinic isolation, Doctor-token rejection by Assistant endpoints, session logout/deactivation and receipt idempotency. The live staging database has zero Assistant accounts/sessions, so real Assistant login and persistence acceptance remain open.

## Release manifest and hard blockers

The build manifest now explicitly requires all of the following to be verified:

1. Private document storage and its API credentials.
2. Persistent malware scanner in isolated staging.
3. Backup and restore rehearsal.
4. Error monitoring and alerting.
5. Rollback rehearsal.
6. Real Doctor login and API-backed create/read/update persistence.
7. Real Assistant login and least-privilege acceptance.
8. Assistant UI-to-live-API acceptance.
9. Live cross-tenant staging E2E.
10. Authenticated Doctor and Assistant screenshots.
11. Production always-on hosting.
12. Production database verification.
13. Production custom-domain verification.
14. Explicit production deployment approval.

The staging Vite preview is a Free web service and sleeps after 15 minutes idle. It is not production hosting. The static alias is not canonical because the Doctor deep route returns 404. Do not mark production hosting verified based on either staging URL.

Never change manifest flags manually to make a release appear ready. All four production gates default to false until independently verified. The Render-hosted build manifest is generated without GitHub Actions verification environment variables, so it conservatively marks CI-only checks false. Use the GitHub Actions manifest artifact for the exact commit as the authoritative staging evidence; do not interpret the Render copy as a failed test run. Production gates remain false in both.

## Operational restrictions

- Keep PR #18, #21, #60 and #61 Draft and unmerged.
- Do not deploy production, migrate Neon main/recovery databases, change production secrets, spend money, resume paid infrastructure or delete patient/user data.
- Use synthetic data only in staging.
- Do not enable public patient record access or patient-specific share links.
- Do not change Google Business Profile booking links without authorized access and confirmation.
- A green CI build or mocked screenshot is not production release approval.
