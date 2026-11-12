# Oralyn Desktop

Independent React/Vite desktop and laptop experience for the Oralyn Doctor and Patient portals.

## Local development

1. Copy .env.example to .env.local and provide the authorised Supabase URL and publishable key. These are environment-specific configuration values; never commit .env.local.
2. npm ci
3. npm test
4. npm run dev

The Vite development server proxies /v1 to the isolated Oralyn staging API. CORS middleware and patient-boundary handling are present in the stacked backend PR #43, but the deployed staging API still returns HTTP 405 to browser OPTIONS preflight requests; keep the proxy until the backend stack is approved and deployed. Production builds default to the staging API unless VITE_DENTAL_API_URL is explicitly supplied. Do not point this app at production without a separate approval.

## Validation

- npm test covers brand/font asset provenance, data normalisation, date/time handling, tenant-scoped workspace management and patient/doctor role boundaries.
- npm audit --audit-level=low
- npm run build
- The oralyn-desktop.yml workflow captures real, signed-out screens from the production Vite preview at 1440x1000 and 1280x800. It does not fabricate patient records or claim authenticated dashboard coverage.

## Security and data boundaries

- Doctor APIs require the existing clinic-issued doctor email/password session.
- Patient records, appointments and chart routes require Supabase patient authentication and clinic linking.
- Patient-facing AI diagnosis, triage, treatment explanation, aftercare, consent and stored AI history are not available. Clinical intelligence remains doctor-only.
- No sample patients, appointments, invoices, balances or clinical totals are seeded.
- Treatment-plan CRUD, invoice/receipt APIs and private document storage are implemented in Draft backend PRs #43 and #44; the live staging OpenAPI still does not expose those routes. The live Doctor dashboard aggregate is proposed in Draft PR #46. The UI reports unavailable endpoints rather than substituting mock data. Private documents remain unavailable until a dedicated private staging bucket and scoped storage credentials are configured; never use an ephemeral filesystem.
- Patient records and all clinic data remain tenant-scoped. Do not weaken API authentication or organisation membership checks.
