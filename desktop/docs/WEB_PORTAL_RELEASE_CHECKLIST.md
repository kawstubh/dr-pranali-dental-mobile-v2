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

