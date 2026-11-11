const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

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

test('local licensed fonts are bundled and no remote font stylesheet is requested', () => {
  for (const file of ['assets/fonts/PlusJakartaSans-Variable.ttf', 'assets/fonts/PlayfairDisplay-Variable.ttf', 'assets/fonts/OFL-Plus-Jakarta-Sans.txt', 'assets/fonts/OFL-Playfair-Display.txt']) {
    assert.ok(fs.existsSync(path.join(root, file)), 'Missing ' + file);
    assert.ok(fs.statSync(path.join(root, file)).size > 1000, 'Unexpectedly small ' + file);
  }
  assert.match(fontDocs, /SIL Open Font License 1\.1/);
  assert.match(app, /PlusJakartaSans-Variable\.ttf/);
  assert.match(app, /PlayfairDisplay-Variable\.ttf/);
  assert.doesNotMatch(ui, /fonts\.googleapis\.com|useFontsFromUrl/);
});

test('patient UI source contains no known mojibake sequences or self-diagnosis feature', () => {
  assert.doesNotMatch(ui, /[\uFFFD]|â|ï¿|ðŸ/);
  assert.doesNotMatch(read('shared/dentalServices.ts'), /[\uFFFD]|â|ï¿|ðŸ/);
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

test('font assets and fallback remain local and traceable', () => {
  assert.match(fontDocs, /Google Fonts snapshot/);
  assert.match(fontDocs, /SIL Open Font License 1\.1/);
  assert.match(fontDocs, /Roboto on Android/);
  assert.match(app, /fontError/);
  assert.match(app, /using system fallback/);
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