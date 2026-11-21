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

test("full-logo placements use the user-approved transparent Oralyn master and keep the compact icon separate", () => {
  const approved = "../public/oralyn-official-logo.png";
  const assistant = read("../src/assistant.jsx");
  const serviceWorker = read("../public/sw.js");
  assert.ok(existsSync(new URL(approved, import.meta.url)));
  assert.ok(statSync(new URL(approved, import.meta.url)).size > 500000);
  assert.ok(existsSync(new URL("../public/oralyn-app-icon-approved.webp", import.meta.url)));
  assert.match(brandDoc, /17 November 2026/);
  assert.match(brandDoc, /F0BFD671CA7CA8A0122F027A6E9B7F02B676CB7D98003B9ADF32227788CA6803/);
  assert.ok(main.includes('className="oralyn-approved-wordmark" src="/oralyn-official-logo.png"'));
  assert.ok(main.includes('className="brand"><img src="/oralyn-app-icon-approved.webp"'));
  assert.ok(assistant.includes('src="/oralyn-official-logo.png"'));
  assert.ok(patientHome.includes('src="/oralyn-official-logo.png"'));
  assert.ok(patientBooking.includes('src="/oralyn-official-logo.png"'));
  assert.ok(html.includes('href="/oralyn-app-icon-approved.webp"'));
  assert.ok(serviceWorker.includes('"/oralyn-official-logo.png"'));
  assert.ok(serviceWorker.includes('"/oralyn-app-icon-approved.webp"'));
  assert.doesNotMatch(main + assistant + patientHome + patientBooking + serviceWorker, /oralyn-logo-approved\.webp/);
  assert.match(css, /oralyn-approved-wordmark[^}]*max-height:none/);
});;

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

test("browser font acceptance attaches a Playfair probe and verifies both local font resources", () => {
  assert.match(captureScript, /Oralyn Display Font Probe/);
  assert.match(captureScript, /probe\.className = "oralyn-font-probe"/);
  assert.doesNotMatch(captureScript, /probe\.style\.cssText/);
  assert.match(css, /\.oralyn-font-probe\s*\{/);
  assert.match(captureScript, /\/fonts\/PlusJakartaSans-Variable\.ttf/);
  assert.match(captureScript, /\/fonts\/PlayfairDisplay-Variable\.ttf/);
  assert.match(captureScript, /document\.fonts\.load\('600 32px "Playfair Display"'/);
  assert.match(captureScript, /contentType/);
  assert.match(captureScript, /matchingFaces/);
  assert.match(captureScript, /fontFaceRules/);
});
