# Oralyn Web Portal — Release Checklist

**Status: BLOCKED — the responsive portal and synthetic staging contract are passing; production release is not approved.**

Last refreshed: 13 November 2026.

## Latest CI/runtime verification — 13 November 2026

- Frontend head `5fc3f1ba0529849be56090ea1e04d0397443e4a8` upgrades checkout/setup-node/upload-artifact to Node 24-compatible action releases and Chrome setup to `browser-actions/setup-chrome@v2.2.0` with the latest Chrome channel. Backend PR #60 head `68898259171c2880057e3d07e24d2006e836ff3e` upgrades checkout/setup-python to Node 24-compatible action releases.
- Frontend CI [#43388248907](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/runs/43388248907) passed **93/93 tests**, root/desktop dependency audits (**0 vulnerabilities**), production build, the live synthetic staging contract, and headless-Chrome desktop/tablet/mobile captures. Public-page capture reported `runtimeErrors=[]`; required-field and past-time submissions made no API calls; all 20 catalogue labels, local fonts and PWA shell checks passed.
- The live staging contract passed exact-origin CORS, API/portal security headers, Neon database identity, public account-free routes, protected Doctor/Assistant API denials, 20-service API/UI catalogue, guest booking without private IDs, idempotency replay, and exact deployed portal/API commit matching.
- Backend PostgreSQL CI [#43387808995](https://github.com/kawstubh/universal-intelligence-engine/actions/runs/43387808995) passed **237 tests**; Engine Tests [#43387809059](https://github.com/kawstubh/universal-intelligence-engine/actions/runs/43387809059) passed **236 tests, 1 expected skip**. Node 20 action-runtime deprecation warnings are gone; one non-blocking Starlette/httpx TestClient deprecation warning remains.
- Staging API deploy `dep-dbrbvpmi0phs73fdju8g` is LIVE on exact backend head `68898259171c2880057e3d07e24d2006e836ff3e`. Staging portal deploy `dep-dbrc10e7bikc73epuhs0` and static alias deploy `dep-dbrc10e7bikc73epui00` are LIVE on frontend head `5fc3f1ba0529849be56090ea1e04d0397443e4a8`. The static alias remains secondary until its deep-route behavior is independently verified.
- The release manifest remains **BLOCKED on exactly ten genuine gates**: private document storage, malware scanning, backup/restore, error monitoring, rollback rehearsal, real Doctor login/API persistence, real Assistant login/role acceptance, Assistant UI-to-live-API acceptance, live cross-tenant E2E, and authenticated Doctor/Assistant screenshots. Mocked CI fixtures are not counted as authenticated acceptance.
- Synthetic Neon remains at Alembic `0013_public_booking_idempotency`: 4 patients, 4 appointments, 3 public booking requests, 0 Assistant accounts, 0 Assistant sessions, 0 receipts, 0 documents and 5 audit events. The latest idempotency replay did not create another booking. Synthetic-only; no real patient data.

## Product decisions

- One responsive web portal for desktop, tablet and mobile browsers. PWA installation is optional. Native apps and APKs are not part of the product or release.
- Patient discovery, clinic information and appointment requests are public and account-free. No patient account, password, OTP, signup/login, Supabase patient auth or linked-record session.
- A public appointment request is not a confirmed appointment; the clinic contacts the patient to confirm.
- Doctor authentication remains mandatory.
- Clinic Assistant has a separate identity, sign-in and least-privilege API. Never map Assistant to Doctor.
- Clinical intelligence remains Doctor-only. No patient-facing diagnosis, self-diagnosis, triage or clinical AI for Assistants.
- Google Business Profile is a discovery/referral entry point only. No booking-link change is claimed without authorized access and confirmation.
- Patient-specific no-login record sharing is deferred. Public booking references are not access tokens.

## Repositories and current verification

### Frontend

- Repository: kawstubh/dr-pranali-dental-mobile-v2
- Draft PR: [#18](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/pull/18)
- Branch: feat/oralyn-desktop-app
- Latest verified portal code head before this documentation-only refresh: 97c6d6e45972064212fd0dca0b2e37244a1a3bb6.
- Latest completed CI: [#43384878404](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/runs/43384878404) — **93/93 tests passed**, root workspace npm install/audit passed, desktop npm audit reported 0 vulnerabilities, production build passed, live synthetic staging contract passed, and headless-Chrome desktop/tablet/mobile captures passed.
- The workflow now verifies the root workspace lockfile and dependency audit before installing the active desktop package.
- Root package dependencies have been retired. The root workspace no longer declares Expo, React Native, Supabase or Google sign-in dependencies; root build/test commands delegate to desktop/. A local root npm ci and offline npm audit also passed with zero dependencies and zero vulnerabilities.
- The active desktop package is the only portal application. Legacy native source files are reference-only; no Android APK workflow remains in this PR.
- The shared clinic catalogue contains 20 approved service labels plus Other dental concern. Public booking validates required fields and future India-time date/time.

### Backend

- Repository: kawstubh/universal-intelligence-engine
- Draft PR: [#60](https://github.com/kawstubh/universal-intelligence-engine/pull/60)
- Branch: feat/oralyn-clinic-assistant-rbac
- Head: e6bae0850e6a686e4cc6ae5080497e1b9751ab8c
- [PostgreSQL CI #43375965593](https://github.com/kawstubh/universal-intelligence-engine/actions/runs/43375965593): **237 passed**.
- [Engine Tests #43375965660](https://github.com/kawstubh/universal-intelligence-engine/actions/runs/43375965660): **236 passed, 1 expected skip**.
- PR #60 is cleanly mergeable but remains Draft and unmerged.
- Synthetic staging API: https://oralyn-staging-api-assistant.onrender.com, service srv-dbr8m159fdbs73dl404g.
- Latest reported staging deployment dep-dbrb4dv6km5c73c831ag is LIVE on exact backend PR #60 head.

## Latest live synthetic contract evidence

Frontend CI #43384878404 recorded PASS for:

- API health, readiness, Postgres, UIE configuration and live database identity.
- Exact portal-origin CORS POST preflight.
- API and portal security headers: HSTS, nosniff, frame protection, referrer policy, permissions policy; portal CSP and API no-store.
- No patient-auth OpenAPI routes; unauthenticated Doctor and Assistant protected reads return 401; disabled legacy patient routes return 404; public booking GET returns 405.
- Shared API/UI service catalogue: 20 approved labels plus Other.
- Synthetic public booking POST and idempotency replay returned the same opaque reference without patient or appointment identifiers.
- Live portal manifest matched frontend head 97c6d6e45972064212fd0dca0b2e37244a1a3bb6.
- Live API deployment commit matched backend PR #60 head e6bae0850e6a686e4cc6ae5080497e1b9751ab8c.

The CI booking contract creates one synthetic request per backend commit per India-local day and replays the same idempotency key. It does not create duplicate rows. These are synthetic test records, not real patient bookings.

The CI-verified portal origin is https://oralyn-web-portal-spa.onrender.com. The separate static alias https://oralyn-web-portal-staging.onrender.com is not the current CI contract origin and remains secondary until its live manifest/routes are independently checked.

## Synthetic staging database

- Neon project: silent-king-54610898
- Branch: br-steep-bonus-a1yqarg7
- Database: oralyn_staging
- Current Alembic revision: 0013_public_booking_idempotency
- Read-only aggregate counts: 3 synthetic patients, 3 appointments, 2 public booking requests, 0 Assistant accounts, 0 Assistant sessions, 0 receipts, 0 documents, 4 audit events.

The Neon project currently permits public connections, has HIPAA disabled and has six-hour history retention. It is strictly synthetic-only. Never copy recovery or production patient data into it.

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

Backend tests cover allowed writes, 403 denial on Doctor/owner operations, cross-clinic isolation, Doctor-token rejection by Assistant endpoints, session logout/deactivation, receipt idempotency and audit behavior. These are CI/API tests. The current staging database has no Assistant account or Assistant session, so live Assistant sign-in and persistence acceptance remain open.

## Doctor and Assistant acceptance

- CI Doctor and Assistant screenshots are headless-Chrome synthetic fixtures.
- The CI Doctor fixture reports password login not verified and cross-organisation denial as fixture-only.
- The CI Assistant fixture uses a mocked login and fixture-backed writes.
- These screenshots prove UI layout and fixture interactions only; they do not prove live authenticated API persistence.
- Do not mark Doctor or Assistant authenticated acceptance complete until real staging credentials are used and create/read/update persistence plus server-side role and tenant boundaries are verified.

## Public booking requirements

- Public clinic page and booking page load without a patient account.
- Minimum contact details and one of the 20 approved services or Other.
- Required fields and future India-time date/time validation.
- Timezone-aware API input.
- HMAC-keyed contact/request fingerprints, idempotency and duplicate prevention.
- Anti-abuse rate limit, exact-origin CORS and safe success/error responses.
- Public response contains an opaque request reference only; no patient ID, appointment ID, clinical note or record access.
- Never submit test requests except through the synthetic CI contract and isolated synthetic database.

The current in-process rate limiter is suitable only for the present single-instance staging service. Production multi-instance deployment requires shared/distributed rate limiting or a trusted edge/WAF policy.

## Documents and storage

Backend code implements:
- Private S3-compatible storage configuration with no Render filesystem fallback.
- Private-bucket attestation and short-lived signed URLs.
- Quarantine-to-verified object promotion, checksum and file-signature checks.
- Fail-closed private ClamAV scanning, with tests for clean, malware, missing/unsafe configuration, public/link-local targets, timeout and invalid scanner replies.
- Doctor review before patient visibility.

A private object-storage bucket and ClamAV service are not provisioned in staging. Document uploads and sharing remain disabled. Implemented fail-closed code is not evidence that infrastructure is ready.

## Remaining release blockers

1. Provision and verify private document storage.
2. Provision and verify the private ClamAV service and fail-closed scan path in staging.
3. Complete real authenticated Doctor login and API-backed create/read/update persistence acceptance.
4. Create and verify a real staging Assistant account/session; exercise allowed writes and denied 403 operations through the live UI/API.
5. Complete live cross-tenant staging E2E with separate synthetic clinics.
6. Capture authenticated Doctor and Assistant screenshots from real staging sessions.
7. Complete backup and restore rehearsal.
8. Configure error monitoring and alerting.
9. Complete rollback rehearsal and document the tested rollback path.
10. Approve and configure production database/domain, security controls and deployment plan; production migration/deployment remains separately gated.

The CI release manifest remains BLOCKED on these gates. Never change manifest flags manually to make a release appear ready.

## Operational restrictions

- Keep PR #18 and PR #60 Draft and unmerged.
- Do not deploy production, migrate Neon main/recovery databases, change production secrets, spend money, resume paid infrastructure or delete patient/user data.
- Use synthetic data only in staging.
- Do not enable patient record access through public links.
- Do not change Google Business Profile booking links without authorized access and confirmation.
- A green CI build or mocked screenshot is not production release approval.
