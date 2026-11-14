# Oralyn Web Portal — Current Release Checklist

**Release decision: BLOCKED for production.** This is a staging-only release candidate. All PRs remain Draft and unmerged.

Last verified: 14 November 2026 03:44 UTC. Timestamps in CI and Render evidence are UTC.

## Product contract

- One responsive web portal for desktop, tablet and mobile; no native APK product.
- Public Patient discovery and appointment requests are account-free: no patient account, password, OTP, signup/login or Supabase patient auth.
- Public appointment requests are requests for clinic confirmation, not confirmed bookings.
- Doctor authentication is mandatory.
- Clinic Assistant has a separate least-privilege identity and server-side API role. Never map Assistant to Doctor.
- Clinical intelligence and clinical decision support are Doctor-only.
- Patient-specific sharing remains disabled unless scoped, random, expiring and revocable links with server authorization and audit are implemented.
- Use the exact clinic-approved Oralyn logo and app icon.
- Google Business Profile is a discovery/referral entry point only; no booking-link change is claimed.

## Canonical staging services

### Frontend
- Last verified product-code commit: `a45d297441b68e2857d97082e6bd9bbb90b09e7f`.
- Browser accessibility QA change: `35b6194ea297fe2c01e627f435e52bcb373e8011`; source-assertion correction: `9d7e365e99b05bb1cfba36c5d1e235ab3667c7c4`.
- Latest verified PR head at 14 Nov 2026 01:10 UTC: `1cb2983e94d97c24dee79110242779f7100ffc83`. CI artifact metadata confirms branch `feat/oralyn-desktop-app` and this exact head SHA.
- Render service: `srv-dbr2ttsipgvc739a4tmg`.
- URL: https://oralyn-web-portal-spa.onrender.com
- At 14 Nov 2026 01:11 UTC, Render reported deployment `dep-dbrr9v1lodes739au84g` LIVE on commit `1cb2983e94d97c24dee79110242779f7100ffc83`.
- Plan: Free; may sleep and is not an always-on production host.
- Product-code CI #43534271565 and prior PR-head CI #43534712980 passed. Latest exact-head CI #43538942558 on `1cb2983e94d97c24dee79110242779f7100ffc83` completed all 20 validation steps successfully: **121/121 tests passed**, both npm audits found 0 vulnerabilities, production build and live staging/Assistant contracts passed, and keyboard/reduced-motion browser checks plus responsive captures passed.

### Backend

- Repository: kawstubh/universal-intelligence-engine
- Branch: feat/oralyn-clinic-assistant-rbac; canonical PR #60 remains open and Draft.
- Commit: 5f4adba355b56f69427f554925ad8cdaa7f81d40
- Render service: srv-dbr8m159fdbs73dl404g
- URL: https://oralyn-staging-api-assistant.onrender.com
- Deployment: dep-dbrngjnf3r2c7391c5v0 — LIVE on the exact backend PR head.
- Plan: Free; may sleep and is not an always-on production host.
- Engine CI #43503951195: 236 passed, 3 skipped, 1 warning.
- PostgreSQL CI #43503951035: 239 passed, 1 warning.

### Private document cleanup

- PR #61 remains open and Draft; head 87aa068b2759a60130722f28ea43815227c92d56.
- Engine CI #43424740289: 241 passed, 3 skipped.
- PostgreSQL CI #43424740181: 244 passed.
- No staging migration or Render deployment has been performed for PR #61.

## Public Patient journey and booking

- Public home: https://oralyn-web-portal-spa.onrender.com/patient/home/
- Public booking: https://oralyn-web-portal-spa.onrender.com/patient/booking/
- Booking sends a POST-only public appointment request with intelligence_request=false.
- Required fields: name, mobile, service, date and time.
- Future date/time validation uses Asia/Kolkata.
- Empty and past-time submissions are rejected before network calls.
- Idempotency replay returns the existing opaque request reference and does not create a duplicate.
- Public responses do not expose patient IDs, appointment IDs or clinical records.
- No patient account, OTP or password is required.

### Booking API origin safety

The public booking page previously hardcoded the staging API origin. That was unsafe for a future production build.

The current implementation:
- Uses a build-time meta value in the static booking page.
- Injects the API origin from VITE_DENTAL_API_URL.
- Uses the isolated synthetic staging API as the staging-only fallback.
- Fails a staging build if configured for a different API.
- Fails a production build if the API origin is missing or points to staging.
- Keeps production_public_booking_api_origin_verified false unless ORALYN_PRODUCTION_API_ORIGIN_VERIFIED is explicitly supplied after independent verification.
- The exact-head browser capture verifies that the booking page's injected origin equals the configured API origin.

The latest Render build log reports the staging API origin as configured. The production-origin gate remains false.

## Service catalogue

Repository and browser evidence confirms 20 unique service IDs, 20 home-page links, 20 local images and 21 booking choices (20 services plus Other). Booking labels match the service map.

1. Dental Check-up & Consultation
2. Gum Treatment (Periodontal Care)
3. Tooth Sensitivity Treatment
4. TMJ & Jaw Pain Treatment
5. Scaling & Cleaning
6. Dental Sealants (Cavity Prevention)
7. Oral Hygiene Education
8. Teeth Whitening
9. Veneers (Smile Makeover)
10. Smile Makeover (Cosmetic Dentistry)
11. Tooth Filling
12. Root Canal Treatment (RCT)
13. Dental Crowns & Caps
14. Dentures (Full / Partial)
15. Dental Implants
16. Tooth Extraction
17. Braces Treatment
18. Clear Aligners (Invisible Braces)
19. Kids Dentistry (Child Care)
20. Emergency Dental Care

Other dental concern is a free-text choice, not a twenty-first service. The clinic must confirm final production wording before launch; no missing services have been invented.

## Browser and design evidence
Accessibility-enhanced exact-head CI #43538942558 captured desktop, tablet and mobile states for Doctor login, Assistant login, public Patient home, public booking and the Assistant admin route denial.

Verified in the real headless Chrome capture:
- Approved Oralyn wordmark and app icon loaded.
- Playfair Display and Plus Jakarta Sans loaded.
- PWA service worker was registered, active and controlling on Doctor login, Assistant login, Patient home and booking.
- One shell cache was present; no authenticated/API routes or records were cached.
- Keyboard Tab reached an interactive control with a visible focus indicator on Doctor login, Assistant login and guest booking; :focus-visible was true on all three.
- Emulated prefers-reduced-motion: reduce was honored: sign-in card animation and sign-in button transitions were disabled.
- No captured application runtime errors or unhandled API paths.
- Patient legacy login redirects to the public Patient home.
- Browser-verified booking API origin equals the configured staging API origin.
- Booking form exposes five required fields, 20 catalogue choices plus Other, Asia/Kolkata future-date minimum, and blocks empty/past submissions before any network call.

Doctor and Assistant workspace screenshots remain synthetic CI fixtures, not real authenticated staging acceptance. The Doctor fixture records UI interactions and memory-only token behavior, but not live authenticated persistence; the Assistant fixture records reception/appointment/billing UI flows and explicitly reports staging_assistant_login_verified=false.

Latest CI #43538942558 artifacts (expire 28 Nov 2026): [real-browser desktop/tablet/mobile captures](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/artifacts/14091385226), [synthetic Doctor fixture](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/artifacts/14090424765), [synthetic Assistant fixture](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/artifacts/14091185620), [staging bundle and checksum manifest](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/artifacts/14091285490).

## Clinic Assistant authorization

Automated backend tests cover:
- Separate Assistant identity and session.
- Minimal patient contact intake.
- Appointment queue, confirmation, rescheduling and cancellation.
- Approved invoice-balance reads and payment-received recording with idempotency/audit.
- 403 denials for Doctor-only clinical operations, AI, notes, odontograms, treatment plans, prescriptions, private documents and owner/organisation settings.
- Cross-clinic isolation, Doctor-token rejection, revoked sessions and audit-failure rollback.

These are backend tests and synthetic UI fixtures. Staging contains zero persisted Assistant accounts and zero Assistant sessions. Real Assistant login and authenticated UI/API persistence are not accepted.

## Synthetic Neon staging database

- Project: silent-king-54610898
- Database: oralyn_staging
- Intended source branch: br-steep-bonus-a1yqarg7
- Actual PostgreSQL neon.branch_id: br-steep-bonus-a1yqarg7
- Restored default branch: br-proud-scene-a1g7g3qo (separate)
- Branch identity is checked server-side against DENTAL_EXPECTED_NEON_BRANCH_ID.
- Latest aggregate-only SQL on source and restored branches matched: 9 patients, 9 appointments, 8 public booking requests, 0 Assistant accounts/sessions, 0 clinical notes, 0 chart entries, 0 periodontal entries, 0 treatment plans, 0 invoices, 0 receipts, 0 documents and 10 audit events.
- After the latest synthetic idempotency replay, source branch still had 8 booking rows and 8 unique idempotency-key hashes; replay did not create a duplicate.
- All 9 patient rows are test/synthetic-marked.
- No patient names, phone numbers, clinical notes or records were retrieved.
- Never copy real patient data into this project.

## Production data residency and privacy

The synthetic Neon project `oralyn-staging-synthetic` (`silent-king-54610898`) reports region `aws-ap-southeast-1` (Singapore) and provider project setting `settings.hipaa=false`. It contains synthetic test data only; no real patient data may be placed there. The HIPAA setting is a provider configuration flag, not a legal or compliance assessment.

Before any production patient data is introduced, require a documented review of the intended hosting/data-residency jurisdiction, applicable Indian privacy and healthcare obligations, contractual/provider terms, encryption and key ownership, access controls, retention/deletion, breach response, backups and cross-border transfer. The production database and hosting region have not been selected or approved.

- Release gate: `production_data_residency_privacy_review_verified`.
- Keep this gate false until the review is documented and approved; do not infer approval from the synthetic staging region or provider settings.

## Private storage and recovery

- Private bucket oralyn-private-documents exists on the source branch and contains 0 objects.
- A default object-storage credential exists with storage:read and storage:write permissions. It is branch-scoped, not bucket/prefix-scoped. Its secret was not read or exposed.
- Render API storage integration is unverified.
- Persistent fail-closed malware scanning and quarantine are not provisioned.
- CI ClamAV/EICAR tests are scanner-protocol tests only, not a persistent live scanner.
- One manual snapshot exists: snap-late-surf-a1j1sljm, sourced from br-steep-bonus-a1yqarg7.
- Automatic snapshot schedule is empty.
- Application-level recovery, failover and rollback are not rehearsed.
- PR #61 cleanup remains code-only and unscheduled; no paid Render Cron is provisioned.

**Keep document upload, download, sharing and patient-specific document links disabled.**

## Runtime observations
- Render log query 14 Nov 2026 01:20:00–02:21:00 UTC: no application error/fatal entries and no request 5xx entries for either canonical service.
- The API instance logged a graceful shutdown at 01:26:44 UTC; the frontend preview process started at 01:53:01 UTC. The API is a free service and may sleep while idle; LIVE deployment metadata does not guarantee an active process or uptime.
- Latest successful live API contract evidence is CI #43538942558 (01:10–01:13 UTC): branch identity gate passed, read-only Assistant API contract passed, and one synthetic idempotent booking/replay passed. No additional live API request was sent during the later idle window.
- Direct public HTTP fetches of the API health endpoints and Patient booking page were unavailable at 02:20 UTC. The successful headless Chrome CI capture remains the browser evidence for this run.
- Read-only aggregate SQL on source and restored branches matched: 9 test-marked patients, 9 appointments, 8 public requests, 0 clinical notes, 0 treatment plans, 0 invoices, 0 receipts, 0 documents, 0 Assistant accounts/sessions and 10 audit events. Source booking rows and distinct idempotency-key hashes remained 8/8.
- The source branch has one private `oralyn-private-documents` bucket with zero objects. The branch-scoped default storage credential has `storage:read` and `storage:write`; its secret was not read, and Render API integration remains unverified.
- Automatic snapshot schedule remains empty; one manual snapshot exists. The API is a free service and may sleep; Render LIVE deploy status is not an uptime guarantee.
## Release manifest — BLOCKED on 17 gates

1. production_public_booking_api_origin_verified
2. private_document_storage_verified
3. document_malware_scanning_verified
4. backup_restore_verified
5. error_monitoring_verified
6. rollback_plan_verified
7. doctor_auth_e2e_verified
8. assistant_role_e2e_verified
9. production_guest_rate_limiting_verified
10. assistant_ui_api_verified
11. assistant_data_minimization_live_verified
12. cross_tenant_e2e_verified
13. authenticated_screenshots_verified
14. production_hosting_always_on_verified
15. production_database_verified
16. production_data_residency_privacy_review_verified
17. production_custom_domain_verified
18. production_deployment_approval_verified

## Release-watch update — 14 Nov 2026 03:44 UTC

- Current frontend PR head before this update was documentation commit `9e1f66ade971f2e7b105490db4ae32db5d39b856`. Its workflow #43546083855 completed successfully; all reported validation steps completed successfully. The run did not provide a numeric test summary, so no new test count is claimed. The latest fully itemized product/browser run remains #43538942558 with 121/121 tests.
- The current Render connector could not refresh service/deploy/log state in this non-interactive run because its workspace session was not selected. Last confirmed frontend deployment was `dep-dbrscfff3r2c73do83gg` LIVE on `9e1f66ade971f2e7b105490db4ae32db5d39b856` at 02:24 UTC; last confirmed API deployment was `dep-dbrngjnf3r2c7391c5v0` LIVE on backend head `5f4adba355b56f69427f554925ad8cdaa7f81d40`. These are last-known, not freshly revalidated statuses.
- Neon metadata reports the synthetic staging project in Singapore (`aws-ap-southeast-1`) with provider setting `hipaa=false`. This is not a compliance assessment; the project remains synthetic-only.
- Both source and restored branch automatic snapshot schedules are empty. One manual snapshot `snap-late-surf-a1j1sljm` exists. The private source bucket remains empty.
- Added an explicit production data-residency/privacy review gate. No region, provider contract, legal assessment or production data transfer is approved by this update.
- Doctor/Assistant authenticated acceptance, persistent malware quarantine, automated recovery and production deployment remain unverified. Keep document APIs disabled and all PRs Draft/unmerged.

The manifest is intentionally BLOCKED. Do not set any gate true without its specific evidence.

## Approval boundary

Routine code edits, tests, commits and pushes to these existing feature branches, Draft PR updates and free synthetic staging checks are allowed.

Do not merge PRs, deploy production, apply production migrations, change production secrets, transfer real patient data, activate paid infrastructure, top up third-party wallets, delete patient/user data or change the Google Business Profile booking link without explicit approval.
