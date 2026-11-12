# Oralyn web portal release checklist

**Release product:** one responsive Doctor and Patient web portal, with PWA installation where supported. Native Android APKs are out of release scope and are not release gates.

## Canonical worktrees and current heads

- Frontend repository: `kawstubh/dr-pranali-dental-mobile-v2`, branch `feat/oralyn-desktop-app`, portal under `desktop/`.
- Current frontend PR #18 head checked 12 Nov 2026: `35a929a513b55a7c74676dfb269820469a30345e` (release-checklist documentation update). Latest workflow [#43250957004](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/runs/43250957004) passed 55 tests, npm audit (0 vulnerabilities), Vite build, real responsive public-route captures and PWA checks. The build merge commit was `2ba7acd52002f8d5a046d060cc9da9ebd209ad52`; Doctor workflow implementation commit: `c25cceefb630f637285a2df0e5fcd4368b9b84dd`; Vite SSR test shutdown-race mitigation commit: `4c342b7bd3f948056445396f3c1542d409a58d7b`.
- Backend repository: `kawstubh/universal-intelligence-engine`.
- Latest backend review head is PR #50 `886bd6ad9241eac24d36f8476ecbfd9dd77c4224`, stacked on PR #49. This cycle used GitHub-hosted CI and source inspection; the Windows C: drive was full, so no local backend checkout or test result is claimed.

## Backend review stack

All of these PRs are Draft and remain unmerged. Each latest observed CI pair passed unless marked pending.

| PR | Branch / feature | Latest head | Latest observed CI |
|---|---|---|---|
| #35 | Multi-tenant foundation | `7f52c0e7d4e69c92bd167c71392a5c756db54b30` | CI #42828077478 and Engine #42828077321 passed |
| #43 | Treatment plans, invoices and receipts | `9f2ff8518551f5b1143b5a6c784216177037ebcf` | CI #43158264781/#43158266549 and Engine #43158264883/#43158266596 passed |
| #44 | Private tenant-scoped documents | `740aa441a305dd5221f08cd6c71aec5923ec883b` | CI #43208918602 and Engine #43208918582 passed |
| #45 | Clinical notes and clinic messaging | `a5fdf6d82d2089fa0d442b2ddeef9be640d9cd43` | CI #43209149397 and Engine #43209149211 passed |
| #46 | Live workspace dashboard summary | `4d41602caed434eac3ca5206428a6297001675f0` | CI #43217812824 and Engine #43217813066 passed |
| #47 | Patient-authenticated booking and linked records | `37e11aacf274e922ca536fe15387ea67d4c75c95` | CI #43217749675 and Engine #43217749639 passed |
| #48 | Quarantine upload and verified immutable object key; file-signature checks | `6aed180f4dcb699fd8d05f09eb0ba8ef9570ad16` | CI #43219206335 and Engine #43219206215 passed |
| #49 | Explicit clinician review before patient sharing | `2c75a31677874e9a4ea4e6f623cb75eecb3f3434` | CI #43229823588 and Engine #43229823390 passed |
| #50 | Fail-closed exact-origin CORS and non-cacheable clinical responses | `886bd6ad9241eac24d36f8476ecbfd9dd77c4224` | PostgreSQL 16.15 CI #43259961072: **196 passed, 1 warning**; Engine #43259961046: **195 passed, 1 skipped, 1 warning** |

The dependency chain is now sequential: PR #35 → #43 → #44 → #45 → #46 → #47 → #48 → #49 → #50. PR #46 is based on #45, not a parallel branch.

## Migration graph and security review

Expected combined migration chain:

`0006_multi_tenant_workspaces` → `0007_dental_audit_workspace` → `0008_patient_billing_plans` → `0009_private_dental_documents` → `0010_clinical_notes_messaging` → `0011_document_clinical_review`.

PR #47, #48, #50 add no migration. PR #49 adds `0011_document_clinical_review`; its PostgreSQL CI migration test asserts the single head is that revision. No Neon main or production migration has been run.

Security review:
- Doctor billing, treatment plans, notes, messages and document routes use authenticated doctor identity and active workspace scope.
- Patient reads derive linked patient records from the authenticated Supabase user; client-supplied record IDs are checked against that link.
- Draft plans and invoices remain private; patient sharing/issuance is explicit.
- Money is stored as integer paise and receipt operations use idempotency.
- Document upload uses a quarantine `pending/` key, byte-level SHA-256 and signature checks, then publishes verified bytes under a separate `verified/` key. Replaying the presigned upload URL cannot overwrite the verified object.
- Patient document reads require available, clinician-reviewed and explicitly shared records. The review gate is not antivirus scanning; production document sharing still needs an approved malware/content-disarm scanner or a separately approved security-risk decision.
- Patient AI endpoints remain disabled; clinical intelligence is doctor-only.

## Portal implementation

The frontend API client includes Doctor and Patient methods for workspaces, patient linking, appointments, chart, treatment plans, billing, receipts, private documents, clinical notes and messages. The Doctor file workflow requires a review action before sharing; the Patient UI reads only linked, shared records. No sample clinical or financial totals are used.

Current web CI:
- Frontend head `024b6784e036be09e6d5ea3b5803444ea390e298`.
- Oralyn Desktop CI run [#43232473457](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/runs/43232473457) passed regression tests, dependency audit, Vite build, real responsive public-route captures and artifact uploads.
- Screenshot artifact [#13951051934](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/runs/43232473457/artifacts/13951051934); static staging-targeted bundle [#13950788375](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/runs/43232473457/artifacts/13950788375).
- Screenshots are genuine running-build public/authentication and guest-booking routes from commit `024b6784e036be09e6d5ea3b5803444ea390`. They are stale relative to the current Doctor workflow changes and are not authenticated Doctor dashboard or Patient record acceptance evidence.

## Latest Doctor workflow implementation — CI pending

The current portal branch now includes:
- Doctor-generated, 24-hour patient invite codes with copy/manual-copy fallback in the patient directory.
- Doctor appointment rescheduling using clinic-local `datetime-local` inputs and status updates restricted to the backend's allowed status values. Updates are serialized to avoid concurrent edits.
- Owner/admin Doctor account provisioning using clinic-issued email/password accounts (12+ character initial password), with the new doctor ID prefilled for cross-workspace membership assignment.
- API contract tests for appointment PATCH, patient invite generation and Doctor account creation, plus UI regression assertions.

These changes are committed on the current Draft PR #18 branch. They are not yet CI-verified, and no new authenticated browser screenshots have been captured for them. Do not treat them as accepted until a fresh run and browser smoke tests pass.

## Doctor workflow implementation

The portal now exposes:
- Doctor-generated 24-hour patient invite codes in the directory, with copy/manual-copy fallback.
- Appointment rescheduling using clinic-local `datetime-local` values and updates for the backend's allowed statuses. Concurrent appointment edits are serialized.
- Owner/admin doctor-account creation using clinic-issued email/password accounts with a minimum 12-character initial password; the created doctor ID is prefilled for cross-workspace membership assignment.
- Regression coverage for the invite, appointment PATCH and doctor account API contracts and the visible Doctor UI actions.

The feature commit and subsequent Vite SSR test mitigation passed CI run [#43250659956](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/runs/43250659956): **55 tests passed, 0 failed; 0 npm vulnerabilities; Vite production build and real browser capture passed**. The prior Vite dependency-scan shutdown race no longer appeared in this run. No actual authenticated Doctor/Patient staging account was used.

## Live staging checks — 12 Nov 2026

- `https://oralyn-multitenant-staging.onrender.com/ready`: HTTP 200; response reports database provider `postgres` only.
- `/openapi.json`: HTTP 200; the deployed service does not expose PR #43–#47 treatment/billing, document, clinical-note/message, dashboard-summary or patient-linking/booking routes.
- A current `/health` request timed out once; prior checks returned HTTP 200. Recheck before any rollout.
- Browser CORS preflight to the deployed API returned HTTP 405. PR #50 is a code change only; it has not been merged or deployed and no Render environment variable was changed.
- Render service metadata does not reveal the actual `DATABASE_URL` target. Do not assume it points to Neon.
- Neon project `dr-pranali-dental-recovery` is in `aws-ap-southeast-1`; only `main` exists. Read-only checks reported PostgreSQL 17.11, database `dental_recovery`, Alembic `0007_dental_audit_workspace`. No staging branch or storage bucket exists.
- Render database `dr-pranali-dental-db` remains suspended due billing. Do not resume it.
- Existing Render sites `oralyn-doctor-web`, `oralyn-patient-web`, `oralyn-doctor-test` and `oralyn-patient-test` point to the old separate-app branch; they are not the unified portal staging site.
- The connected Supabase account exposes only the existing dental project and no development branches. Do not seed synthetic staging users into that project.

## Staging prerequisites

- [ ] Explicit approval to merge/deploy the reviewed backend stack and desktop portal PR; all PRs remain Draft.
- [ ] Isolated staging PostgreSQL database and safe proof of its identity; never use Neon main or production.
- [ ] Isolated staging Patient Supabase project/branch and synthetic account.
- [ ] Isolated staging web origin with no unapproved spend; do not silently repurpose old separate-app sites.
- [ ] Configure exact HTTPS portal origin in `DENTAL_CORS_ORIGINS` and exact Supabase auth redirect URLs only after origin approval. PR #50 changes code defaults only; it does not set service configuration.
- [ ] Dedicated private staging object bucket, scoped credentials, private-access verification and pending-object lifecycle policy.
- [ ] Approved antivirus/content-disarm scanning before production document sharing.
- [ ] Verify HTTPS, security headers, error monitoring, PWA update and cache behavior, backup/restore and rollback.
- [ ] Confirm the staging API base URL and actual database identity without exposing connection strings.

## Authenticated browser acceptance

- [ ] Doctor email/password login, logout, session restore, expiry and revocation.
- [ ] Patient Supabase login/logout, session restore/expiry, invite-code linking and multiple linked clinic selection.
- [ ] Clinic/workspace switching and cross-organisation denial.
- [ ] Doctor dashboard live summary, patient directory/search, profile and odontogram read/write.
- [ ] Appointment create/update/list, clinic-local time handling and validation.
- [ ] Clinical notes create/update/read with version checks.
- [ ] Treatment plan create/update/share and Patient-visible state.
- [ ] Invoice create/issue, receipt record, balances and Patient-visible state.
- [ ] Private document upload/checksum/signature verification, review, scan, download intent, share/unshare and Patient access.
- [ ] Patient home, booking, appointment history, treatment journey, invoices/receipts, shared documents and clinic communication.
- [ ] Patient AI endpoints/UI denied; Doctor-only clinical intelligence accessible only to authenticated Doctors.
- [ ] Loading, empty, error, network failure, retry, validation, expired-session and reduced-motion states.
- [ ] Desktop 1440×1000 and 1280×800 plus mobile browser widths.
- [ ] Capture eight actual authenticated screens from the tested commit with synthetic data only: Doctor dashboard, patient directory, odontogram, appointments, Doctor-only intelligence, Patient home, booking and Patient records/billing.
- [ ] Include commit, environment and bundle checksum in screenshot metadata; exclude real patient identifiers.

## Local workspace limitation

The connected Windows development machine currently reports **0 bytes free on C:**. Local npm and pytest commands failed with `ENOSPC` while writing logs/cache; no trustworthy local test result was produced in this cycle. No files were deleted or cleaned. The latest GitHub CI runs above remain the verified build/test evidence. Free space must be restored by the device owner before further local test or build work.

## Release decision

**Not release-ready.** The live staging API lacks the stacked backend routes, deployed CORS still returns HTTP 405, no unified portal staging origin exists, the staging database identity is unknown, Patient staging authentication is not provisioned, and no private staging object bucket/scanner is configured. Current screenshots are public/authentication routes only. Keep all PRs Draft; no production deployment or migration is authorized by this checklist.

## Latest release-watch verification — 12 Nov 2026, 16:35 UTC

### Portal PR #18
- Current head: `35a929a513b55a7c74676dfb269820469a30345e`.
- [Latest CI #43250957004](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/runs/43250957004) passed all steps: 55 frontend tests, zero npm audit vulnerabilities, production Vite build, browser capture and PWA checks.
- [Actual browser screenshots #13959570982](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/runs/43250957004/artifacts/13959570982) contains 13 images at 1440×1000, 1280×800 and 390×844. The build manifest reports commit `2ba7acd52002f8d5a046d060cc9da9ebd209ad52`, local Plus Jakarta Sans and Playfair Display loaded, PWA controlled, zero API cache entries and no runtime errors.
- The manifest explicitly reports `authenticated_screens=false` and `synthetic_patient_data=none`. The images are Doctor/Patient login, Patient sign-up, guest booking and the records access gate—not authenticated release acceptance.
- [Staging-targeted static build #13958259178](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/runs/43250957004/artifacts/13958259178) remains `BLOCKED`: no Supabase staging auth, no isolated portal origin, backend stack not deployed, exact-origin CORS/auth redirects unverified, and private document storage not configured.

### Backend PR #50
- Latest head: `886bd6ad9241eac24d36f8476ecbfd9dd77c4224`.
- Adds `Cache-Control: no-store, private`, `Pragma: no-cache`, `Expires: 0` and `X-Content-Type-Options: nosniff` to Dental API responses, including the disabled Patient AI response.
- PostgreSQL 16.15 CI [#43259961072](https://github.com/kawstubh/universal-intelligence-engine/actions/runs/43259961072): **196 passed**; Engine Tests [#43259961046](https://github.com/kawstubh/universal-intelligence-engine/actions/runs/43259961046): **195 passed, 1 PostgreSQL-only skip**. The PostgreSQL migration test asserts one Alembic head, `0011_document_clinical_review`, and rehearses from `0005_password_auth` to `head` in an isolated CI schema.

### Fresh staging and workstation checks
- Render service `oralyn-multitenant-staging` still tracks `feat/multi-tenant-dental-saas-impl` at deployed commit `7f52c0e`; `/health` and `/ready` returned HTTP 200.
- Deployed OpenAPI has 37 paths and does not expose the PR #43–#49 billing, document, notes/messaging, dashboard-summary or patient-linking/booking routes. OPTIONS preflight returned HTTP 405.
- The separate legacy `dr-pranali-dental-api-staging` service returned health/readiness 200, but its OpenAPI request timed out; it is not substituted for the selected staging API.
- Supabase project `supabase-lime-flower` has no development branches. No production project was used for synthetic accounts.
- The canonical Windows worktree is at `024b678`, while the GitHub PR head is `35a929a`. `git fetch` failed with `ENOSPC`; C: reports 0 bytes free. No files or caches were deleted. GitHub CI is the verified build/test source for this cycle.

No PR was merged, no Render service or secret was changed, no Supabase branch/bucket was created, no production migration/deployment was performed, and no patient data was touched. Native APKs remain out of release scope.

## Public guest booking abuse and tenant-scope review — 12 Nov 2026

- Review of `POST /v1/dental/public/appointments` found that guest intake creates a new patient and a `requested` appointment under `DENTAL_MASTER_CLINIC_ID`, falling back to the legacy `dr-pranali` clinic. The request has no public clinic slug/selector and previously had no request rate limit.
- Backend [PR #51](https://github.com/kawstubh/universal-intelligence-engine/pull/51) adds an in-process sliding-window limit of **8 requests per client IP per 5 minutes**, HTTP 429 with `Retry-After`, and a bounded client-key map. PostgreSQL 16.15 CI [#43261410202](https://github.com/kawstubh/universal-intelligence-engine/actions/runs/43261410202): **199 passed**; Engine Tests [#43261410247](https://github.com/kawstubh/universal-intelligence-engine/actions/runs/43261410247): **198 passed, 1 PostgreSQL-only skip**. PR #51 is Draft and stacked on PR #50.
- The limiter is a single-instance interim control; it does not coordinate across replicas or survive restarts. Configure a shared limiter or edge/WAF policy before horizontal scaling.
- Until a verified public clinic slug and per-clinic abuse controls exist, keep guest booking restricted to the configured Dr Pranali master clinic. Do not present this endpoint as a multi-tenant public clinic directory.

No staging service or environment was changed by this review.

## Browser API-origin guard — 12 Nov 2026

The portal client now resolves `VITE_DENTAL_API_URL` through a fail-closed validator before making authenticated requests:

- Deployed builds accept only a canonical HTTPS origin.
- Credentials, path prefixes, query strings, fragments, malformed and non-HTTPS URLs are rejected before any Bearer token is sent.
- Vite development continues to use its same-origin `/v1` proxy and ignores arbitrary API URL overrides.
- Missing or invalid production configuration returns a stable configuration error instead of attempting a relative or insecure request.

Regression coverage includes valid HTTPS origins, trailing slash normalization, HTTP rejection, credential rejection, path/query/fragment rejection, malformed values, missing configuration and development proxy behavior.

This client-side guard is defense in depth only. It does not replace server-side authentication, exact-origin CORS, CSP/security headers, tenant authorization or staging-origin verification.

## Release-manifest gates — 12 Nov 2026

The staging build manifest now fails closed unless every release acceptance item has been explicitly verified. Staging and production API/portal origins must be canonical HTTPS origins (no credentials, path, query or fragment); local development may use HTTP.

The manifest tracks these environment-backed gates separately from build success:

- `ORALYN_DOCUMENT_SCAN_VERIFIED` — malware/content-disarm scanning is active and tested.
- `ORALYN_SECURITY_HEADERS_VERIFIED` — HTTPS, CSP, HSTS, frame, MIME and cache headers are verified at the deployed origin.
- `ORALYN_DATABASE_IDENTITY_VERIFIED` — staging service database identity is safely confirmed.
- `ORALYN_BACKUP_RESTORE_VERIFIED` — backup and restore rehearsal has passed.
- `ORALYN_ERROR_MONITORING_VERIFIED` — client/server error monitoring is configured and tested.
- `ORALYN_ROLLBACK_VERIFIED` — staging rollback has been rehearsed.
- `ORALYN_AUTHENTICATED_ROLE_E2E_VERIFIED` — Doctor and Patient login, logout, session restore and expiry pass.
- `ORALYN_CROSS_TENANT_E2E_VERIFIED` — cross-clinic and cross-patient denial tests pass.
- `ORALYN_AUTHENTICATED_SCREENSHOTS_VERIFIED` — all eight required authenticated screens are captured from the tested build.
- `ORALYN_MOBILE_BROWSER_E2E_VERIFIED` — authenticated mobile-browser flows pass.
- `ORALYN_PATIENT_AI_DENIAL_VERIFIED` — every patient AI/clinical-decision route is denied by both UI and API.

All gates default to false. Never set a flag to make a build appear ready; set it only after retaining the corresponding staging evidence. A green build, clean dependency audit or public-route screenshot does not satisfy an authenticated release gate.

## Non-AI patient invitation route

The Doctor portal now targets `POST /v1/dental/doctor/patients/{patient_id}/invite` from Draft backend PR #52. It is a clinic-scoped account-linking action, not an AI action. The legacy AI-prefixed route remains for compatibility until the backend stack is reviewed and deployed.


## Latest autonomous release watch — 13 Nov 2026, 00:55 IST

### Portal PR #18 — current verified head

- PR #18 remains Draft and unmerged. Current head: `915a13b5c68c04b30fccc3a5c53706d5dfafd38f`.
- [Latest CI run #43284471276](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/runs/43284471276) completed successfully. The job ran **72 frontend tests**, `npm audit` found **0 vulnerabilities**, the Vite production build passed, and the real-browser capture/PWA checks passed.
- The browser capture used merge-build commit `1b3b0a8f169b540fcb7a51dc6b0063444ec11c67`, which contains the PR head. The JS bundle SHA-256 is `cdd8e15faf57f0c927a240274f110d4e4c3f56c3a64d357bb9f00b0278431ac3`.
- [Actual browser screenshots artifact #13974471916](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/runs/43284471276/artifacts/13974471916), SHA-256 `658169d57091221ecf7cc697572cc5307ea6c6058bcec0d181e3a872d9a4bffc`. [Staging-targeted static bundle #13974985271](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/runs/43284471276/artifacts/13974985271), SHA-256 `b1cfacd090a7444881b127423562fdc5ebe3de66fa1dd57373ad99910edb8160`.
- The actual artifact contains 13 captures at 1440×1000, 1280×800 and 390×844. Its build metadata verifies both bundled fonts loaded, PWA service worker activated and controlled the preview, exactly one versioned shell cache exists, no API/auth/storage cache entries were found, role-route refresh/back/forward passed, and no runtime errors were observed.
- The metadata explicitly says `authenticated_screens=false` and `synthetic_patient_data=none`. The captures are signed-out Doctor/Patient login, Patient sign-up, guest booking and the Patient records authentication gate. They are **not** authenticated clinical acceptance screenshots.
- The build manifest remains `release_status=BLOCKED`; all 17 release checks remain false. Build success is not a release gate pass.

### Backend PR #53 — private malware scanning

- [PR #53](https://github.com/kawstubh/universal-intelligence-engine/pull/53) remains Draft and unmerged at `aaed4e08ebe1fa4f796473761bd92b9068946709`.
- It adds fail-closed private-network ClamAV INSTREAM scanning before a document is promoted from quarantine to the verified private-object prefix. Public, reserved, link-local, multicast and unspecified scanner targets are rejected; no file bytes are sent to a public scanning vendor.
- PostgreSQL 16 CI [#43282171888](https://github.com/kawstubh/universal-intelligence-engine/actions/runs/43282171888): **214 passed**. Engine Tests [#43282176439](https://github.com/kawstubh/universal-intelligence-engine/actions/runs/43282176439): **213 passed, 1 expected PostgreSQL-only skip**. No migration was added; one Alembic head remains `0011_document_clinical_review`.
- The scanner is intentionally unconfigured. Document finalization fails closed until a private ClamAV service with current definitions is independently provisioned and attested.

### Backend PR #54 — IPv6 scanner transport follow-up

- [PR #54](https://github.com/kawstubh/universal-intelligence-engine/pull/54) is a new Draft stacked directly on PR #53. Current head: `00b71230df62e1b6c853372061c21e1e8c0edeb8`.
- Review found that the scanner accepted private IPv6 ULA addresses but passed a four-field IPv6 sockaddr to `socket.create_connection()`, which expects a two-field address and performs another resolution. The follow-up preserves family/type/protocol/full sockaddr and connects directly to the resolved private address, avoiding a second DNS lookup.
- IPv4 and IPv6 ULA connection tests plus public/link-local rejection tests were updated. The Engine Tests workflow has completed successfully; the PostgreSQL CI job was still in progress at the last check. No migration or infrastructure change is included.

### Fresh infrastructure and workstation findings

- Render service `oralyn-multitenant-staging` still tracks `feat/multi-tenant-dental-saas-impl`; its latest live deploy is commit `7f52c0e7d4e69c92bd167c71392a5c756db54b30`, deployed 11 Nov 2026. No backend feature-stack deployment was triggered.
- The separate Render-managed `dr-pranali-dental-db` remains suspended due to billing. It was not resumed.
- Connected Supabase project `supabase-lime-flower` is active, but its development-branch list is empty. No synthetic Patient account or new project/branch was created.
- The Desktop Commander device is currently offline (last seen 42 minutes before this check). A fresh C: free-space reading, local preview-port verification and local cleanup could not be performed. No local files, caches, screenshots or evidence were deleted.
- Render staging health endpoints were not re-probed in this cycle. The latest deployment metadata confirms the service remains on the old base commit; database identity is still unverified. Do not assume it points to Neon.

### Current release decision

**Not release-ready.** Authenticated Doctor and Patient sessions, tenant switching/denial, backend feature APIs on an isolated staging database, private storage plus ClamAV, exact-origin CORS/auth redirects, security headers, backup/restore, monitoring, rollback and the eight authenticated screenshots remain unverified.

No PR was merged, no production deployment or migration was performed, no secret/CORS/auth redirect was changed, no paid resource was created/resumed, and no patient data was modified. Native APKs remain out of release scope.


## Security integration follow-up — 13 Nov 2026, 00:55 IST

### Malware scanning stack

- Draft PR #53 adds fail-closed ClamAV INSTREAM scanning over a private-only endpoint before quarantined documents are promoted to the verified private-object prefix. It has no schema migration and does not publish documents when the scanner is missing, unreachable, or reports a finding.
- Draft PR #54 fixes the scanner's IPv6 transport path. Its latest head `00b71230df62e1b6c853372061c21e1e8c0edeb8` passed PostgreSQL CI [#43290536395](https://github.com/kawstubh/universal-intelligence-engine/actions/runs/43290536395): **215 passed**; Engine Tests [#43290536384](https://github.com/kawstubh/universal-intelligence-engine/actions/runs/43290536384): **214 passed, 1 expected PostgreSQL-only skip**.
- The scanner remains unconfigured in staging. A private ClamAV service with current signatures/definitions and a private object bucket must be provisioned and attested before enabling document publication. Doctor review does not replace malware scanning.

### Public guest-intake rate-limit proxy identity

- Review found that PR #51 keyed its in-process limiter on `request.client.host`. Render documents that public requests reach the app through Cloudflare and Render load balancers, so this is the proxy address, not the visitor. This can cause unrelated visitors to share one rate-limit bucket.
- Draft PR #55 fixes this by validating and preferring Cloudflare's single-IP `CF-Connecting-IP` header; malformed/absent values fall back to the socket peer. It intentionally does not trust a caller-supplied X-Forwarded-For chain.
- Latest head `cc1b4b091eec497d5dc6f5a3254be955b5d78e91` passed PostgreSQL CI [#43291390674](https://github.com/kawstubh/universal-intelligence-engine/actions/runs/43291390674): **201 passed**; Engine Tests [#43291390563](https://github.com/kawstubh/universal-intelligence-engine/actions/runs/43291390563): **200 passed, 1 expected PostgreSQL-only skip**.
- Render's [true-client-IP guidance](https://render.com/articles/how-render-handles-ddos-attacks) and Cloudflare's [CF-Connecting-IP documentation](https://developers.cloudflare.com/fundamentals/reference/http-headers/) support this deployment assumption. The limiter is still process-local (8 requests per client per 5 minutes); use a shared limiter or edge/WAF control before horizontal scaling.

### Latest portal verification

- PR #18 head `752eb16a0cc95e67d391ba71ebcdd47c0fcb762a` passed [CI #43291034939](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/runs/43291034939): **72 tests**, zero npm audit vulnerabilities, production build and actual browser/PWA capture passed.
- [Actual screenshot artifact #13975344814](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/runs/43291034939/artifacts/13975344814) contains 13 genuine public-route captures. The build metadata says `authenticated_screens=false` and `synthetic_patient_data=none`; it is not authenticated acceptance evidence.
- [Static staging-targeted bundle #13976194066](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/runs/43291034939/artifacts/13976194066) was generated. Release status remains `BLOCKED` with all 17 gates false.

### Infrastructure and workstation

- Render's portal API service remains on `feat/multi-tenant-dental-saas-impl` at deployed commit `7f52c0e7d4e69c92bd167c71392a5c756db54b30`; the backend feature stack is not deployed. No service configuration was changed.
- The only Render Postgres instance named `dr-pranali-dental-db` remains suspended due to billing. No paid resource was resumed or created.
- The connected Supabase project has no development branches. No production project was used for synthetic Patient authentication.
- Desktop Commander remains offline, so local port ownership and free disk space cannot be freshly verified. No cache, user file, project asset, screenshot or evidence was deleted.

The portal remains **not release-ready**. Authenticated Doctor/Patient staging sessions, clinic/tenant isolation, the deployed backend feature stack, private object storage and scanning, exact-origin CORS/auth redirects, database identity, security headers, backup/restore, monitoring, rollback, mobile authenticated flows and eight authenticated screenshots remain outstanding. No PR was merged and no production action was taken.


## Unified backend integration branch — 13 Nov 2026

- Created [Draft backend integration PR #56](https://github.com/kawstubh/universal-intelligence-engine/pull/56) on `feat/oralyn-backend-release-integration-20261113`, based on PR #35's multi-tenant implementation. It consolidates the dependency stack PRs #43–#55 without merging any component PRs.
- Integration head: `1d9f4bd6c9f8588b19264ec74486b1a48ae22efb`; 70 commits, 33 changed files, 5,809 additions and 115 deletions relative to PR #35's branch.
- Combined PostgreSQL 16.15 CI [#43292096317](https://github.com/kawstubh/universal-intelligence-engine/actions/runs/43292096317): **218 passed**. Engine Tests [#43292096351](https://github.com/kawstubh/universal-intelligence-engine/actions/runs/43292096351): **217 passed, 1 expected PostgreSQL-only skip**.
- The migration rehearsal uses a disposable PostgreSQL schema, upgrades from `0005_password_auth` to head, asserts exactly one Alembic head (`0011_document_clinical_review`), verifies billing/document/notes/review schema and preserves synthetic legacy patient/appointment rows. It also checks workspace backfill, active-doctor counts, cross-organisation membership denial and rollback.
- The verified migration chain is linear: `0007_dental_audit_workspace` → `0008_patient_billing_plans` → `0009_private_dental_documents` → `0010_clinical_notes_messaging` → `0011_document_clinical_review`.
- The integration PR includes the PR #55 fix to use validated Cloudflare CF-Connecting-IP for Render guest-booking rate limits, and PR #54's complete IPv6 sockaddr handling for the private ClamAV scanner. Component CI passed: PR #54 (215 PostgreSQL; 214 Engine + 1 skip) and PR #55 (202 PostgreSQL; 201 Engine + 1 skip).
- All backend PRs remain Draft/unmerged. The integration branch is CI-only; it has not been deployed to Render. No Neon main/production migration was run.

## Latest portal artifact confirmation

- Latest portal PR head remains `62a1914c4c09f46bd625bed2ee413b5edb1db3ba`; PR CI [#43291687488](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/runs/43291687488) passed **72 tests**, zero npm audit vulnerabilities, production build and PWA/browser checks.
- [Latest actual screenshot artifact #13976509247](https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/runs/43291687488/artifacts/13976509247) was downloaded and inspected in this run. It contains 13 genuine captures and build-info tied to merge-build commit `6786a4f5a9b101e9e71d3df35b8be6a8483824a6`, bundle SHA-256 `cdd8e15faf57f0c927a240274f110d4e4c3f56c3a64d357bb9f00b0278431ac3`. Both fonts loaded, the PWA worker controlled the preview, API/auth/storage caches were empty, role-route refresh/back/forward passed, and runtime errors were none.
- The same metadata explicitly says `authenticated_screens=false` and `synthetic_patient_data=none`; screenshots are still public login/guest-booking/access-gate routes. All 17 release gates remain blocked.

## Workstation and staging remain gated

- Desktop Commander is offline; no fresh Windows disk-space or port-owner reading is available. No local files/caches/evidence were removed.
- Render staging remains on PR #35 base commit `7f52c0e7d4e69c92bd167c71392a5c756db54b30`; no feature-stack deployment occurred. Render DB identity is not verified.
- The connected Supabase organisation is on the Free plan; the active Dental project has no development branches, and a second inactive project was not restored or reused.
- No new Supabase project, paid service, private bucket or ClamAV scanner was created. The connected Supabase create-project workflow requires explicit organisation selection; the existing active project was not used for synthetic staging accounts.

The final release remains blocked on isolated authenticated staging, actual Doctor/Patient end-to-end flows, private storage/scanning, exact-origin CORS/auth redirects, database identity, security headers, backups/restore, monitoring/rollback and the eight authenticated clinical screenshots. No PR merge, production deploy, production migration, secret change, spend or patient-data mutation was performed.


## Neon recovery database — fresh read-only check, 13 Nov 2026

- Project `dr-pranali-dental-recovery` is in AWS `ap-southeast-1`, PostgreSQL **17.12**, Free plan. It has only the `main` branch; no isolated staging branch exists.
- Database `dental_recovery` still reports Alembic `0007_dental_audit_workspace`. Read-only aggregate checks found existing doctor, patient and appointment rows. No row contents or identifiers were read or copied.
- Because main contains existing clinical records, I did **not** create a child staging branch: Neon branching would clone the parent's data and would risk copying real patient data into staging.
- Project network settings currently have an empty IP allow-list, public connections are not blocked, and the HIPAA setting is false. These settings were only inspected; none were changed. Treat this recovery database as **not approved for production or synthetic staging** until its access/compliance posture is reviewed.
- No migration, write query, branch creation, connection-string retrieval or secret change was performed.

This strengthens the isolated-database blocker: a clean staging database must be separately provisioned without cloning existing clinical rows. The existing Neon main remains untouched at migration 0007.


## Cross-repository API path contract review — 13 Nov 2026

- Compared the portal's `desktop/src/api.js` request paths on the current web feature branch with FastAPI route decorators in backend integration PR #56.
- **44 unique frontend API paths; zero unmatched paths** against the integrated backend routes after normalizing dynamic path parameters and query strings.
- Nine backend routes are intentionally not currently called by the portal: membership billing/checkout/webhook, workspace membership update/deactivation, scan screening, WhatsApp template, and periodontogram routes.
- This is a static path-contract check only. HTTP verb, payload/response shape, auth scope, tenant isolation, patient consent, persistence and browser session behaviour still require authenticated staging E2E tests. It does not close any release gate.
