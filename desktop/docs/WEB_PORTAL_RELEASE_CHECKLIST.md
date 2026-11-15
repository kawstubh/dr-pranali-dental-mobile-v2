# Oralyn Web Portal — Current Release Checklist

**Last verified:** 15 November 2026, 04:42 UTC (10:12 IST). All timestamps in the verification log below are UTC unless marked IST.
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
- Current PR head: `a2f11e8dcc55076bb032bc5c4d4db5f895835dee` (`test(oralyn): cover horizontal overflow assertion`). Exact-head CI #751 completed successfully: **132 tests passed, 0 failed, 0 skipped**; all 22 workflow steps passed. Four npm audit invocations reported zero vulnerabilities; staging-targeted build, live synthetic guest-booking/idempotency contract, read-only Assistant API contract, security-header check, responsive Chrome capture and all four artifacts passed. The 15-screen browser capture measured root/body scroll width against viewport width and recorded zero horizontal overflow. The 28-commit range from UI baseline `c90061d4001db1d5995c381b8e37148a529981ed` includes API-origin/transport hardening in `desktop/src/api.js`, `desktop/vite.config.js`, `App.js`, `doctor-app/src/api/apiConfig.js`, `doctor-app/src/api/doctorApi.js` and `src/api/dentalApi.js`, plus tests, workflow and documentation; desktop React view/style files were not among the changed paths in that baseline comparison.
- PR: https://github.com/kawstubh/dr-pranali-dental-mobile-v2/pull/18
- State: open, Draft, unmerged.

### Backend — PR #60
- Repository: kawstubh/universal-intelligence-engine
- Branch: feat/oralyn-clinic-assistant-rbac; base: feat/oralyn-backend-release-integration-20261113.
- Latest PR #60 head: `a9bbd7df1d3d0c6bc1cc945c3d56a4e421bbc024`; last recorded deployed application-code commit: `5f4adba355b56f69427f554925ad8cdaa7f81d40`. GitHub compare confirms 6 commits ahead, 0 behind; the range includes runtime changes in `dental_document_scanner.py` and `dental_documents.py`, plus tests/docs. These runtime changes are not deployed. Current exact-head Engine Tests #43677883185 passed 242, skipped 4, with one warning; exact-head CI #43677883167 remains in progress.
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
- Last recorded frontend deployment `dep-dbshmgvj5k9c73erjr30` was reported LIVE on exact PR head `a2f11e8dcc55076bb032bc5c4d4db5f895835dee`. It was not independently re-queried in this verification because the Render connector requires explicit workspace selection; no workspace was selected and no deploy was triggered.
- The current service instance started its Vite preview process at 12:00:39 UTC on 14 Nov 2026.
- Free plan may sleep and is not an always-on production host.

### Backend
- Render service: srv-dbr8m159fdbs73dl404g
- URL: https://oralyn-staging-api-assistant.onrender.com
- Branch: feat/oralyn-clinic-assistant-rbac; repository kawstubh/universal-intelligence-engine.
- Service type: web service; plan: Free; region: Singapore; auto-deploy: enabled.
- Render health-check path is currently unset; the API exposes /health and /ready and the frontend CI read-only contract checks both.
- Last recorded deployment `dep-dbrngjnf3r2c7391c5v0` was reported LIVE on backend application commit `5f4adba355b56f69427f554925ad8cdaa7f81d40`. It was not independently re-queried in this verification. Current PR #60 contains additional runtime scanner/document-upload preflight changes that are not deployed; do not treat the deployed API as containing this hardening.
- Render logs show the previous API process shut down gracefully at 11:16:03 UTC and a new process completed startup at 12:01:21 UTC on 14 Nov 2026. This is consistent with the Free service sleeping/restarting; LIVE deployment metadata does not guarantee continuous uptime.

## CI and browser evidence

### Frontend exact-head workflow
- Current frontend head: `a2f11e8dcc55076bb032bc5c4d4db5f895835dee`.
- Exact-head workflow [#43668768898](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/runs/43668768898) completed successfully: **132 tests passed, 0 failed, 0 skipped**; all 22 workflow steps succeeded.
- Four npm audit invocations reported zero vulnerabilities. Staging-targeted production build, synthetic booking/idempotency, read-only Assistant API contract, security headers, responsive Chrome capture and four artifact uploads passed.
- Browser capture recorded 15 desktop/tablet/mobile screens across Doctor login, Assistant login, Patient home, guest booking and Assistant owner-route redirect. Root/body scroll width equaled viewport width on all 15 captures: zero horizontal overflow. Application runtime-error array was empty.
- Approved logo/app icon, Playfair Display and Plus Jakarta Sans, keyboard-visible focus, reduced-motion and PWA service-worker control were verified. One shell cache was present; no API/auth/storage paths were cached.
- Doctor/Assistant workspace screenshots and writes are **CI synthetic fixtures**, not real authenticated staging acceptance. Metadata explicitly records `staging_authenticated_e2e=false`, `doctor_password_login_verified=false` and `staging_assistant_login_verified=false`.
- Actual artifacts: [15 browser screenshots](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/artifacts/14143293650), [Doctor synthetic fixture](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/artifacts/14142769780), [Assistant synthetic fixture](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/artifacts/14143507484), [staging bundle and manifest](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/artifacts/14142749736). Artifacts expire 29 Nov 2026 around 02:41 UTC.
- Build manifest reports RELEASE BLOCKED with 18 false production gates. CI success is not production approval.

### Backend PR #60
- Current head: `a9bbd7df1d3d0c6bc1cc945c3d56a4e421bbc024`.
- Exact-head Engine Tests [#43677883185](https://github.com/kawstubh/universal-intelligence-engine/actions/runs/43677883185) completed successfully: **242 passed, 4 skipped, 1 warning**.
- Exact-head PostgreSQL/ClamAV integration CI [#43677883167](https://github.com/kawstubh/universal-intelligence-engine/actions/runs/43677883167) is still running its `pytest -q` step. Do not mark the backend release checks fully green until it completes.
- The immediately preceding backend head `4e9f0fb8` passed CI #43677724662 (245 passed, 1 warning) and Engine Tests #43677724652 (242 passed, 3 skipped, 1 warning). These are parent-head results, not substitutes for current-head CI.
- The new live ClamAV integration test exercises the NUL-terminated `zPING`/`PONG` readiness protocol against the isolated CI ClamAV service.

### Earlier backend and cleanup evidence
- Previous backend PR #60 head `3fbfff0e`: Engine CI #43634918023 passed 240; PostgreSQL CI #43634918034 passed 237, skipped 3.
- Cleanup PR #61 remains code-only and undeployed; previous CI results are historical and do not imply live scanner/storage operations.

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

Render log query window: 15:50:00–16:08:00 UTC for both canonical services.
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


## Latest exact-head verification — 14 Nov 2026 12:41 UTC

- [Frontend CI #43595896642](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/runs/43595896642) completed successfully on PR #18 head `13bcc4263f0db9b4affd863d9cad41ea7440e8d1`: **125/125 tests passed**, 0 failures; all three npm audit invocations reported 0 vulnerabilities; staging build, live staging contract, read-only Assistant API contract, responsive browser captures, release manifest and all artifact uploads passed.
- The authenticated staging contract now passes the previously blocked code-equivalence gate. It verified that the live API runtime commit `5f4adba355b56f69427f554925ad8cdaa7f81d40` is an ancestor of PR #60 head `fce527d034ccafe420f568d1216bb6e31a6a9327`, and GitHub confirms the only intervening change is Markdown under `docs/`. Runtime/config differences, divergence, incomplete comparison and missing token remain fail-closed.
- Live staging checks passed: backend health/readiness and UIE, database host/name identity, Neon branch identity, exact portal CORS/POST preflight, security headers, account-free Patient routes, and all 20 service labels plus Other in both API schema and public booking UI.
- Synthetic-only public booking POST was accepted and returned a public reference without patient or appointment identifiers. Same-key replay returned the same public reference with `already_received`. The API CI contract sent two POSTs per run across two overlapping runs; all returned HTTP 200. Read-only SQL before/after shows both Neon branches remain matched: 9 patients, 9 appointments, 8 public requests and 8 distinct idempotency hashes. The existing synthetic request was replayed; no duplicate row, patient or appointment was created.
- The second full CI run on the documentation-only head confirms the earlier code fix: PR metadata is read using the workflow's read-only `GITHUB_TOKEN`; the token is not logged. Permissions are limited to `contents: read` and `pull-requests: read`.
- Browser metadata: Patient home and guest booking at desktop/tablet/mobile; five required labels, future IST validation, empty/past submit prevented without network calls; 20 services plus Other; approved logo/app icon; Playfair Display and Plus Jakarta Sans; PWA active and controlling with one shell cache and no forbidden entries; visible keyboard focus; reduced-motion respected; zero captured runtime errors and no unhandled API paths.
- Doctor and Assistant UI artifacts remain synthetic fixtures, not real authentication. The manifest continues to report `staging_authenticated_e2e=false`, `doctor_password_login_verified=false` and `staging_assistant_login_verified=false`. The read-only Assistant API contract used no credentials or writes.
- Latest artifact ZIP digests: browser captures `sha256:331cf473ed3fe778968a9f0966be8b7eb30c7a57b6d2fa1414f00bb78a9de07b`; Doctor fixture `sha256:fb5297e5ae1a5918e429c815e7955b01034ef0f8baf130a467d2ca4ce6c655d5`; Assistant fixture `sha256:33cb79b3ec1b3fa6d3498a97e68df38cecdc2e6e76166740599c50b1972ab428`; build `sha256:bf4ed76d69365385471f04bbfe9f0a9d4dac2f238c35f2b4cf4346b271a88369`. Artifacts expire 28 Nov 2026 12:41 UTC.
- Render logs 12:38–12:41 UTC: no application error/fatal entries and no request 5xx entries for either canonical service. API log entries include the expected 401 responses for unauthenticated protected routes; legacy linked-record GET is 404 and public appointment GET is 405 because the public booking route is POST-only. The four synthetic POSTs returned 200.
- Canonical frontend deployment is LIVE on `13bcc426`; canonical API remains LIVE on application commit `5f4adba3`. No production deployment, migration, secret change or real patient-data transfer occurred.
- Production release remains BLOCKED on the same 18 top-level gates. Keep document actions disabled, PRs Draft/unmerged and synthetic data isolated.


## Latest exact-head verification — 14 Nov 2026 16:08 UTC

- GitHub branch comparison confirms PR #18 branch `feat/oralyn-desktop-app` is exactly at `a5809407213105f5eec1f53baeb1680777807fa6` (no ahead/behind commits). The exact-head workflow [#43596130348](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/runs/43596130348) completed successfully: **125/125 tests passed**, 0 failures; all three npm audit invocations reported 0 vulnerabilities; staging build, live synthetic booking/idempotency contract, read-only Assistant API contract, responsive browser capture and all artifact uploads passed. Workflow token permissions in the job log are Contents: read, Metadata: read and PullRequests: read; no token value was logged.
- GitHub branch comparison confirms backend PR #60 branch `feat/oralyn-clinic-assistant-rbac` is exactly at `fce527d034ccafe420f568d1216bb6e31a6a9327`. The deployed runtime `5f4adba355b56f69427f554925ad8cdaa7f81d40` is its direct parent; the only intervening change is `docs/DENTAL_PRIVATE_DOCUMENTS.md` (one documentation file). Backend Engine #43593700789 (236 passed, 3 skipped) and PostgreSQL #43593700798 (239 passed) completed successfully. No backend runtime redeployment was required.
- Canonical frontend Render deployment `dep-dbs5ebm417fc73f4772g` is LIVE on `a5809407213105f5eec1f53baeb1680777807fa6`. Canonical API deployment `dep-dbrngjnf3r2c7391c5v0` remains LIVE on application commit `5f4adba355b56f69427f554925ad8cdaa7f81d40`. Both services are Free plan, Singapore region, one instance, auto-deploy enabled and not suspended. Render-native healthCheckPath remains unset on both.
- Render log query for both canonical services, 15:50–16:08 UTC, returned no log entries. This is a bounded empty result, not continuous uptime evidence.
- Fresh read-only SQL on both Neon branches returned matching aggregates: 9 patients, 9 appointments, 8 public booking requests, 0 Assistant accounts, 0 Assistant sessions, 0 clinical notes, 0 treatment plans, 0 invoices, 0 receipts, 0 documents and 10 audit events. Source branch `br-steep-bonus-a1yqarg7`; restored/default branch `br-proud-scene-a1g7g3qo`. No individual patient or clinical content was retrieved.
- Source branch private bucket `oralyn-private-documents` is private and has zero objects. Restored/default branch has no corresponding bucket. Source branch has an existing credential with `storage:read` and `storage:write` scopes; its secret was not retrieved and it is not installed in Render. Keep all document actions disabled.
- The current run did not perform a new authenticated Doctor or Assistant login. Doctor and Assistant browser artifacts remain synthetic fixtures. The release manifest still requires real Doctor login/CRUD, real Assistant login/least-privilege UI/API acceptance, authenticated cross-tenant testing and authenticated screenshots.
- Branch-protection state could not be freshly queried: the GitHub connector does not expose repository administration/branch-protection operations. No protection settings were changed. Require an administrator to verify required CI, review and force-push restrictions before production.
- Production remains BLOCKED on 18 gates. No production deployment, migration, secret change, real patient-data transfer, paid infrastructure activation, service deletion or PR merge occurred.


## Latest hourly verification — 14 Nov 2026 17:29 UTC

### GitHub and CI
- Frontend PR #18 remains open, Draft and unmerged at `1e5db539c9ea231e2bdc9b5cb549b3c4d14e0d4d`. The exact-head workflow [#43614164928](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/runs/43614164928) completed successfully: all 20 workflow validation steps passed; 125/125 regression tests passed; three npm audit invocations reported zero vulnerabilities; staging build, synthetic guest-booking/idempotency contract, read-only Assistant API contract, responsive headless-Chrome capture and all four artifact uploads passed.
- Current browser artifacts from #43614164928: [desktop/tablet/mobile captures](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/artifacts/14121203609), [Doctor synthetic UI](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/artifacts/14121004507), [Assistant synthetic UI](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/artifacts/14121158833), and [staging build/checksum](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/artifacts/14121019289). Artifacts expire 28 Nov 2026 around 16:13 UTC. Doctor/Assistant captures are fixtures, not authenticated acceptance.
- Backend PR #60 remains open, Draft and unmerged at `fce527d034ccafe420f568d1216bb6e31a6a9327`. Engine #43593700789 completed with 236 passed, 3 skipped; PostgreSQL #43593700798 completed with 239 passed. The deployed runtime `5f4adba355b56f69427f554925ad8cdaa7f81d40` is the direct parent of the backend PR head; the only intervening file is `docs/DENTAL_PRIVATE_DOCUMENTS.md`, so no backend application redeploy is required.
- Fresh GitHub branch metadata explicitly reports `protected=false` and required status-check enforcement `off` for both `feat/oralyn-desktop-app` and `feat/oralyn-clinic-assistant-rbac`. No branch protection settings were changed. Require administrator action before production.

### Render
- Canonical frontend service `srv-dbr2ttsipgvc739a4tmg`, deployment `dep-dbs8futckfvc73db1pp0`, is LIVE on `1e5db539c9ea231e2bdc9b5cb549b3c4d14e0d4d`.
- Canonical API service `srv-dbr8m159fdbs73dl404g`, deployment `dep-dbrngjnf3r2c7391c5v0`, is LIVE on application commit `5f4adba355b56f69427f554925ad8cdaa7f81d40`.
- Both services are Free plan, Singapore region, one instance, auto-deploy enabled, and have empty Render-native `healthCheckPath` settings. API `/health` and `/ready` are exercised by CI, but native Render health checks are not configured.
- Bounded Render log queries for 14 Nov 2026 17:00–17:28 UTC returned no app error/fatal entries and no request 5xx entries. This is a bounded observation, not an uptime guarantee. A separate public fetch through the web-access tool could not reach the portal or API; no independent public-browser acceptance is claimed.

### Neon synthetic database and recovery
- Project `silent-king-54610898`, database `oralyn_staging`, Singapore region, PostgreSQL 17.12. Fresh read-only SQL on both branches reports migration `0013_public_booking_idempotency` and matching aggregate counts: 9 patients, 9 appointments, 8 public requests, 0 Assistant accounts, 0 Assistant sessions, 0 clinical notes, 0 chart entries, 0 periodontal entries, 0 treatment plans, 0 invoices, 0 receipts, 0 documents and 10 audit events. No patient names, contact details or clinical contents were retrieved.
- Snapshot source branch `br-steep-bonus-a1yqarg7` is named `oralyn-staging-restore-rehearsal-2026-11-13 (1)`; default/primary branch `br-proud-scene-a1g7g3qo` is named `main` and is restored from manual snapshot `snap-late-surf-a1j1sljm`. Both branches are ready; neither is Neon-protected.
- Source branch has private bucket `oralyn-private-documents` with zero objects and a branch-scoped `storage:read`/`storage:write` credential. The credential secret was not retrieved and is not installed in Render. Default/main branch has no corresponding bucket.
- One manual snapshot exists; automatic snapshot schedules are empty on both branches. Persistent malware scanning/quarantine, lifecycle cleanup and application restore/failover remain unverified. Keep document upload/download/sharing disabled.
- The Neon project is synthetic-only and provider HIPAA setting is false; this is not a compliance assessment. Never transfer real patient data.

### Acceptance boundary and release decision
- Public account-free Patient journey, all 20 approved service options plus Other, required-field/future-IST checks, synthetic booking and same-key idempotency are covered by the passing staging contract.
- Doctor and Assistant UI captures remain synthetic fixtures. Real Doctor login/CRUD, real Assistant login/least-privilege UI/API acceptance, authenticated cross-tenant browser E2E and authenticated screenshots remain unverified.
- Production release remains BLOCKED on 18 top-level gates. Keep all PRs Draft/unmerged and all document actions disabled. Do not mark production gates true from fixtures or staging CI alone.
- No production deployment/migration, production secret change, paid infrastructure activation, real patient-data transfer, service retirement, object deletion or PR merge occurred.


## Autonomous release-watch verification — 15 Nov 2026 01:08 UTC (06:38 IST)

### GitHub and exact-head CI
- Frontend PR #18 remains open, Draft and unmerged at `a145d3897e1636b80d9b29c94f8a51e7e65a7ac8`. The product/application code is unchanged from the previously identified `c90061d4001db1d5995c381b8e37148a529981ed`; this head only corrects the staging runtime-equivalence assertion wording in `desktop/scripts/verify-staging-contract.cjs`.
- Exact-head frontend workflow [#43644047572](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/runs/43644047572) is completed/successful. Job `validate` completed all 20 primary steps. The log confirms **131/131 tests passed, 0 failed, 0 skipped**; four npm audit invocations reported zero vulnerabilities; build, synthetic guest-booking/idempotency contract, read-only Assistant contract, security-header check, headless Chrome capture and four artifact uploads passed.
- CI Chrome emitted non-fatal D-Bus/UPower environment diagnostics, while the capture script recorded `runtime_errors=none` for both Doctor and Assistant fixtures. These are CI-local captures, not live authenticated staging sessions.
- Backend PR #60 remains open, Draft and unmerged at `3fbfff0e387fbfc893553de47d0336cd40a9edea`. Exact-head Engine CI [#43634918023](https://github.com/kawstubh/universal-intelligence-engine/actions/runs/43634918023) passed **240 tests** with one Starlette/httpx deprecation warning. Engine Tests [#43634918034](https://github.com/kawstubh/universal-intelligence-engine/actions/runs/43634918034) passed **237**, skipped 3, with the same deprecation warning.
- GitHub compare from deployed backend runtime `5f4adba355b56f69427f554925ad8cdaa7f81d40` to PR #60 head confirms two commits ahead, zero behind, and only `docs/DENTAL_PRIVATE_DOCUMENTS.md` plus `tests/test_dental_assistant.py` differ. No backend runtime/configuration redeploy is required.
- Related private-document cleanup PR #61 remains open, Draft and unmerged at `87aa068b2759a60130722f28ea43815227c92d56`. Its prior CI runs [#43424740289](https://github.com/kawstubh/universal-intelligence-engine/actions/runs/43424740289) and [#43424740181](https://github.com/kawstubh/universal-intelligence-engine/actions/runs/43424740181) succeeded (241 passed/3 skipped and 244 passed respectively). It is code-only and undeployed. Its branch is diverged from the deployed runtime (12 ahead/7 behind); do not treat it as a merge-ready deployment. Cleanup defaults to dry-run and requires both an explicit environment enablement and `--apply`; no scheduled cleanup runner exists.

### Product and authorization source review
- The shared catalogue `shared/dentalServices.ts` contains exactly 20 unique service IDs/names, each with a distinct local image; the public service test asserts all 20 are rendered and available for booking, plus the separate `Other dental concern` option.
- Public patient pages remain account-free and explicitly set `intelligence_request: false`; no Supabase client dependency is present in the web portal package. Doctor clinical intelligence API is guarded by `require_doctor`.
- Assistant SPA uses separate `/v1/dental/assistant/*` routes and an Assistant-role session. The backend Assistant module has clinic-scoped queries and separate authentication. Backend tests cover reception/contact intake, appointment coordination and approved receipt recording, plus denial of clinical/owner operations and cross-clinic isolation. These are source and automated-test findings only; real authenticated Doctor/Assistant staging acceptance remains unverified.
- Public appointment rate limiting is currently in-process memory. Backend source comments explicitly require a shared limiter or edge-level rule before production horizontal scaling; production rate-limit gate remains open.

### Render deployment and runtime observations
- Canonical frontend service `srv-dbr2ttsipgvc739a4tmg` deployment `dep-dbsdaguq1p3s73enc940` is LIVE on exact branch head `a145d3897e1636b80d9b29c94f8a51e7e65a7ac8`.
- Canonical API service `srv-dbr8m159fdbs73dl404g` deployment `dep-dbrngjnf3r2c7391c5v0` is marked LIVE on application commit `5f4adba355b56f69427f554925ad8cdaa7f81d40`.
- Both services are Free plan, Singapore region, one instance, auto-deploy enabled, and have no Render-native `healthCheckPath` configured. The frontend runs Vite preview rather than a separately provisioned static-site/CDN service.
- Bounded Render logs show the frontend Vite preview process started at 00:30:03 UTC. The API process started at 00:43:02 UTC and logged a graceful shutdown at 00:57:41 UTC. No later API startup, request log, 5xx entry, or error/fatal entry was returned through 01:10 UTC. No corresponding lifecycle event was returned for 00:30–01:10 UTC. CPU/memory samples stop at 00:55 UTC; HTTP request/latency and instance-count metrics returned no data. This is an observed process shutdown and telemetry gap; its exact cause and current public reachability are not established. Do not infer continuous API availability from Render deployment status.
- Live external browser/API URL fetching was unavailable, and TinyFish browser automation was not run because its wallet balance is negative. No top-up or spending occurred. The latest browser evidence remains CI-local preview only.

### Neon synthetic storage and recovery
- Project `silent-king-54610898` is `oralyn-staging-synthetic`, Free plan, Singapore (`aws-ap-southeast-1`), PostgreSQL 17. Both source branch `br-steep-bonus-a1yqarg7` and restored/default branch `br-proud-scene-a1g7g3qo` are ready but report `protected=false`.
- Source branch has private bucket `oralyn-private-documents`; object listing returned zero objects. Restored/default branch has no bucket. Both automatic snapshot schedules are empty; one manual snapshot `snap-late-surf-a1j1sljm` exists.
- Project provider HIPAA setting is false. This project remains synthetic-only and is not evidence of a compliance assessment. Never transfer real patient data.
- No persistent malware scanner/quarantine, installed Render storage credential, verified application storage integration, scheduled cleanup, automatic snapshot schedule or application restore/failover rehearsal is operational. Keep document upload/download/sharing disabled.

### Governance and release decision
- GitHub rulesets reads returned empty lists for both repositories. The branch-protection endpoint could not be read in this run because the connector rejected the encoded slash branch path; therefore this run does not independently establish required status-check enforcement.
- All **18 production release gates remain open**. Doctor/Assistant fixture screenshots are not authenticated acceptance. No production deployment/migration, production secret change, paid infrastructure activation, real patient-data transfer, object deletion, service retirement or PR merge occurred.
- No user action is needed to preserve the current staging deployment. Owner decisions remain required for branch protection, real authenticated staging acceptance, always-on production hosting, production database/privacy review, private storage/scanning, automated recovery/monitoring, custom domain and explicit production release.


## Autonomous release-watch verification — 15 Nov 2026 01:51 UTC / 07:21 IST

### Exact-head source, CI and deployment
- Frontend PR #18 remains open, Draft and unmerged at `5db31dd188f0678091d33a0391d081407fda25b8`. Exact-head workflow [#43661865258](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/runs/43661865258) completed successfully: 131/131 tests, zero failed/skipped, all 20 primary steps successful. The workflow completed root and desktop dependency installation/audits, staging build, live synthetic booking/idempotency contract, read-only Assistant API contract, security-header check, Chrome captures and all four artifact uploads.
- The source comparison from UI baseline `c90061d4001db1d5995c381b8e37148a529981ed` to current head contains 28 commits and is not docs-only. It includes API-origin/transport changes in `desktop/src/api.js`, `desktop/vite.config.js`, `App.js`, `doctor-app/src/api/apiConfig.js`, `doctor-app/src/api/doctorApi.js` and `src/api/dentalApi.js`, plus tests/workflow/docs. The web portal's React view/style files were not among the changed paths in this comparison. Legacy Patient/Doctor API clients now require an explicit configured HTTPS origin rather than a hard-coded retired Render host; the desktop Vite proxy targets the canonical staging API; the root health probe uses the shared health client. This is runtime/API configuration hardening, not a UI redesign.
- Canonical frontend Render service `srv-dbr2ttsipgvc739a4tmg` is LIVE on exact head via `dep-dbsgda49v7es73btoulg`; build and deploy events both succeeded at 2026-11-15 01:11 UTC.
- Backend PR #60 remains open, Draft and unmerged at `3fbfff0e387fbfc893553de47d0336cd40a9edea`. Engine CI [#43634918023](https://github.com/kawstubh/universal-intelligence-engine/actions/runs/43634918023) passed 240 tests with one warning; PostgreSQL CI [#43634918034](https://github.com/kawstubh/universal-intelligence-engine/actions/runs/43634918034) passed 237 tests, skipped 3, with one warning. Compare from deployed API runtime `5f4adba355b56f69427f554925ad8cdaa7f81d40` is 2 ahead / 0 behind and contains only `docs/DENTAL_PRIVATE_DOCUMENTS.md` and `tests/test_dental_assistant.py`; no runtime/config change is pending API deployment.
- Canonical API service `srv-dbr8m159fdbs73dl404g` remains LIVE on `5f4adba355b56f69427f554925ad8cdaa7f81d40` via `dep-dbrngjnf3r2c7391c5v0`. Both canonical Render services are Free/Singapore/one instance with Render-native health-check paths unset.

### Bounded monitoring and synthetic database
- Render application error/fatal logs and request 5xx logs for 2026-11-15 00:51–01:51 UTC returned no records. CPU/memory samples existed for both services, but HTTP request-count and latency metric series were empty. This bounded observation is not proof of continuous uptime or sufficient production monitoring.
- Neon project `oralyn-staging-synthetic` (`silent-king-54610898`) has default `main` branch `br-proud-scene-a1g7g3qo` and restore-rehearsal branch `br-steep-bonus-a1yqarg7`; both are ready and currently unprotected. One manual snapshot `snap-late-surf-a1j1sljm` exists; automatic snapshot schedules are empty on both branches.
- Private bucket `oralyn-private-documents` exists only on the restore-rehearsal branch and is empty; the default/main branch has no corresponding bucket. No storage secret was retrieved or installed in Render. Persistent scanner/quarantine and application restore/failover remain unverified.
- Attempted to protect both synthetic Neon branches. Neon rejected both changes because the current plan has reached its maximum protected-branch allowance. No plan upgrade, paid change, branch data mutation or deletion occurred. Protection remains unavailable unless the owner frees an existing protected-branch slot or changes plan.

### Acceptance and release boundary
- Public patient home/booking, all 20 approved services plus Other, future IST validation and synthetic booking idempotency passed in the CI staging contract.
- Doctor and Assistant browser workspaces remain synthetic fixtures. No real Doctor password login, real Assistant login, authenticated CRUD/persistence or authenticated cross-clinic browser acceptance was performed.
- The checklist continues to list 18 top-level production gates as open. Keep document upload/download/sharing disabled. No production deployment/migration, production secret change, paid infrastructure activation, real patient-data transfer, object deletion, service retirement or PR merge occurred.


## Autonomous release-watch verification — 15 Nov 2026 01:57 UTC

### Frontend exact-head CI and browser evidence
- Exact frontend head ea236ea9543b182bdcc5ab9a2a2a5c70ca3eb053; workflow #43665313844 completed successfully. Node test runner: 131 tests, 131 passed, 0 failed. Three npm audit commands ran and four audit result lines reported zero vulnerabilities. Staging build, live synthetic booking/idempotency, read-only Assistant API contract, security headers, Chrome browser capture and all four artifact uploads passed.
- Actual Chrome capture recorded Patient home, guest booking, Doctor login and Assistant login across desktop/tablet/mobile. Approved logo/app icon and Playfair Display/Plus Jakarta Sans loaded; PWA was active and controlling with one shell cache and no API/auth/storage paths; keyboard focus was visible; reduced motion was honored; application runtime error array was empty.
- Doctor and Assistant UI workflow writes are synthetic fixtures. Doctor fixture metadata records service-worker active but not controlled; the main browser PWA gate independently verified control and passed. Fixture metadata explicitly keeps staging_authenticated_e2e=false, doctor_password_login_verified=false and staging_assistant_login_verified=false.
- Artifacts: [actual screenshots](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/artifacts/14141763268), [Doctor fixture](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/artifacts/14141738430), [Assistant fixture](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/artifacts/14142017675), [staging build and manifest](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/artifacts/14142157242). Artifacts expire 29 Nov 2026 around 01:57 UTC.
- The build manifest retains 18 top-level production blockers. The staging contract marked guest booking/idempotency, API commit equivalence, portal commit equivalence, service catalogue, CORS/security headers and database/branch identity as verified; these do not satisfy production-origin, rate-limit, authenticated acceptance, private storage/scanning, recovery, monitoring, always-on hosting, privacy/domain or deployment-approval gates.

### API and data verification
- The canonical API woke from Free-plan idle during the staging contract; application startup completed. Render logs show dental health, /health, /ready, OpenAPI and CORS preflight 200; unauthenticated Doctor/Assistant/clinical paths 401; legacy patient-linked records 404; public appointment GET 405; two synthetic public appointment POSTs 200. No application error/fatal entries were returned in the bounded window.
- Backend PR #60 remains at 3fbfff0e387fbfc893553de47d0336cd40a9edea, with Engine 240 passed and PostgreSQL 237 passed / 3 skipped. Deployed API application commit 5f4adba355b56f69427f554925ad8cdaa7f81d40 is 2 commits behind PR head only for docs/DENTAL_PRIVATE_DOCUMENTS.md and tests/test_dental_assistant.py; no runtime/config redeploy is needed.
- Read-only Neon aggregates remained unchanged after same-key booking replay: restore-rehearsal branch 10 patients / 10 appointments / 9 public requests / 11 audit events; default/main branch 9 / 9 / 8 / 10. Both are at migration 0013_public_booking_idempotency; zero Assistant accounts/sessions and zero clinical, financial or document rows. No individual records were read.
- Neon branch protection could not be enabled because the current plan has reached its maximum protected-branch allowance. Both synthetic branches remain unprotected; no paid upgrade or data mutation occurred. One manual snapshot exists; automatic snapshot schedules remain empty. The private bucket is empty on the restore-rehearsal branch and absent from default/main. Keep document actions disabled.

### Release decision
- All 18 top-level production gates remain open. Real authenticated Doctor/Assistant acceptance and cross-clinic browser E2E remain unverified. No production deployment/migration, production secret change, paid infrastructure activation, real patient-data transfer, destructive action or PR merge occurred.


## Latest exact-head verification — 15 Nov 2026 08:03 IST

### Frontend
- Current PR #18 head: `e10163406f6a1c76926122f4ac9c0030c31a70cf`; the commit is a documentation-only release-checklist refresh relative to `09cc5468f468882481ae1974489b87485098502d`.
- Exact-head CI [#749](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/runs/43665989380) completed successfully: 131 tests passed, 0 failed, 0 skipped; all 20 primary workflow steps succeeded. Dependency audits reported zero vulnerabilities; build, synthetic staging booking/idempotency, read-only Assistant API contract, responsive Chrome capture and four artifact uploads passed.
- Browser capture covered Patient home, guest booking, Doctor login, Assistant login and Assistant owner-route redirect at 1440x1000, 1280x800 and 390x844. Approved logo/app icon, Playfair Display and Plus Jakarta Sans, PWA active/controlling with one shell cache and no API/auth/storage entries, keyboard focus, reduced-motion and zero application runtime errors were verified. Container D-Bus/UPower warnings were non-fatal.
- Doctor/Assistant workspace writes are CI synthetic fixtures. Metadata explicitly states `staging_authenticated_e2e=false`, `doctor_password_login_verified=false` and `staging_assistant_login_verified=false`. Fixture 403 evidence is not backend authorization proof.
- Render frontend service `srv-dbr2ttsipgvc739a4tmg` deployment `dep-dbsh62tckfvc73dl87eg` is LIVE on exact head `e10163406f6a1c76926122f4ac9c0030c31a70cf`. It remains Free/Singapore/one instance with native health-check path unset.

### API and public booking
- Canonical API service `srv-dbr8m159fdbs73dl404g` deployment `dep-dbrngjnf3r2c7391c5v0` is LIVE on application commit `5f4adba355b56f69427f554925ad8cdaa7f81d40`.
- Backend PR #60 head `3fbfff0e387fbfc893553de47d0336cd40a9edea` is 2 commits ahead / 0 behind the deployed runtime; only `docs/DENTAL_PRIVATE_DOCUMENTS.md` and `tests/test_dental_assistant.py` differ. Backend CI remains green (Engine 240 passed; PostgreSQL 237 passed, 3 skipped). No application/config redeploy is pending.
- Bounded Render error/fatal and request-5xx log queries for both canonical services from 15 Nov 2026 01:33–02:33 UTC returned no entries. This is a bounded observation, not an uptime guarantee.
- Public booking uses an in-process sliding window of 8 attempts per 5 minutes per client IP, returns 429 with Retry-After, and caps tracked client buckets at 10,000. Tests cover burst limiting, per-IP isolation, validated `CF-Connecting-IP`, invalid header handling and rejection before persistence. The limiter is process-local; a shared limiter or trusted production edge/WAF policy is required before horizontal scaling. Keep the production rate-limit gate false until edge/shared enforcement is independently verified.

### Synthetic storage and release decision
- Neon synthetic project `silent-king-54610898`: restore-rehearsal branch `br-steep-bonus-a1yqarg7` is ready/unprotected and has private bucket `oralyn-private-documents` with zero objects; default branch `br-proud-scene-a1g7g3qo` is ready/unprotected and has no matching bucket.
- One manual snapshot exists; no automatic snapshot schedule was found. Persistent malware scanning/quarantine and verified backup/restore remain unoperational. Keep document upload/download/sharing disabled.
- All 18 top-level production gates remain open. Real authenticated Doctor/Assistant acceptance, authenticated cross-clinic E2E, production edge rate limiting, secure document lifecycle, recovery, monitoring/rollback, always-on hosting, production database/privacy, domain and deployment approval are not verified.
- No real patient records were queried or transferred; no production deployment/migration, secret change, paid activation, destructive action or PR merge occurred. PR #18 and PR #60 remain Draft/unmerged.


## Latest exact-head verification — 15 Nov 2026 04:42 UTC

### Repository and CI state
- Frontend PR #18 remains open, Draft and unmerged at `a2f11e8dcc55076bb032bc5c4d4db5f895835dee`; exact-head CI #43668768898 passed 132/132 with zero failures/skips and the 15-screen overflow gate passed.
- Backend PR #60 remains open, Draft and unmerged at `a9bbd7df1d3d0c6bc1cc945c3d56a4e421bbc024`. Engine Tests #43677883185 passed 242, skipped 4, one warning. CI #43677883167 is still running the PostgreSQL/ClamAV-backed test step.
- Both canonical PRs remain unmerged. No production deployment, migration, secret change or paid activation occurred.

### Document upload safety correction
- Source review found that the former upload-intent endpoint could create a pending document row and issue a presigned PUT URL before confirming that private ClamAV was configured and reachable. Finalization already failed closed, but an unscanned pending object could still be uploaded to quarantine.
- Backend PR #60 now checks the configured private ClamAV endpoint before creating the row or issuing the URL. It sends the NUL-terminated `zPING` command and requires exact `PONG`; missing/unsafe/unavailable scanner returns HTTP 503. Unit tests assert no row and no presigned URL for missing, invalid and unavailable scanner states.
- Finalization still performs a fresh bounded `INSTREAM` scan of the actual verified bytes and requires an audit record before publishing a separate `verified/` key. A PING response is not treated as malware clearance.
- A real ClamAV PING/PONG integration test was added to the CI workflow. The exact-head PostgreSQL/ClamAV CI is still in progress; the current runtime change has not been deployed.
- Frontend Doctor document UI requires both `VITE_PRIVATE_DOCUMENT_STORAGE_READY=true` and `VITE_DOCUMENT_MALWARE_SCANNING_READY=true` before showing upload/download/review controls. Current manifest gates remain false. Backend preflight adds an independent server-side guard. Keep document actions disabled.

### Render verification limitation
- `list_workspaces` returned the single visible workspace `kawstubh's workspace` (`tea-da2mcb6gekts73b8e1fg`). The Render connector requires explicit owner workspace selection before service/deployment reads. No workspace was selected in this run; the last recorded frontend/API deployment IDs above were not independently re-queried and no deployment was triggered.
- Both canonical Render services were previously recorded as Free/Singapore/one instance with native health-check paths unset. The API has documented Free-plan cold starts; LIVE deployment metadata is not an uptime guarantee.

### Neon synthetic-only recovery and security state
- Project `silent-king-54610898` (`oralyn-staging-synthetic`) remains synthetic-only. Source/restore branch `br-steep-bonus-a1yqarg7` and default/main `br-proud-scene-a1g7g3qo` are ready and unprotected.
- One manual snapshot `snap-late-surf-a1j1sljm` exists. Automatic snapshot schedules are empty on both branches.
- `oralyn-private-documents` is empty on the restore-rehearsal branch and absent from default/main. Persistent scanner/quarantine, scheduled cleanup and verified restore/failover remain unoperational.
- Project settings show `hipaa=false`, `block_public_connections=false`, and no IP allowlist. This is synthetic-only and must never contain real patient data.

### Release decision
- All 18 top-level production gates remain open. Real Doctor/Assistant authentication and CRUD, authenticated cross-clinic E2E, production shared/edge rate limiting, secure private storage/scanning/cleanup, backup/restore, monitoring, rollback, always-on hosting, production database/privacy, custom domain and deployment approval remain outstanding.
- The two legacy APK workflow files return 404 on the current frontend feature branch; the active product workflow is the responsive web portal.
- No real patient records were queried or transferred. No production change, destructive storage action, paid infrastructure activation, PR merge or production release occurred.



## Release-watch verification — 15 Nov 2026 13:49 IST

### Exact repository and CI state
- Frontend PR #18 head at the start of this verification: `4c45bc35e7afbbf9ec3f2e4c6faa7a63f440f98c`, a documentation-only release-checklist refresh. Exact-head workflow #752 (`43678109983`) completed successfully: 132 passed, 0 failed, 0 skipped. Its Chrome run captured 15 responsive screens and recorded zero horizontal overflow and zero application runtime errors.
- Backend PR #60 advanced to `348c0dbe546e4e9ce26b2695e8246d5c24f1ef76`. Exact-head CI #352 (`43694121508`) passed 249, 0 failed, 0 skipped, 1 warning. Engine Tests #413 (`43694121574`) passed 245, skipped 4, 1 warning.
- CI #352 used isolated PostgreSQL and ClamAV services; its logs confirm ClamAV detected the synthetic EICAR test signature. The only warning in each backend workflow is the non-blocking Starlette TestClient/httpx deprecation warning.

### Additional document audit-failure hardening
- Backend commit `802b1dbe64ec13d0c5089790ee2b0b585917b4ff` changes malware-detection audit-write failure from a swallowed/log-only condition to HTTP 503 `DOCUMENT_MALWARE_AUDIT_UNAVAILABLE`.
- Backend test commit `348c0dbe546e4e9ce26b2695e8246d5c24f1ef76` adds a regression test proving the upload is rejected, no quarantine or verified object remains, and the generic `document.upload_rejected` audit event is written when the malware-specific audit insert fails.
- This behavior is source and exact-head CI verified, not live staging verified. The backend PR remains 10 commits ahead / 0 behind the last recorded deployed API application commit `5f4adba355b56f69427f554925ad8cdaa7f81d40`. Do not mark backend commit equivalence true.

### Deployment and data safety
- Last independently verified frontend Render deployment remains `dep-dbsjhitckfvc73dn7sh0`, LIVE on frontend head `4c45bc35` at 11:44 IST. Render was not re-queried in this run because the connector requires owner confirmation before selecting a workspace. No deployment was triggered.
- Backend Render deployment remains unverified in this run; last recorded runtime is `5f4adba`. No manual deployment was triggered.
- The only visible Render workspace is `kawstubh's workspace` (`tea-da2mcb6gekts73b8e1fg`). Do not select it without owner confirmation.
- Neon project `silent-king-54610898` is synthetic-only. Both branches remain unprotected; one manual snapshot exists and both automatic snapshot schedules are empty. `oralyn-private-documents` is private and empty on the restore branch and absent from main. No real patient data was queried.
- Real authenticated Doctor/Assistant acceptance remains unverified. Document upload/download/sharing remain disabled. CI ClamAV is an ephemeral test service, not persistent staging scanning/quarantine.

### Release decision
- Keep all PRs Draft and unmerged. Production remains blocked pending authenticated Doctor/Assistant acceptance, cross-clinic E2E, shared production booking rate limiting, persistent private storage/scanning/cleanup, automated backup/verified restore, monitoring/rollback, always-on hosting, production database/privacy review, custom domain and explicit deployment approval.
- No production deployment/migration, secret change, paid activation, destructive storage action, real patient-data transfer or PR merge occurred.


## Release-watch verification — 15 Nov 2026 14:21 IST

### Exact-head frontend CI #753 completed
- Current documentation-only frontend PR head at this check: `c8e1af4c0962f5991ec63fcb2fbcb962ee101b9c`.
- Exact-head workflow #753 ([run 43694302762](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/runs/43694302762)) completed successfully. Its exact-head test log records **132 passed, 0 failed, 0 skipped**. All 22 workflow steps completed successfully.
- Dependency audits reported zero vulnerabilities; staging-targeted Vite build passed; read-only Assistant API contract passed; browser capture and all four artifact uploads completed.
- Browser evidence records **15/15 viewport captures with no horizontal overflow** across Doctor login, Assistant login, public patient home, guest booking and Assistant owner-route gate. Each recorded root/body scroll width equaled viewport width.
- Browser metadata reports approved wordmark/app icon, Playfair Display and Plus Jakarta Sans loaded, keyboard-visible focus, reduced-motion honored, active/controlling PWA service worker, one shell cache with no forbidden API/auth/storage paths, and an empty application runtime-error array.
- Artifacts (available until 29 Nov 2026 08:26 UTC): [actual desktop/tablet/mobile screenshots](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/artifacts/14154146589), [Doctor synthetic UI](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/artifacts/14154017017), [Assistant synthetic UI](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/artifacts/14153777597), [static staging build and manifest](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/artifacts/14153852479).
- Doctor/Assistant workspace interactions remain `CI_SYNTHETIC_ONLY`. Fixture metadata explicitly records `staging_authenticated_e2e=false`, `doctor_password_login_verified=false`, and `staging_assistant_login_verified=false`. The Doctor fixture's cross-organisation denial is `fixture_403_not_backend`; it is not backend authorization proof.
- Booking UI verifies five required labelled fields, 20 catalogue services plus Other, India-time future-date validation, and no network request for empty or past-time submissions. The build manifest explicitly leaves `ORALYN_GUEST_BOOKING_E2E_VERIFIED=false` and `ORALYN_GUEST_BOOKING_IDEMPOTENCY_VERIFIED=false`; the read-only API contract is not full guest-booking E2E or idempotency acceptance. Do not mark either gate true.
- The build manifest also explicitly records `ORALYN_STAGING_API_COMMIT_VERIFIED=false`, `ORALYN_STAGING_PORTAL_COMMIT_VERIFIED=true`, and `Release status: BLOCKED`. Production API origin, private document storage/scanning, backup/restore, monitoring, rollback, authenticated Doctor/Assistant acceptance, production rate limiting, cross-tenant E2E, always-on hosting, production database/privacy, custom domain and deployment approval remain unverified.

### Backend and infrastructure status
- Backend PR #60 head remains recorded as `348c0dbe546e4e9ce26b2695e8246d5c24f1ef76`; exact-head CI #352 passed 249 and Engine Tests #413 passed 245 with 4 skipped. The malware-audit-outage regression is source/CI verified, not deployed.
- The last recorded API application runtime remains `5f4adba355b56f69427f554925ad8cdaa7f81d40`; backend PR #60 is 10 commits ahead / 0 behind. Do not claim backend deployment equivalence.
- Render workspace listing exposes only `kawstubh's workspace` (`tea-da2mcb6gekts73b8e1fg`). The connector explicitly requires owner confirmation before selecting it. No workspace was selected and no service/deployment read or manual deploy occurred.
- Neon project `silent-king-54610898` remains synthetic-only. Both branches are ready and unprotected; one manual snapshot exists; automatic snapshot schedules are empty on both branches. The private document bucket is empty on the restore branch and absent on main. No real patient data was queried.
- Keep document upload/download/sharing disabled. No real authenticated Doctor/Assistant acceptance is established. Keep this PR Draft and unmerged; no production deployment, migration, secret change, paid activation, destructive storage action or real patient-data transfer occurred.
