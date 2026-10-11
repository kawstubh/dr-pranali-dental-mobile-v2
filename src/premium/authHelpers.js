const API_URL = 'https://dr-pranali-dental-api.onrender.com';
export const AUTH_STAGE_TIMEOUT_MS = 20000;

export function withStageTimeout(promise, stage) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error(stage + ' timed out after 20 seconds. Check your connection and retry.');
      error.code = 'AUTH_STAGE_TIMEOUT';
      reject(error);
    }, AUTH_STAGE_TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export async function wakeDentalBackend() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AUTH_STAGE_TIMEOUT_MS);
  try {
    const response = await fetch(API_URL + '/health', { method: 'GET', signal: controller.signal });
    return { ok: response.ok, status: response.status };
  } catch (error) {
    return { ok: false, code: error?.name === 'AbortError' ? 'WAKE_TIMEOUT' : (error?.code || 'WAKE_FAILED') };
  } finally {
    clearTimeout(timer);
  }
}
