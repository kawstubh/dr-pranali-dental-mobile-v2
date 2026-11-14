# Oralyn Web Portal — Current Release Checklist

**Last verified:** 14 November 2026, 12:38 UTC. All timestamps below are UTC.
**Release decision: BLOCKED for production.** This is a synthetic staging release candidate. All PRs remain open, Draft and unmerged.

## Product contract

- One responsive web portal for desktop, tablet and mobile; no native APK product.
- Public Patient discovery and appointment requests are account-free: no patient account, password, OTP, signup/login or Supabase patient auth.
- A public appointment request is a request for clinic confirmation, not a confirmed booking.
- Doctor authentication is mandatory.
- Clinic Assistant has a separate least-privilege identity and server-side API role. Never map Assistant to Doctor.
- Clinical intelligence and clinical decision support are Doctor-only.
- Patient-specific sharing remains disabled unless scoped, random, expiring and revocable links with server authorization and audit are implemented.
- Use the exact clinic-approved Oralyn logo and app icon.
- Google Business Profile is a discovery/referral entry point only; no booking-link change is claimed.

## Current repositories and pull requests

### Frontend — PR #18
- Repository: kawstubh/dr-pranali-dental-mobile-v2
- Branch: feat/oralyn-desktop-app; base: master.
- Latest application/product-code commit: `c90061d4001db1d5995c381b8e37148a529981ed`; latest release-verification/test-harness commit before this checklist refresh: `ef436c13ab675b13664d2625d7e9d4e6e81a42ea` (CI pending).
- PR: https://github.com/kawstubh/dr-pranali-dental-mobile-v2/pull/18
- State: open, Draft, unmerged.

### Backend — PR #60
- Repository: kawstubh/universal-intelligence-engine
- Branch: feat/oralyn-clinic-assistant-rbac; base: feat/oralyn-backend-release-integration-20261113.
- Latest PR #60 head: `fce527d034ccafe420f568d1216bb6e31a6a9327` (documentation-only); deployed application-code commit: `5f4adba355b56f69427f554925ad8cdaa7f81d40`.
- PR: https://github.com/kawstubh/universal-intelligence-engine/pull/60
- State: open, Draft, unmerged.

### Private-document cleanup — PR #61
- Exact head: 87aa068b2759a60130722f28ea43815227c92d56.
- PR: https://github.com/kawstubh/universal-intelligence-engine/pull/61
- State: open, Draft, unmerged.
- Code-only; no staging migration or Render deployment has been performed.

## Canonical staging services

### Frontend
- Render service: srv-dbr2ttsipgvc739a4tmg
- URL: https://oralyn-web-portal-spa.onrender.com
- Branch: feat/oralyn-desktop-app; repository kawstubh/dr-pranali-dental-mobile-v2.
- Service type: web service; plan: Free; region: Singapore; auto-deploy: enabled.
- Render health-check path is currently unset.
- Last confirmed LIVE deployment: `dep-dbs5bvs9v7es73bgk7l0` on release-harness commit `5523a8d28deaaa023e7bdaa1ca745ae9bce88771`; newer deploy for `a633d38cf6b99e31ab0291570b9fcb82c08a05fd` was building, and the latest `ef436c13ab675b13664d2625d7e9d4e6e81a42ea` deploy was queued at 12:38 UTC. These commits modify release checks/tests/workflow only; application UI code remains at product commit `c90061d4`.
- The current service instance started its Vite preview process at 12:00:39 UTC on 14 Nov 2026.
- Free plan may sleep and is not an always-on production host.

### Backend
- Render service: srv-dbr8m159fdbs73dl404g
- URL: https://oralyn-staging-api-assistant.onrender.com
- Branch: feat/oralyn-clinic-assistant-rbac; repository kawstubh/universal-intelligence-engine.
- Service type: web service; plan: Free; region: Singapore; auto-deploy: enabled.
- Render health-check path is currently unset; the API exposes /health and /ready and the frontend CI read-only contract checks both.
- Deployment `dep-dbrngjnf3r2c7391c5v0` remains LIVE on backend application commit `5f4adba355b56f69427f554925ad8cdaa7f81d40`. GitHub compare confirms the only intervening PR #60 change to head `fce527d0` is `docs/DENTAL_PRIVATE_DOCUMENTS.md`; no runtime redeploy was forced.
- Render logs show the previous API process shut down gracefully at 11:16:03 UTC and a new process completed startup at 12:01:21 UTC on 14 Nov 2026. This is consistent with the Free service sleeping/restarting; LIVE deployment metadata does not guarantee continuous uptime.

## CI and browser evidence

### Frontend exact-head workflow
- Workflow: Oralyn Desktop #43553354035.
- URL: https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/runs/43553354035
- Exact PR head: c90061d4001db1d5995c381b8e37148a529981ed.
- One validation job completed successfully; all 20 primary validation steps passed.
- Node test runner: 121 tests, 121 passed, 0 failed, 0 skipped.
- Three npm audit invocations reported 0 vulnerabilities.
- Staging-targeted production build passed.
- Live synthetic booking/idempotency contract passed.
- Read-only Assistant API contract passed.
- Headless Chrome responsive capture and release-gate recording passed.
- Chrome emitted D-Bus/UPower environment warnings in the container; these did not fail the browser job or produce application runtime errors.
- Build manifest reports RELEASE BLOCKED with 18 false release gates. Do not interpret successful CI as production approval.

### Current frontend artifacts (CI #43595421110; expire 28 Nov 2026)
- Actual desktop/tablet/mobile browser captures: https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/artifacts/14114780019
- Synthetic Doctor UI fixture: https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/artifacts/14113624994
- Synthetic Assistant UI fixture: https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/artifacts/14114790022
- Staging bundle and checksum manifest: https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/artifacts/14114077662
- Actual browser screenshot artifact SHA-256: eac05d5cc75ee5424af77ef87168d970914e9ba92cd6b4266339f59a68b76669.

### Backend CI
- Engine #43503951195: 236 passed, 3 skipped, 1 warning.
- PostgreSQL #43503951035: 239 passed, 1 warning.
- Both workflows completed successfully on backend PR head 5f4adba355b56f69427f554925ad8cdaa7f81d40.

### Cleanup PR CI
- Engine #43424740289: 241 passed, 3 skipped.
- PostgreSQL #43424740181: 244 passed.
- PR #61 remains code-only and undeployed.

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
- Production API origin remains unverified. Production builds fail closed unless a separately verified non-staging HTTPS origin is supplied.

## Clinic service catalogue

Repository and browser evidence confirms 20 unique service IDs, 20 home-page links, 20 local images and 21 booking choices (20 services plus Other). Other is a free-text concern, not a twenty-first service.

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

The clinic must confirm final production wording before launch; no additional services have been invented.

## Browser, accessibility and design evidence

The real headless Chrome capture in CI #43553354035 completed successfully for public Patient home/booking and Doctor/Assistant sign-in states. The workflow also generated synthetic Doctor and Assistant workspace fixtures.

Verified:
- Approved Oralyn wordmark and app icon loaded.
- Playfair Display and Plus Jakarta Sans loaded.
- PWA service worker registered, active and controlling the public and login pages.
- One shell cache; no authenticated/API records in the shell cache.
- Keyboard Tab reached an interactive control with visible focus on Doctor login, Assistant login and guest booking.
- Reduced-motion preference was honored; sign-in card animation and button transitions were disabled.
- No captured application runtime errors or unhandled API paths.
- Five required booking fields have associated labels.
- Browser capture verifies the booking API origin equals the configured staging API origin.
- Booking form exposes 20 catalogue choices plus Other and rejects empty/past submissions before network calls.

Doctor and Assistant workspace screenshots are synthetic CI fixtures, not real authenticated staging acceptance. The Doctor fixture does not prove live authenticated persistence. The Assistant fixture explicitly records staging_assistant_login_verified=false. The CI manifest records doctor_auth_e2e_verified=false, assistant_role_e2e_verified=false, cross_tenant_e2e_verified=false and authenticated_screenshots_verified=false.

## Clinic Assistant authorization

Backend source is src/universal_intelligence_engine/dental_assistant.py. Focused tests are tests/test_dental_assistant.py.

Automated backend tests cover:
- Separate Assistant identity and session, expiry, revocation and login rate limiting.
- Minimal patient contact intake.
- Appointment queue, confirmation, rescheduling and cancellation.
- Approved invoice-balance reads and payment-received recording with idempotency/audit.
- 403 denials for Doctor-only clinical operations, AI, notes, odontograms, treatment plans, prescriptions, private documents and owner/organisation settings.
- Cross-clinic isolation, Doctor-token rejection, revoked sessions and audit-failure rollback.
- Non-admin Doctor cannot manage Clinic Assistant accounts; account management is tenant-scoped.

These are automated backend tests, not real authenticated staging acceptance. Staging currently contains zero persisted Assistant accounts and zero Assistant sessions. Real Doctor/Assistant login and authenticated UI/API CRUD remain unverified.

## Synthetic Neon staging database

- Project: silent-king-54610898 (oralyn-staging-synthetic).
- Region: aws-ap-southeast-1 (Singapore); PostgreSQL 17.12.
- Provider project setting hipaa=false. This is a provider configuration flag, not a legal or compliance assessment.
- Database: oralyn_staging.
- Intended source branch: br-steep-bonus-a1yqarg7.
- Restored default branch: br-proud-scene-a1g7g3qo, restored from manual snapshot snap-late-surf-a1j1sljm.
- Both branches independently returned their actual neon.branch_id and migration 0013_public_booking_idempotency.
- Read-only aggregate SQL matched on both branches: 9 patients, 9 appointments, 8 public booking requests, 0 Assistant accounts, 0 Assistant sessions, 0 clinical notes, 0 chart entries, 0 periodontal entries, 0 treatment plans, 0 invoices, 0 receipts, 0 documents and 10 audit events.
- No patient names, contact details or clinical content were retrieved.
- Never copy real patient data into this project.

## Production data residency and privacy

The synthetic Neon project is in Singapore and has provider setting hipaa=false. It contains synthetic data only. Before any production patient data is introduced, require a documented review of the intended hosting/data-residency jurisdiction, applicable Indian privacy and healthcare obligations, provider contracts/terms, encryption and key ownership, access controls, retention/deletion, breach response, backups and cross-border transfer. The production database and hosting region have not been selected or approved.

Keep production_data_residency_privacy_review_verified false until the review is documented and approved.

## Private document storage and recovery

- The source branch has a private bucket oralyn-private-documents with zero objects.
- The restored default branch has no corresponding bucket.
- A branch-scoped Neon object-storage credential exists with storage:read and storage:write scopes. Its secret was not retrieved and it has not been installed in Render.
- Render/API storage integration is unverified.
- The Doctor-only document router is mounted, but storage configuration and lifecycle attestations fail closed when absent. Do not treat route registration as operational storage.
- Persistent private ClamAV scanner/quarantine is not provisioned or verified in Render staging.
- CI ClamAV/EICAR tests are scanner-protocol tests only, not a persistent live scanner.
- One manual snapshot exists: snap-late-surf-a1j1sljm.
- Automatic snapshot schedule is empty on both source and restored branches.
- Application-level recovery, failover and rollback are not rehearsed.
- PR #61 cleanup is code-only and unscheduled; no paid Render Cron is provisioned.

Keep document upload, download, sharing and patient-specific document links disabled.

## Render workspace inventory

Confirmed workspace: kawstubh's workspace (tea-da2mcb6gekts73b8e1fg). The inventory contains 14 services: 12 Oralyn-related and 2 CueScene services.

Canonical Oralyn services:
- oralyn-web-portal-spa — current responsive frontend.
- oralyn-staging-api-assistant — current staging API.

Additional Oralyn-related services still deployed:
- oralyn-web-portal-staging — duplicate static portal alias on the current portal branch.
- oralyn-staging-api-synthetic — older synthetic API.
- oralyn-patient-test and oralyn-doctor-test — legacy static sites on feat/oralyn-iphone-pwa.
- oralyn-patient-web and oralyn-doctor-web — legacy static sites on feat/oralyn-iphone-pwa.
- oralyn-multitenant-staging — separate multi-tenant backend branch.
- dr-pranali-dental-api-staging — integration/uie-dental branch.
- dr-pranali-dental-api — feat/dental-production-stack-v1 branch.
- universal-intelligence-engine — main branch.

The two CueScene services are unrelated to Oralyn. No non-canonical service has been suspended or deleted. Review dependencies and rollback requirements before retirement; no such retirement is authorized by this checklist.

## Runtime observations — 14 Nov 2026

Render log query window: 12:00:00–12:28:00 UTC for both canonical services.
- No request 5xx entries or application error/fatal entries were returned in this bounded window.
- API instance logged graceful shutdown at 11:16:03 UTC and new instance startup completed at 12:01:21 UTC.
- Frontend Vite preview process started at 12:00:39 UTC.
- Two external GET / probes to the API returned 404; the API health contract uses /health and /ready. No 5xx was observed.
- Render healthCheckPath is unset on both canonical services. The API health endpoints are checked by CI, but Render-native health-check monitoring is not configured.
- Direct public HTTP fetch was not used as acceptance evidence in this run; rely on exact Render deployment metadata and successful CI contracts.

## Release manifest — BLOCKED on 18 gates

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

The CI build manifest also contains additional staging evidence checks. A successful staging check does not turn a production gate true. Never set a gate true without its specific evidence.

## Approval boundary

Routine code edits, tests, commits and pushes to these existing feature branches, Draft PR updates and free synthetic staging checks are allowed.

Do not merge PRs, deploy production, apply production migrations, change production secrets, transfer real patient data, activate paid infrastructure, top up third-party wallets, delete patient/user data, suspend legacy Render services or change the Google Business Profile booking link without explicit approval.


## Release-watch correction — 14 Nov 2026 12:38 UTC

- Latest completed frontend code/test-harness run before this checklist refresh: [#43595421110](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/runs/43595421110), on `838d341dbd69cf45f7db7c63b8a1b0d56cf92b5a`. It completed successfully with **125/125 tests**, 0 failures, three npm audit invocations reporting 0 vulnerabilities, build success, read-only Assistant API contract success, responsive desktop/tablet/mobile captures, visible keyboard focus, reduced-motion support, approved logo/fonts, PWA active/controlling and zero captured runtime errors.
- That run's live booking probe did **not** write. The API health endpoint reported PostgreSQL ready, expected database host/name verified and expected Neon branch identity verified. The staging script could not retrieve PR #60 head because it queried GitHub without an authenticated token; it correctly left `ORALYN_STAGING_API_COMMIT_VERIFIED`, guest booking E2E and idempotency false. No booking POST request was sent by this run.
- Root cause was corrected without weakening gates: `verify-staging-contract.cjs` now uses a read-only GitHub Actions token for PR and compare reads; the workflow grants only `contents: read` and `pull-requests: read` and passes `GITHUB_TOKEN` only to the staging-contract step. GitHub compare allows the deployed API ancestor only when every intervening file is Markdown under `docs/`; source/config changes, divergence, incomplete compare or missing token fail closed. The synthetic idempotency key uses the actual deployed runtime commit.
- Added `desktop/scripts/staging-commit-equivalence.cjs` and four focused tests for docs-only acceptance and fail-closed rejection of runtime/config changes, divergent/truncated/malformed comparisons.
- The first token-permission regression run [#43595752698](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/runs/43595752698) failed one test because `capture-scripts.test.js` asserted workflow permissions against the script source instead of the workflow file. The assertion was corrected in commit `ef436c13ab675b13664d2625d7e9d4e6e81a42ea`. No application code was changed. CI for this corrected head was not yet visible at 12:38 UTC.
- Backend PR #60 current head is documentation-only `fce527d034ccafe420f568d1216bb6e31a6a9327`; compare against deployed runtime `5f4adba355b56f69427f554925ad8cdaa7f81d40` confirms the only changed path is `docs/DENTAL_PRIVATE_DOCUMENTS.md`. Backend documentation-head CI passed: Engine #43593700789 (236 passed, 3 skipped) and PostgreSQL #43593700798 (239 passed). The canonical API remains LIVE on the deployed application commit; no docs-only deployment was forced.
- Current API read-only health response reports `database_ready=true`, `database_identity_verified=true`, `database_branch_identity_verified=true`, and deployment commit `5f4adba355b56f69427f554925ad8cdaa7f81d40`. Render app logs for 12:30–12:36 UTC show successful `/health`, `/ready`, and `/v1/dental/health` responses; unauthenticated protected Doctor/Assistant routes returned 401 as expected; legacy patient-linked records returned 404 and public appointment GET returned 405 (POST-only). No request 5xx or app error/fatal entries were returned in the filtered window.
- Actual browser capture metadata from #43595421110 confirms Patient home, guest booking, Doctor login and Assistant login all had the PWA active and controlling, one shell cache with no forbidden entries, both approved fonts loaded, approved logo/app icon, visible keyboard focus, reduced motion honored and zero runtime errors. Doctor/Assistant UI fixture writes remain synthetic; `staging_authenticated_e2e=false`, `doctor_password_login_verified=false`, and `staging_assistant_login_verified=false`.
- Latest artifact ZIP digests: browser captures `sha256:783dfcf8e85563fe2c730b01ffb11116b555f7e4ae77eaf1a29ed3f63bac67db`; Doctor fixture `sha256:4dce3da86c22909296a4319c3fa6f0c01d332e3b4e873b10bf4cdff1d6be7226`; Assistant fixture `sha256:34edfcbcee5653cef3c96b507da19e1ec7992e5a3682291a185af361395f2dba`; build `sha256:6d7f378f4ea46439130d23ae3d743a8ab8f14013e725e2cabb9d2083efb00d1a`. Artifacts expire 28 Nov 2026 12:36 UTC.
- Render-native `healthCheckPath` is unset on both canonical services. The API exposes `/health` and `/ready`, but no Render-native health-check path is configured. No service configuration was changed in this run.
- Production release remains BLOCKED on 18 top-level gates. Keep private document actions disabled, all PRs Draft/unmerged, and all synthetic databases free of real patient data.
