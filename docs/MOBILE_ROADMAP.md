# Doctor Mobile Roadmap

Base branch: `master`; working integration branch: `integration/doctor-app`. No automation may merge to `master` or publish a release from non-master.

## M5 — Doctor app wiring
- [ ] Doctor sign-in uses the existing email/password session and HTTPS API.
- [ ] Doctor AI screens call authenticated Doctor-only endpoints; patient AI is not exposed.
- [ ] Every generated clinical output displays **“AI suggestion, doctor to verify”**.
- [ ] Accept/edit/dismiss are explicit doctor actions; AI never writes clinical records itself.
- [ ] Handle 401 expiry, 403 clinic denial, 404 patient AI disabled, 429 rate limit, unavailable provider, and offline/network failure.
- [ ] Preserve Android package IDs, signing config/keys, Google OAuth client IDs, and existing release workflows.
- [ ] TypeScript, lint, unit/UI tests, Expo export and accessibility checks pass.
- [ ] APK builds trigger only on mobile file changes and are capped at four builds per UTC day.
- [ ] Acceptance: device test covers login/logout, patient list, cross-clinic denial, clinical AI advisory labels, no dosage advice, emergency flags, and provider-offline state.

## Option D redesign groups
- [ ] D1 Design tokens, shared components, accessibility and consistent loading/error/empty states.
- [ ] D2 Doctor home: appointments, daily summary, urgent/emergency flags.
- [ ] D3 Patient workspace: chart, periodontogram, history and treatment context.
- [ ] D4 AI workspace: patient summary, treatment suggestions, note drafting and accept/edit/dismiss.
- [ ] D5 Follow-up and recall workflows.
- [ ] D6 Regression screenshots, real-device QA and APK verification.
- [ ] Each group lands as a feature-branch PR with test evidence and screenshots.

## CI / delivery gates
- [ ] Unit/UI tests and security contract checks.
- [ ] Type and lint checks.
- [ ] Path-filtered APK build with a maximum of four builds per UTC day.
- [ ] PR auto-merge only after all required checks pass and branch protections enforce them.
- [ ] No direct pushes to shared branches and no auto-merge/publishing to master.
