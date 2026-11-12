# Oralyn web portal release checklist

**Release product:** one responsive browser-based Doctor and Patient portal, with PWA installation where supported. Native Android APKs are out of scope and are not release gates.

## Current code and dependency stack

- Frontend repository: `kawstubh/dr-pranali-dental-mobile-v2`, branch `feat/oralyn-desktop-app`, app under `desktop/`.
- Backend repository: `kawstubh/universal-intelligence-engine`.
- PR #35: multi-tenant base and organisation/workspace authorization.
- PR #43: patient treatment plans, invoices/receipts, patient linked-record selection, CORS middleware and patient AI boundary.
- PR #44: private document metadata, signed upload/download intents and patient-visible sharing. Stacked on PR #43.
- PR #46: authenticated active-workspace dashboard aggregates. Stacked on PR #44.
- All backend PRs and the desktop portal PR remain Draft. Do not merge or deploy without the explicit approval gate.

## Latest verified code checks (12 Nov 2026)

- Desktop commit `ece61efd81e07836213e08427d499a836d2dc2a3`: 29 local tests passed, npm audit reported zero vulnerabilities, Vite production build passed.
- Backend PR #46 commit `c3cf902018b3c1cd3f318871b269a12e2e9ce898`: local full suite 169 passed, 1 skipped; Ruff check and git diff check passed; one Alembic head `0009_private_dental_documents`.
- PR #46 PostgreSQL 16.15 CI: 170 passed, 1 warning. Engine CI: 169 passed, 1 skipped.
- PR #44 PostgreSQL 16.15 CI: 167 passed, 1 warning. Engine CI: 166 passed, 1 skipped.
- PR #43 PostgreSQL 16.15 CI: 156 passed, 1 warning. Engine CI: 155 passed, 1 skipped.
- PR #35 PostgreSQL 16.15 CI: 137 passed, 1 warning. Engine CI: 136 passed, 1 skipped.
- No Neon main or production migration has been run.

## Verified staging state

- `https://oralyn-multitenant-staging.onrender.com/health`: HTTP 200; providers report healthy.
- `/ready`: HTTP 200, reports database provider `postgres` only. The Render service connector does not expose its `DATABASE_URL` target; the exact database identity remains unverified.
- Staging OpenAPI does not currently expose the PR #43 treatment-plan/invoice/receipt routes, PR #44 document routes or PR #46 dashboard-summary route.
- Browser-style CORS preflight from `http://localhost:5173` returns HTTP 405. The local Vite proxy returns HTTP 200.
- Neon project `dr-pranali-dental-recovery` is in `aws-ap-southeast-1`; only the `main` branch exists, with no isolated staging branch. Read-only query confirms PostgreSQL 17.11, database `dental_recovery`, Alembic `0007_dental_audit_workspace`.
- Neon main object storage is enabled but lists zero buckets. No private bucket, storage credential or branch has been created.
- Render `dr-pranali-dental-db` is suspended due to billing. Do not resume it.
- Existing Render static sites `oralyn-doctor-web`, `oralyn-patient-web`, `oralyn-doctor-test` and `oralyn-patient-test` point to an older separate-app branch; they are not the unified portal staging site and must not be repurposed silently.

## Required staging prerequisites

- [ ] Backend PR stack reviewed and explicitly approved for merge/deployment in order: #35, then #43, then #44, then #46.
- [ ] Confirm the staging API database identity without exposing connection strings; it must be an isolated staging database, not Neon main or production.
- [ ] Create/identify an isolated staging web origin without incurring unapproved charges.
- [ ] Configure exact CORS origin and Supabase auth redirect allow-list only after the staging origin is approved.
- [ ] Provision an isolated Patient Supabase project/branch and synthetic test account. Do not use the sole existing production dental Supabase project for synthetic data.
- [ ] Provision a dedicated private staging object-storage bucket and scoped credentials. Keep bucket private; no public access or Render filesystem fallback.
- [ ] Verify HTTPS, security headers, error monitoring, PWA update/cache behavior, backup/restore and rollback.

## Authenticated browser acceptance

- [ ] Doctor email/password login, logout, session restore, expiry and revocation.
- [ ] Patient Supabase login/logout, session restore/expiry, invite-code linking and multiple linked clinic selection.
- [ ] Clinic/workspace switching and cross-organisation denial.
- [ ] Doctor dashboard live summary, patient directory/search, patient profile and odontogram read/write.
- [ ] Appointments create/update/list, clinic-local date/time handling and booking validation.
- [ ] Clinical notes create/update/read with version checks.
- [ ] Treatment plan create/update/share and patient-visible state.
- [ ] Invoice create/issue, receipt record, balance and patient-visible state.
- [ ] Private document upload/checksum verification/download intent/share/unshare with private bucket.
- [ ] Patient home, booking, appointment history, treatment journey, invoices/receipts, shared documents and clinic communication.
- [ ] Patient AI endpoints and UI actions denied; Doctor-only clinical intelligence remains available only to authenticated doctors.
- [ ] Loading, empty, error, network failure, retry, validation, expired-session and reduced-motion states.
- [ ] Desktop 1440x1000 and 1280x800 plus mobile browser widths.
- [ ] Capture eight actual authenticated screens from the tested commit with synthetic data only: Doctor dashboard, patient directory, odontogram, appointments, Doctor-only intelligence, Patient home, booking, Patient records/billing.
- [ ] Verify screenshot metadata includes commit, environment and bundle checksum; no real patient identifiers.

## Release decision

**Not release-ready.** The live staging API is still missing the backend routes, direct CORS is not enabled in the deployed service, Patient staging authentication is not provisioned, private object storage has no bucket, the Render database identity is unknown, and no unified portal staging web origin exists. Keep all PRs Draft; no production deployment or migration is authorized by this checklist.
