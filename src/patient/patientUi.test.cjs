const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const ui = read('src/patient/PatientExperience.js');
const app = read('App.js');
const api = read('src/api/dentalApi.js');
const fontDocs = read('docs/PATIENT_FONTS.md');
const workflow = read('.github/workflows/android-apk.yml');

test('patient interface keeps the existing Google sign-in and guest browsing paths', () => {
  assert.match(ui, /signInWithGoogle/);
  assert.match(ui, /Explore as a guest/);
  assert.match(read('src/auth/googleAuth.js'), /56124766906-7qlnhr7b3l1iri981i6p984n12nma9ji\.apps\.googleusercontent\.com/);
  assert.match(read('src/auth/googleAuth.js'), /https:\/\/jzxbeldubkhwnznrathu\.supabase\.co/);
});

test('appointment booking retains the existing public API endpoint and payload contract', () => {
  assert.match(api, /\/v1\/dental\/public\/appointments/);
  for (const key of ['name:', 'phone:', 'starts_at:', 'treatment_type:', 'note:']) assert.ok(ui.includes(key), 'Missing appointment field ' + key);
  assert.match(ui, /requestPublicAppointment/);
});

test('all existing patient navigation destinations and twenty dental services remain available', () => {
  for (const tab of ["name: 'Home'", "name: 'Services'", "name: 'Appointment'", "name: 'Gallery'", "name: 'Contact'"]) assert.ok(ui.includes(tab));
  const services = read('shared/dentalServices.ts');
  assert.equal((services.match(/\{ id: '/g) || []).length, 20);
});

test('Inter v20 is locally bundled with exact upstream SHA-256 provenance', () => {
  const files = ['Inter-Regular.ttf','Inter-Medium.ttf','Inter-SemiBold.ttf','Inter-Bold.ttf','Inter-ExtraBold.ttf'];
  const hashes = {
    'Inter-Regular.ttf': 'A414B48AA577EF2C62EBB135341DDEEF33EE26A4F5DC9F787F93C1AAB08EBB50',
    'Inter-Medium.ttf': 'F1738576525E86DB1D5CF63A6C1B56E0A7E2A2898B499AC93DB95F2E7A9F9CD5',
    'Inter-SemiBold.ttf': 'F30E9D2574C3BEC5144347FF965F9841C8F06857F0B7383000F8C9489A161841',
    'Inter-Bold.ttf': 'FBE825CBFC749317F57A1433D3905AA9D3F388732FD29B8E8A36F34845E3BC3E',
    'Inter-ExtraBold.ttf': '1B9FAB96FFC7BCA31A9D4CD4D660CCE80B94695908EC7613AFDECE2B8CF803C2',
  };
  const actual = fs.readdirSync(path.join(root, 'assets/fonts')).filter(name => /\.(ttf|otf|woff2?)$/i.test(name)).sort();
  assert.deepEqual(actual, [...files].sort(), 'Only documented Inter font files may remain');
  for (const file of files) {
    const bytes = fs.readFileSync(path.join(root, 'assets/fonts', file));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(), hashes[file], 'Inter provenance mismatch: ' + file);
    assert.ok(app.includes(file), 'App must load ' + file);
  }
  assert.match(app, /useFonts\(/);
  assert.match(ui, /InterRegular/);
  assert.doesNotMatch(ui, /PlusJakartaSans|PlayfairDisplay/);
  assert.doesNotMatch(ui, /fonts\.googleapis\.com|fonts\.gstatic\.com|useFontsFromUrl/);
  assert.match(fontDocs, /Google Fonts.*v20/);
  assert.match(fontDocs, /SIL Open Font License 1\.1/);
  assert.match(read('licenses/Inter-OFL.txt'), /SIL OPEN FONT LICENSE/);
  const metadata = JSON.parse(read('licenses/Inter-Google-Fonts-metadata-v20.json'));
  assert.equal(metadata.family, 'Inter');
  assert.equal(metadata.version, 'v20');
});

test('patient UI source contains no known mojibake sequences or self-diagnosis feature', () => {
  assert.doesNotMatch(ui, /[\uFFFD\u0393\u251C\u252C\u00E2\u00F0\u00EF\u00C2\u00C3]|â|ï¿|ðŸ/);
  assert.doesNotMatch(read('shared/dentalServices.ts'), /[\uFFFD\u0393\u251C\u252C\u00E2\u00F0\u00EF\u00C2\u00C3]|â|ï¿|ðŸ/);
  assert.doesNotMatch(ui, /self-diagnosis|AI diagnosis|diagnose yourself/i);
});

test('Patient package identity and staging-only APK workflow are preserved', () => {
  const config = JSON.parse(read('app.json'));
  assert.equal(config.expo.android.package, 'com.drpranali.dental');
  assert.match(api, /process\.env\.EXPO_PUBLIC_DENTAL_API_URL/);
  assert.match(api, /https:\/\/oralyn-multitenant-staging\.onrender\.com/);
  assert.match(workflow, /https:\/\/oralyn-multitenant-staging\.onrender\.com/);
  assert.doesNotMatch(workflow, /patient-latest GitHub Release|gh release create|gh release upload/);
});

test('desktop Patient portal uses spacious navigation, responsive content and service search', () => {
  assert.match(ui, /desktopSidebar/);
  assert.match(ui, /desktopTopbar/);
  assert.match(ui, /desktopPageContent/);
  assert.match(ui, /Search dental services/);
  assert.match(ui, /useWindowDimensions/);
  assert.match(ui, /setGlobalSearch\(value\)/);
  assert.match(ui, /desktopServicesGrid/);
  assert.doesNotMatch(ui, /AI diagnosis|self-diagnosis|diagnose yourself/i);
});

test('Inter font loading has an explicit system-font fallback and continues rendering', () => {
  assert.match(app, /fontError/);
  assert.match(app, /FontReadyContext\.Provider value=\{fontsLoaded && !fontError\}/);
  assert.match(app, /using system fallback/);
  assert.match(ui, /export const FontReadyContext/);
  assert.match(ui, /fontReady \?/);
  assert.match(ui, /fontFamily: FONT_BY_WEIGHT/);
});




test('font bootstrap provides a local system fallback and readable startup copy', () => {
  assert.match(app, /useFonts/);
  assert.match(app, /fontsLoaded \|\| fontError/);
  assert.match(app, /using system fallback/);
  assert.doesNotMatch(app, /\uFFFD|Ã|â|ðŸ/);
});


test('all Patient UI icons exist in the bundled Feather glyph map', () => {
  const glyphs = require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Feather.json');
  const names = [...ui.matchAll(/<Icon[^>]*name=['"]([^'"]+)/g)].map(match => match[1]);
  for (const name of new Set(names)) assert.ok(name in glyphs, 'Unknown Feather icon: ' + name);
});

test('desktop patient care portal provides honest empty states for records and invoices', () => {
  assert.match(ui, /function MyCareScreen/);
  assert.match(ui, /Treatment journey/);
  assert.match(ui, /Clinical records/);
  assert.match(ui, /Invoices/);
  assert.match(ui, /No records shared yet/);
  assert.match(ui, /No invoices shared yet/);
  assert.match(ui, /My Care/);
  assert.doesNotMatch(ui, /AI diagnosis|self-diagnosis|diagnose yourself/i);
});

test('Patient portal restores persisted Supabase sessions and tracks sign-in state changes', () => {
  assert.match(ui, /supabase\.auth\.getSession\(\)/);
  assert.match(ui, /supabase\.auth\.onAuthStateChange/);
  assert.match(ui, /subscription\?\.unsubscribe/);
  assert.match(read('src/auth/googleAuth.js'), /persistSession:\s*true/);
});

test('Patient iconography imports only the licensed Feather icon font', () => {
  assert.match(ui, /import Feather from '@expo\/vector-icons\/Feather'/);
  assert.match(read('node_modules/@expo/vector-icons/package.json'), /"version":\s*"15\.1\.1"/);
  assert.match(read('node_modules/@expo/vector-icons/package.json'), /"license":\s*"MIT"/);
});
test('Patient root imports SafeAreaView before rendering the welcome and portal screens', () => {
  assert.match(ui, /import \{ SafeAreaView \} from 'react-native-safe-area-context'/);
  assert.match(app, /<SafeAreaProvider>/);
});

test('web Google sign-in uses the existing Supabase provider while native keeps Google ID-token sign-in', () => {
  const auth = read('src/auth/googleAuth.js');
  assert.match(auth, /Platform\.OS === 'web'/);
  assert.match(auth, /supabase\.auth\.signInWithOAuth/);
  assert.match(auth, /provider: 'google'/);
  assert.match(auth, /GoogleSignin\.signIn\(\)/);
  assert.match(auth, /GOOGLE_WEB_CLIENT_ID = '56124766906-7qlnhr7b3l1iri981i6p984n12nma9ji\.apps\.googleusercontent\.com'/);
  assert.match(auth, /SUPABASE_URL = 'https:\/\/jzxbeldubkhwnznrathu\.supabase\.co'/);
  assert.match(ui, /exchangeCodeForSession\(code\)/);
});

test('appointment time slots are limited to the two clinic windows', () => {
  assert.ok(ui.includes("const CLINIC_HOURS_LABEL = '10:00 AM – 2:00 PM and 5:00 PM – 9:00 PM';"));
  assert.match(ui, /CLINIC_TIME_SLOTS = \[/);
  assert.match(ui, /'1:30 PM'/);
  assert.match(ui, /'5:00 PM'/);
  assert.match(ui, /'8:30 PM'/);
  assert.match(ui, /CLINIC_TIME_SLOTS\.includes\(time\)/);
  assert.match(ui, /Please choose one of the available clinic time slots/);
  assert.match(ui, /Please choose a future appointment time/);
  assert.doesNotMatch(ui, /Monday.*10:00 AM.*9:00 PM/);
  assert.doesNotMatch(ui, /setShowTime\(true\)|mode="time"/);
});


test('Patient Android smoke test launches the exact package and captures My Care empty states', () => {
  assert.match(workflow, /monkey -p com\.drpranali\.dental 1/);
  assert.doesNotMatch(workflow, /monkey -p com\.drprani\.dental/);
  assert.match(workflow, /patient-my-care\.png/);
  assert.match(workflow, /No records shared yet/);
  assert.match(workflow, /No invoices shared yet/);
});

test('Patient desktop screenshot capture uses the installed Chromium path and verifies the local server', () => {
  assert.match(workflow, /CHROME_BIN: \$\{\{ steps\.setup_chrome\.outputs\.chrome-path \}\}/);
  assert.match(workflow, /server_ready=0/);
  assert.match(workflow, /Patient web export did not start its local preview server/);
  assert.match(workflow, /PATIENT_WEB_BASE_URL=http:\/\/127\.0\.0\.1:19006/);
});

test('Patient Android emulator smoke test supports hardware or software acceleration and retains failure diagnostics', () => {
  assert.match(workflow, /runs-on: ubuntu-24\.04/);
  assert.match(workflow, /sudo chmod 666 \/dev\/kvm/);
  assert.match(workflow, /ACCEL_ARGS=\(\)/);
  assert.match(workflow, /software acceleration/);
  assert.match(workflow, /-accel off/);
  assert.match(workflow, /devices -l/);
  assert.match(workflow, /Android emulator did not connect to ADB/);
  assert.match(workflow, /timeout-minutes: 30/);
});
test('Patient My Care navigation exposes an Android-accessible button label', () => {
  assert.match(ui, /accessibilityRole="button" accessibilityLabel="My care and shared records"/);
  assert.match(workflow, /label == 'My care and shared records'\.casefold\(\)/);
});

test('Patient Android smoke setup installs the emulator before checking its binary', () => {
  const install = workflow.indexOf('--install "emulator"');
  const verify = workflow.indexOf('if [ ! -x "$SDK_ROOT/emulator/emulator" ]');
  assert.ok(install >= 0 && verify > install, 'emulator must be installed before its executable is required');
  assert.match(workflow, /Android SDK sdkmanager is unavailable/);
  assert.match(workflow, /Android emulator binary was not installed/);
});

test('built Patient APK is checked for the exact licensed local font files', () => {
  assert.match(workflow, /verify-patient-apk-fonts\.py/);
  assert.match(read('scripts/verify-patient-apk-fonts.py'), /Inter Regular\/Medium\/SemiBold\/Bold\/ExtraBold/);
  assert.match(read('scripts/verify-patient-apk-fonts.py'), /Feather\.ttf/);
});


test('Patient record APIs use the Supabase bearer token and only patient data routes', () => {
  for (const fn of ['getPatientProfile', 'linkPatientRecord', 'getPatientAppointments', 'getPatientChart']) {
    assert.match(api, new RegExp('export async function ' + fn));
  }
  assert.match(api, /Authorization: 'Bearer ' \+ accessToken/);
  for (const route of ['/patient/profile', '/patient/link', '/patient/appointments', '/patient/chart']) {
    assert.ok(api.includes(route), 'Missing authenticated patient route ' + route);
  }
  assert.doesNotMatch(api, /\/patient\/(chat|triage|treatment-explanation|aftercare)/);
});

test('My Care links a one-time clinic invite and renders only clinic-shared appointment and chart data', () => {
  assert.match(ui, /Link your clinic record/);
  assert.match(ui, /one-time invite code/);
  assert.match(ui, /linkPatientRecord/);
  assert.match(ui, /getPatientProfile/);
  assert.match(ui, /getPatientAppointments/);
  assert.match(ui, /getPatientChart/);
  assert.match(ui, /appointments\.map/);
  assert.match(ui, /chart\.map/);
  assert.match(ui, /item\.treatment_type/);
  assert.match(ui, /entry\.tooth_fdi/);
  assert.match(ui, /patientDataErrorMessage/);
  assert.match(ui, /Try again/);
});

test('Patient My Care exposes loading, unlinked, empty and error states without fabricating records', () => {
  assert.match(ui, /Loading your clinic record/);
  assert.match(ui, /No visit history yet/);
  assert.match(ui, /No records shared yet/);
  assert.match(ui, /Clinic records temporarily unavailable/);
  assert.match(ui, /Patient record services are not enabled on this staging API yet/);
  assert.doesNotMatch(ui, /sample patient|fake appointment|demo invoice/i);
});

test('Patient billing, treatment-plan and private-document gaps remain explicit and honest', () => {
  assert.match(ui, /Invoices/);
  assert.match(ui, /Invoice and receipt services are not connected to this staging build/);
  assert.match(ui, /No balances or payment amounts are estimated/);
  assert.match(ui, /Secure documents are not connected yet/);
  assert.doesNotMatch(ui, /₹\s?\d|\$\s?\d|invoiceTotal\s*=/);
});
