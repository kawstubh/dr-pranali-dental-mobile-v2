import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const patientApi = read("../../src/api/dentalApi.js");
const patientApp = read("../../App.js");
const doctorConfig = read("../../doctor-app/src/api/apiConfig.js");
const doctorApi = read("../../doctor-app/src/api/doctorApi.js");

test("Patient and Doctor native apps consume the same configured Oralyn API origin", () => {
  assert.match(patientApi, /process\.env\.EXPO_PUBLIC_DENTAL_API_URL/);
  assert.match(doctorConfig, /process\.env\.EXPO_PUBLIC_DENTAL_API_URL/);
  assert.doesNotMatch(patientApi, /onrender\.com/i);
  assert.doesNotMatch(doctorConfig, /onrender\.com/i);
  assert.match(doctorApi, /requireDoctorApiUrl\(\)/);
});

test("Patient guest booking uses the shared public booking endpoint without patient identity tokens", () => {
  assert.match(patientApi, /\/v1\/dental\/public\/appointments/);
  assert.match(patientApp, /requestPublicAppointment/);
  assert.doesNotMatch(patientApi, /Authorization/);
});

test("Doctor native app sends protected requests through the same API client", () => {
  assert.match(doctorApi, /\/v1\/dental\/appointments/);
  assert.match(doctorApi, /Authorization: 'Bearer '/);
  assert.match(doctorApi, /requireDoctorApiUrl\(\) \+ path/);
});
