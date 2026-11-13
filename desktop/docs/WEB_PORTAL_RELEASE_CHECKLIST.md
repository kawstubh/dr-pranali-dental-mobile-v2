# Oralyn Web Portal — Release Checklist

**Status: BLOCKED — synthetic staging and CI are progressing; production release is not approved.**

Last refreshed: 13 November 2026.

## Product decisions

- One responsive web portal for desktop, tablet and mobile browsers. PWA installation is optional. Native apps and APKs are not part of the product or release.
- Patient discovery, clinic information and appointment requests are public and account-free. No patient account, password, OTP, signup/login, Supabase patient auth or patient-linked-record session.
- A public appointment request is not a confirmed appointment; the clinic must contact the patient to confirm.
- Doctor authentication remains mandatory.
- Clinic Assistant has a separate identity, sign-in and least-privilege API. Never map Assistant to Doctor.
- Clinical intelligence remains Doctor-only. No patient-facing diagnosis, self-diagnosis, triage or clinical AI for Assistants.
- Google Business Profile is a discovery/referral entry point only. No booking-link change is claimed without authorized access and confirmation.
- Patient-specific no-login record sharing is deferred. Public references are not access tokens.

## Repositories and current pull requests

### Frontend

- Repository: kawstubh/dr-pranali-dental-mobile-v2
- Draft PR: [#18](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/pull/18)
- Branch: feat/oralyn-desktop-app
- Current head: 1e98be418ffd5586e846fdb539da82c74e8cc195
- Latest CI for this head: [#43384366839](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/runs/43384366839) — in progress at the time of this refresh.
- Previous verified head: 8615bfcfac521d6a0c6d84734888fff9a11dec96.
- Previous green CI: [#43383094702](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/runs/43383094702) — 89/89 tests passed, npm audit reported 0 vulnerabilities, production build passed, live synthetic staging contract passed, and headless-Chrome desktop/tablet/mobile public captures passed.

The current frontend commit retires the unused root Expo/React Native package manifest and its Supabase/Google sign-in dependencies. The root workspace now delegates build/test to desktop/. The active desktop package is the only portal application. A new regression test guards against reintroducing native or patient-auth dependencies. A local root npm ci and offline npm audit both passed with zero dependencies and zero vulnerabilities. The new commit's GitHub CI is still required before calling this cleanup green.

### Backend

- Repository: kawstubh/universal-intelligence-engine
- Draft PR: [#60](https://github.com/kawstubh/universal-intelligence-engine/pull/60)
- Branch: feat/oralyn-clinic-assistant-rbac
- Head: e6bae0850e6a686e4cc6ae5080497e1b9751ab8c
- [PostgreSQL CI #43375965593](https://github.com/kawstubh/universal-intelligence-engine/actions/runs/43375965593): 237 passed.
- [Engine Tests #43375965660](https://github.com/kawstubh/universal-intelligence-engine/actions/runs/43375965660): 236 passed, 1 expected skip.
- PR is cleanly mergeable but remains Draft and unmerged.
- Synthetic staging deploy: [dep-dbrb4dv6km5c73c831ag](https://dashboard.render.com/web/srv-dbr8m159fdbs73dl404g/deploys/dep-dbrb4dv6km5c73c831ag), reported LIVE on the exact PR #60 head.
- Staging API: https://oralyn-staging-api-assistant.onrender.com

## Latest live synthetic contract evidence

Frontend CI #43383094702 ran the staging contract against the exact frontend and backend PR heads. Its log records PASS for:

- API /health, /ready and /v1/dental/health; Postgres and UIE configuration.
- Live database identity matched the isolated Neon project/branch/database.
- Exact portal-origin CORS POST preflight.
- API and portal security headers, including HSTS, nosniff, frame protection, referrer policy and permissions policy; portal CSP and API no-store.
- Account-free public patient pages and no patient-auth OpenAPI routes.
- Unauthenticated Doctor and Assistant protected reads returned 401; disabled legacy patient routes returned 404; public booking GET returned 405.
- Shared API/UI service catalogue: 20 approved labels plus Other dental concern.
- One synthetic public booking request and idempotency replay returned the same opaque ORL reference without patient or appointment identifiers.
- Live portal build manifest matched frontend head 8615bfcfac521d6a0c6d84734888fff9a11dec96.
- Live API deployment commit matched backend PR #60 head e6bae0850e6a686e4cc6ae5080497e1b9751ab8c.

The CI contract creates one synthetic request per backend commit per India-local day and replays the same idempotency key. Replays do not create duplicate requests. This is test data only, not a real booking.

## Synthetic staging database

- Neon project: silent-king-54610898
- Branch: br-steep-bonus-a1yqarg7
- Database: oralyn_staging
- Current Alembic revision: 0013_public_booking_idempotency
- Read-only aggregate counts: 3 synthetic patients, 3 appointments, 2 public booking requests, 0 Assistant accounts, 0 Assistant sessions, 0 receipts, 0 documents, 4 audit events.

The Neon project currently permits public connections, has HIPAA disabled and has six-hour history retention. It is strictly synthetic-only. Do not copy recovery or production patient data into it. Do not treat it as a compliant production database.

## Clinic Assistant permission matrix

Allowed, clinic-scoped operations:
- Minimal patient contact intake and contact details.
- Appointment queue, confirmation, rescheduling and cancellation.
- Issued-invoice balance summaries.
- Recording payments already received, with idempotency and audit events.

Denied operations:
- Doctor patient directory/profile, odontogram, periodontal chart and clinical notes.
- Treatment-plan creation or editing, prescription signing or clinical decisions.
- Clinical intelligence, scan screening or Doctor-only AI.
- Private document upload, download or sharing.
- Owner/organisation/workspace settings and membership administration.
- Invoice creation, issue, edit or void.
- Patient account creation, linking or record sharing.

Backend tests cover allowed writes, 403 denial on Doctor/owner operations, cross-clinic isolation, Doctor-token rejection by Assistant endpoints, session logout/deactivation, receipt idempotency and audit behavior. These are CI/API tests. The current staging database has no Assistant account or Assistant session, so live Assistant sign-in and persistence acceptance remain open.

## Doctor and Assistant acceptance status

- CI Doctor and Assistant screenshots are headless-Chrome synthetic fixtures.
- The CI Doctor fixture reports password login not verified and cross-organisation denial as fixture-only.
- The CI Assistant fixture uses a mocked login and fixture-backed writes.
- These screenshots prove UI layout and interaction coverage only. They do not prove live authenticated API persistence.
- Do not mark Doctor or Assistant authenticated acceptance complete until real staging credentials are used and create/read/update persistence plus server-side role and tenant boundaries are verified.

## Public booking requirements

- Public clinic page and booking page load without a patient account.
- Minimum contact details and one of the 20 approved services or Other.
- Required fields and India-time future date/time validation.
- Timezone-aware API input.
- HMAC-keyed contact/request fingerprints, idempotency and duplicate prevention.
- Anti-abuse rate limit, exact-origin CORS and safe success/error responses.
- Public response contains an opaque request reference only; no patient ID, appointment ID, clinical note or record access.
- Never submit test requests except through the synthetic CI contract and isolated synthetic database.

The current in-process rate limiter is suitable only for the present single-instance staging service. Production multi-instance deployment requires shared/distributed rate limiting or a trusted edge/WAF policy.

## Documents and storage

Document upload, download and sharing remain disabled. A private object-storage bucket and fail-closed malware scanner are not provisioned. Do not enable document features until storage access controls, file-signature checks, quarantine, scanning, clean-object promotion, audit and deletion/retention behavior are verified.

## Remaining release blockers

1. Provision and verify private document storage.
2. Provision and verify fail-closed malware scanning.
3. Complete real authenticated Doctor login and API-backed create/read/update persistence acceptance.
4. Create and verify a real staging Assistant account/session; exercise allowed writes and denied 403 operations through the live UI/API.
5. Complete live cross-tenant staging E2E with separate synthetic clinics.
6. Capture authenticated Doctor and Assistant screenshots from real staging sessions.
7. Complete backup and restore rehearsal.
8. Configure error monitoring and alerting.
9. Complete rollback rehearsal and document the tested rollback path.
10. Approve and configure production database/domain, security controls and deployment plan; production migration/deployment remains separately gated.

The CI build manifest remains BLOCKED on these gates. The static Render build manifest may be more conservative until CI evidence is propagated into that separate build environment; never change manifest flags manually to make a release appear ready.

## Operational restrictions

- Keep PR #18 and PR #60 Draft and unmerged.
- Do not deploy production, migrate Neon main/recovery databases, change production secrets, spend money, resume paid infrastructure or delete patient/user data.
- Use only synthetic data in staging.
- Do not enable patient record access through public links.
- Do not change Google Business Profile booking links without authorized access and confirmation.
- A green CI build or mocked screenshot is not production release approval.
