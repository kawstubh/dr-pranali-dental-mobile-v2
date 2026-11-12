# Doctor Android and web cold-start evidence

- Source branch: fix/doctor-safe-area-startup
- Source head: bf70ff89e816f2fa7af90efa9e0a1009e1720778
- Workflow run: https://github.com/kawstubh/dr-pranali-dental-mobile-v2/actions/runs/43131921056
- Staging APK artifact ID: 13905867561
- Android runtime evidence artifact ID: 13906057161
- Environment: staging API https://oralyn-multitenant-staging.onrender.com
- Package: com.drpranali.dental.doctor
- Device: Android emulator, 1080x1920

The previous user-reported APK and the new staging APK both rendered the clinic email/password login screen on cold start. Logcat has no React Native JS exception, fatal exception, or missing-safe-area error. This does not prove the authenticated dashboard is fixed: authenticated runtime, empty-account behavior, workspace selection, API error handling and session persistence were skipped because the dedicated synthetic staging Doctor credentials and dataset markers were not configured. This evidence is intentionally partial and is not a release sign-off.
