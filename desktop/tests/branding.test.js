import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const main = read("../src/main.jsx");
const patientHome = read("../public/patient/home/index.html");
const patientBooking = read("../public/patient/booking/index.html");
const css = read("../src/styles.css");
const html = read("../index.html");
const fontsDoc = read("../docs/FONTS.md");
const brandDoc = read("../docs/BRAND_ASSETS.md");
const captureScript = read("../scripts/capture-actual-desktop.cjs");

test("licensed display and body fonts are bundled locally with traceable source revisions", () => {
  assert.match(css, /font-family: "Plus Jakarta Sans"/);
  assert.match(css, /url\("\/fonts\/PlusJakartaSans-Variable\.ttf"\)/);
  assert.match(css, /font-family: "Playfair Display"/);
  assert.match(css, /url\("\/fonts\/PlayfairDisplay-Variable\.ttf"\)/);
  assert.doesNotMatch(css, /fonts\.googleapis\.com|fonts\.gstatic\.com|DM Sans/i);
  for (const path of [
    "../public/fonts/PlusJakartaSans-Variable.ttf",
    "../public/fonts/PlayfairDisplay-Variable.ttf",
    "../public/fonts/OFL-Plus-Jakarta-Sans.txt",
    "../public/fonts/OFL-Playfair-Display.txt",
    "../public/fonts/Plus-Jakarta-Sans-METADATA.pb",
    "../public/fonts/Playfair-Display-METADATA.pb",
  ]) {
    assert.ok(existsSync(new URL(path, import.meta.url)), path + " must exist");
  }
  assert.match(fontsDoc, /SIL Open Font License 1\.1/);
  assert.match(fontsDoc, /18d1cd2f7ea10481919d2f05c1f7064b7307fc26/);
  assert.match(fontsDoc, /80a334101928546b04fa9e709ad4b2f11f8a9e10/);
  assert.match(fontsDoc, /89B3FB38AA0D275D7A731D0D817A4F1622B316B4D7FBDEDCF02EE9099FF68BC8/);
  assert.match(fontsDoc, /C40F2293766A503BC70CCE9E512EF844A4CCB7CBCDE792FE2EA31D191917D8D6/);
});

test("the approved Oralyn wordmark and app mark are used; provisional artwork is not shipped", () => {
  for (const path of ["../public/oralyn-logo-approved.webp", "../public/oralyn-app-icon-approved.webp"]) {
    assert.ok(existsSync(new URL(path, import.meta.url)), path + " must exist");
    assert.ok(statSync(new URL(path, import.meta.url)).size > 1000);
  }
  assert.ok(patientHome.includes('href="/oralyn-app-icon-approved.webp"'));
  assert.match(main, /src="\/oralyn-logo-approved\.webp"/);
  assert.match(html, /href="\/oralyn-app-icon-approved\.webp"/);
  assert.doesNotMatch(main + html, /oralyn-app-icon\.png|oralyn-mark\.png|oralyn-logo-recovered\.jpg/);
  assert.doesNotMatch(css, /\.brand img,\s*\.authbrand img\s*\{\s*display:\s*none/i);
  assert.match(brandDoc, /Oralyn Investor Presentation_20261020_200633_0000\.pptx/);
  assert.match(brandDoc, /ppt\/media\/image1\.png/);
});

test("the root render is protected by the visible React error boundary", () => {
  assert.match(main, /import ErrorBoundary from "\.\/ErrorBoundary\.jsx"/);
  assert.match(main, /<ErrorBoundary>/);
  assert.match(main, /<ErrorBoundary>[\s\S]*?<\/ErrorBoundary>/);
});

test("the Doctor dashboard uses live normalized data and does not fabricate totals or history", () => {
  assert.match(main, /normaliseUser\(me\)/);
  assert.match(main, /normaliseList\(patientResult\.value/);
  assert.match(main, /Promise\.allSettled/);
  assert.match(main, /todayRows/);
  assert.doesNotMatch(main, /14 November 2026|Aarav Mehta|Rohan Kulkarni|Diya Shah/i);
  assert.match(main, /dentalApi\.dashboardSummary\(token\)/);
  assert.match(main, /Active treatments/);
  assert.match(main, /Collected to date/);
  assert.match(main, /dashboardSummaryError/);
  assert.doesNotMatch(main, /Invoice API pending|Treatment-plan API pending/);
  assert.match(main, /No sample history is shown/);
  assert.doesNotMatch(main, /^const people = \[\];|^const appts = \[\];/m);
});

test("public patient pages have no diagnosis feature and booking slots respect clinic hours", () => {
  assert.doesNotMatch(main, /function Patient\(/);
  assert.doesNotMatch(patientHome + patientBooking, /AI diagnosis|self-diagnosis|clinical intelligence/i);
  assert.match(patientBooking, /10:00/);
  assert.match(patientBooking, /20:00/);
  assert.doesNotMatch(patientBooking, /09:00/);
  assert.match(patientBooking, /Asia\/Kolkata/);
  assert.match(patientBooking, /\+05:30/);
});

test("Doctor workspace administration stays scoped to the active organisation", () => {
  assert.match(main, /function WorkspaceManagement/);
  assert.match(main, /dentalApi\.organisationWorkspaces\(token, orgId\)/);
  assert.match(main, /dentalApi\.createWorkspaceMembership/);
  assert.match(main, /activeWorkspace\?\.organisation_id/);
  assert.match(main, /onSwitchWorkspace/);
});


test("headless capture stores its Chrome profile outside the Vite-watched project", () => {
  assert.match(captureScript, /const os = require\("node:os"\)/);
  assert.match(captureScript, /path\.join\(os\.tmpdir\(\), "oralyn-capture-profile-"/);
  assert.doesNotMatch(captureScript, /path\.join\(output, "\.chrome-profile-"/);
});
