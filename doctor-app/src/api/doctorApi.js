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

async function request(path, token, options = {}) {
  const requestOptions = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...(options.headers || {}),
    },
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

export const loginDoctor = (email, password) =>
  request("/v1/dental/auth/login", null, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const loginDoctorGoogle = (supabaseAccessToken) =>
  request("/v1/dental/auth/google", null, {
    method: "POST",
    body: JSON.stringify({ access_token: supabaseAccessToken }),
  });

export const requestDoctorOtp = (phone) =>
  request("/v1/dental/auth/otp/request", null, {
    method: "POST",
    body: JSON.stringify({ phone }),
  });

export const verifyDoctorOtp = (phone, challenge_id, otp) =>
  request("/v1/dental/auth/otp/verify", null, {
    method: "POST",
    body: JSON.stringify({ phone, challenge_id, otp }),
  });

export const listAppointments = (token) =>
  request("/v1/dental/appointments", token);

export const listPatients = (token) =>
  request("/v1/dental/patients", token);

export const updateAppointment = (token, id, payload) =>
  request("/v1/dental/appointments/" + encodeURIComponent(id), token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const createPatient = (token, payload) =>
  request("/v1/dental/patients", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getHealth = () => request("/v1/dental/health", null);

export const getDentalChart = (token, patientId) =>
  request(
    "/v1/dental/patients/" + encodeURIComponent(patientId) + "/chart",
    token,
  );

export const saveDentalChartEntry = (token, patientId, payload) =>
  request(
    "/v1/dental/patients/" + encodeURIComponent(patientId) + "/chart",
    token,
    {
      method: "POST",
      body: JSON.stringify({ ...payload, patient_id: patientId }),
    },
  );

export const getPeriodontogram = (token, patientId) =>
  request(
    "/v1/dental/patients/" +
      encodeURIComponent(patientId) +
      "/periodontogram",
    token,
  );

export const savePeriodontogramEntry = (token, patientId, payload) =>
  request(
    "/v1/dental/patients/" +
      encodeURIComponent(patientId) +
      "/periodontogram",
    token,
    {
      method: "POST",
      body: JSON.stringify({ ...payload, patient_id: patientId }),
    },
  );

export const getMembershipPlans = () =>
  request("/v1/dental/billing/plans", null);

export const getMembership = (token) =>
  request("/v1/dental/billing/membership", token);

export const createMembershipOrder = (token, plan_id) =>
  request("/v1/dental/billing/order", token, {
    method: "POST",
    body: JSON.stringify({ plan_id }),
  });
