const API_URL = "https://dr-pranali-dental-api.onrender.com";
const REQUEST_TIMEOUT_MS = 75_000;
const RETRY_DELAY_MS = 3_000;

function isRetryable(error) {
  return (
    error?.name === "AbortError" ||
    error?.message === "Network request failed" ||
    error?.message?.includes("Network request failed")
  );
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function request(path, options = {}) {
  const requestOptions = {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  };
  let response;
  try {
    response = await fetchWithTimeout(API_URL + path, requestOptions);
  } catch (error) {
    if (!isRetryable(error)) {
      throw new Error("The clinic server could not be reached. Please try again.");
    }
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    try {
      response = await fetchWithTimeout(API_URL + path, requestOptions);
    } catch {
      throw new Error(
        "The clinic server is waking up or temporarily unavailable. Please try again in a minute.",
      );
    }
  }

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {}

  if (!response.ok) {
    throw new Error(
      (data && (data.detail || data.message)) ||
        "The clinic service returned an error. Please try again.",
    );
  }
  return data;
}

export async function requestPublicAppointment(payload) {
  return request("/v1/dental/public/appointments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getDentalHealth() {
  return request("/v1/dental/health");
}
