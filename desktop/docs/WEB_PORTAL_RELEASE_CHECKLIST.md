# Oralyn Web Portal — Release Checklist

**Status: BLOCKED — synthetic staging is operational, but production hosting, authenticated acceptance and security infrastructure are not release-ready.**

Last refreshed: 13 November 2026, 17:41 UTC.

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
- Deployed commit: d532d067cb1dc7c5b3d4978d9d0c3fa46b1338a0 (deploy dep-dbrk758874rs73ft3d5g, LIVE)
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
- Draft backend PR #60 head and latest LIVE deployment: 39ed30ee82b9aa792fc19ea01639ee37268f1f49
- Deploy: dep-dbrjkrui0phs73822v1g
- Fresh uncached checks after deployment: /health=200, /ready=200, /v1/dental/health=200; database=PostgreSQL, database identity verified=true, UIE configured=true, deployment commit matches the live head.
- Unauthenticated GET /v1/dental/patients, /v1/dental/appointments and /v1/dental/assistant/patients returned 401. Public booking GET returned 405 (POST-only). Legacy patient-record and patient-AI prefixes returned 404.
- Live OpenAPI includes Doctor and separate Assistant routes, but no patient-account/login paths and no patient-AI operation paths. An unused legacy PatientAIIn schema component remains; it is not an operation.
- No booking POST or clinical-data write was performed during this check.

## Current PRs and CI evidence

### Main portal — Draft PR #18

- Repository: kawstubh/dr-pranali-dental-mobile-v2
- Branch: feat/oralyn-desktop-app
- Current head: d532d067cb1dc7c5b3d4978d9d0c3fa46b1338a0
- [Frontend CI #43469465006](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/runs/43469465006) passed 112/112 tests, npm audit reported zero vulnerabilities, production build, live synthetic staging contract, read-only Assistant API contract, responsive desktop/tablet/mobile browser captures, approved-brand assets and PWA/font checks. Browser evidence is synthetic UI fixtures, not real authenticated Doctor/Assistant acceptance.
- The live patient pages display the full 20-service catalogue plus Other dental concern. No patient account, password or OTP is required.
- The live Doctor route serves the workspace entry; the CI Doctor fixture is synthetic and does not prove live authenticated CRUD persistence.

### Clinic Assistant React UI — integrated in Draft PR #18

- The canonical portal now routes `/assistant/` through the React `AssistantApp` in the same responsive SPA.
- The Assistant bearer token remains in component memory; sessionStorage is used only for receipt idempotency keys. The UI calls only `/v1/dental/assistant/*` endpoints.
- CI #43469465006 captured synthetic Assistant screens and verified no Doctor clinical AI is shown. The fixture metadata explicitly records `staging_assistant_login_verified=false`; no real Assistant account/session exists in staging.
- PR #21 is superseded by the integrated UI and remains Draft/unmerged. Do not merge PR #21 or older PR #20.

### Backend — Draft PR #60

- Repository: kawstubh/universal-intelligence-engine
- Branch: feat/oralyn-clinic-assistant-rbac
- Head: 39ed30ee82b9aa792fc19ea01639ee37268f1f49
- [Engine CI #43446614361](https://github.com/kawstubh/universal-intelligence-engine/actions/runs/43446614361) passed 234 tests with 3 expected skips; [PostgreSQL CI #43446614469](https://github.com/kawstubh/universal-intelligence-engine/actions/runs/43446614469) passed 237 tests.
- The exact head is LIVE on the isolated synthetic staging API. Frontend CI #43469465006 verified the exact API commit, PostgreSQL identity, UIE, exact-origin CORS, security headers and unauthenticated private API denials.

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
- Fresh aggregate counts on the source branch: 8 patients (all 8 names explicitly test/synthetic-marked), 8 appointments, 7 public booking requests, 0 Assistant accounts, 0 Assistant sessions, 0 receipts, 0 documents and 9 audit events. No patient names, phone numbers or clinical content were read.
- All six patient names are explicitly test/synthetic-marked; appointment and booking rows link to those synthetic patients. No patient record values were copied into this checklist.
- The private bucket oralyn-private-documents exists and is empty.
- Public connections remain enabled, HIPAA is disabled and history retention is six hours. A manual snapshot `snap-late-surf-a1j1sljm` was created at 17:12 UTC and restored to branch `br-proud-scene-a1g7g3qo` with `restore_status=finalized`. Aggregate counts and migration `0013_public_booking_idempotency` match the source branch (8 patients, 8 appointments, 7 public requests, 0 Assistant accounts/sessions, 0 documents, 0 receipts and 9 audit events). The automatic snapshot schedule is still empty; no application-level failover test has been performed, so the backup/restore release gate remains false.
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

The exact-commit CI manifest for d532d067cb1dc7c5b3d4978d9d0c3fa46b1338a0 remains **BLOCKED**. Staging checks are not production approval.

The remaining 16 gates are:

1. Private document storage API integration and verified credentials.
2. Persistent fail-closed malware scanning and quarantine lifecycle.
3. Backup/restore rehearsal beyond the current manual snapshot-and-branch aggregate comparison; automatic snapshot schedule and application-level recovery are not verified.
4. Error monitoring and alerting.
5. Rollback rehearsal.
6. Real Doctor login and API-backed create/read/update persistence.
7. Real Clinic Assistant login and least-privilege acceptance.
8. Shared/distributed production guest-booking rate limiting (the current limiter is in-process and single-instance only).
9. Assistant UI-to-live-API authenticated acceptance.
10. Live Assistant data-minimization acceptance.
11. Authenticated cross-tenant staging E2E.
12. Real authenticated Doctor and Assistant screenshots.
13. Always-on production hosting.
14. Production database verification.
15. Production custom-domain verification.
16. Explicit production deployment approval.

The free Render preview is staging only and may sleep after 15 minutes idle. The public build manifest is conservative; use the exact-commit GitHub Actions manifest artifact for staging evidence. Never set flags manually to make a release appear ready.

Clinic confirmation of the exact production wording of the 20 catalogue labels is also required before publishing the live production catalogue. The labels were recovered from repository assets; do not invent or silently rename services.

## Operational restrictions

- Keep PR #18, #21, #60 and #61 Draft and unmerged.
- Do not deploy production, migrate Neon main/recovery databases, change production secrets, spend money, resume paid infrastructure or delete patient/user data.
- Use synthetic data only in staging.
- Do not enable public patient record access or patient-specific share links.
- Do not change Google Business Profile booking links without authorized access and confirmation.
- A green CI build or mocked screenshot is not production release approval.


## Latest verified release-watch update — 13 November 2026, 17:41 UTC

- Portal PR #18 is open, Draft and unmerged at `d532d067cb1dc7c5b3d4978d9d0c3fa46b1338a0`. CI #43469465006 completed successfully: 112/112 tests, zero npm audit vulnerabilities, production build, live synthetic staging contract, read-only Assistant API contract, responsive browser captures, PWA/fonts, approved logo assets and zero captured browser runtime errors.
- Render portal service `srv-dbr2ttsipgvc739a4tmg` deploy `dep-dbrk758874rs73ft3d5g` is LIVE on the same d532d commit. It is a Free service, not an uptime-backed production host.
- The CI browser capture verifies required fields, India-time future-date validation, no network request for empty/past submissions, 20 catalogue options plus Other, and no patient account requirement. The 20 repository labels are: Dental Check-up & Consultation; Scaling & Cleaning; Teeth Whitening; Tooth Filling; Root Canal Treatment (RCT); Dental Crowns & Caps; Dental Implants; Tooth Extraction; Braces Treatment; Clear Aligners (Invisible Braces); Dentures (Full / Partial); Veneers (Smile Makeover); Gum Treatment (Periodontal Care); Kids Dentistry (Child Care); Emergency Dental Care; Tooth Sensitivity Treatment; Dental Sealants (Cavity Prevention); Oral Hygiene Education; Smile Makeover (Cosmetic Dentistry); TMJ & Jaw Pain Treatment.
- The CI Doctor and Assistant screenshots/writes are synthetic fixtures. Metadata explicitly says `staging_authenticated_e2e=false`, `doctor_password_login_verified=false` and `staging_assistant_login_verified=false`. Do not treat these as real authenticated acceptance.
- Backend PR #60 remains Draft at `39ed30ee82b9aa792fc19ea01639ee37268f1f49`; Engine CI passed 234 tests with 3 skips and PostgreSQL CI passed 237 tests. Render API service `srv-dbr8m159fdbs73dl404g`, deploy `dep-dbrjkrui0phs73822v1g`, is LIVE on the exact same commit.
- The staging API contract verified PostgreSQL identity, UIE configuration, exact-origin CORS, security headers and 401 responses for unauthenticated private APIs. Assistant API permissions are enforced in backend tests: allowed reception/intake/appointment coordination and approved payment receipt recording; 403 denials for clinical notes, odontograms, clinical intelligence, prescriptions, owner settings, Doctor-account management and private documents; tenancy isolation, revocation, audit logging and idempotency. No Assistant account/session is persisted in staging.
- Read-only Render log queries from 17:10–17:41 UTC returned no app error/fatal logs and no 5xx request logs.
- Read-only Neon comparison of the source branch and finalized restored branch matched at migration `0013_public_booking_idempotency`: 8 explicitly test/synthetic-marked patients, 8 appointments, 7 public booking requests, 0 Assistant accounts/sessions, 0 receipts, 0 documents and 9 audit events. Snapshot `snap-late-surf-a1j1sljm` exists and the restore branch is finalized. This is partial backup/restore evidence only; automatic snapshots and application-level restore/failover remain unverified.
- The private `oralyn-private-documents` bucket exists and is empty. A scoped Neon storage credential exists, but backend API integration is not verified. No persistent ClamAV scanner or cleanup runner is provisioned. Uploads and sharing remain disabled.
- Live third-party browser-agent capture could not start because its wallet balance is negative; no top-up or spend was made. The GitHub Actions headless Chrome capture above passed. Do not use paid browser tooling without explicit approval.
- No production deployment, production migration, production secret change, paid resource, real booking, patient-data transfer or Google Business Profile change was performed.
