// Web-only screenshot preview adapter. Native APK authentication remains in googleAuth.js.
export async function signInWithGoogle(apiUrl, onStage) {
  const error = new Error('Native Google Sign-In is available in the Android/iOS app, not in the web screenshot preview.');
  error.code = 'WEB_PREVIEW_ONLY';
  error.stage = 'Verifying with Google...';
  onStage?.(error.stage);
  throw error;
}
export async function getStoredDoctorSession() { return null; }
export async function signOutGoogle() {}
