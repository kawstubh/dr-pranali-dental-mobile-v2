const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const app = fs.readFileSync(path.join(__dirname, '..', 'App.js'), 'utf8');
const workflow = fs.readFileSync(path.join(__dirname, '..', '..', '.github', 'workflows', 'doctor-apk.yml'), 'utf8');

test('Doctor app provides safe-area context before any SafeAreaView can render', () => {
  assert.match(app, /import\s*\{\s*SafeAreaProvider,\s*SafeAreaView\s*\}\s*from\s*'react-native-safe-area-context'/);
  assert.match(app, /<SafeAreaProvider>\s*<DoctorAppErrorBoundary>\s*<AppContent\s*\/>\s*<\/DoctorAppErrorBoundary>\s*<\/SafeAreaProvider>/);
});

test('Doctor app has a visible recovery screen for unexpected render exceptions', () => {
  assert.match(app, /class DoctorAppErrorBoundary extends React\.Component/);
  assert.match(app, /We could not open this workspace/);
  assert.match(app, /Unhandled render error/);
});

test('dashboard keeps zero-data workspaces usable and does not assume list payloads are arrays', () => {
  assert.match(app, /normalizeApiList\(appointmentsResult\.value/);
  assert.match(app, /normalizeApiList\(patientsResult\.value/);
  assert.match(app, /No appointments yet/);
  assert.match(app, /No patients yet/);
  assert.match(app, /No active clinic workspace/);
});

test('desktop Doctor workspace has persistent navigation and global patient search', () => {
  assert.match(app, /desktopSidebar/);
  assert.match(app, /Search patients by name or phone/);
  assert.match(app, /mobileNav/);
  assert.match(app, /useWindowDimensions/);
});

test('Doctor UI source contains no mojibake or control-character icons', () => {
  assert.doesNotMatch(app, /\uFFFD|ÃƒÂ°Ã…Â¸|ÃƒÂ¢Ã¢â€šÂ¬|Ãƒâ€šÃ‚Â·/);
  assert.doesNotMatch(app, /\u0007/);
});



test('login and logout requests have bounded timeouts', () => {
  const auth = fs.readFileSync(path.join(__dirname, 'auth', 'passwordAuth.js'), 'utf8');
  assert.match(auth, /fetchWithTimeout/);
  assert.match(auth, /REQUEST_TIMEOUT/);
  assert.match(auth, /5000\)\.catch/);
});

test('workspace refresh failures remain visible while cached navigation is retained', () => {
  assert.match(app, /Workspace access could not be refreshed/);
  assert.match(app, /workspaceError=\{workspaceError\}/);
  assert.match(app, /Cached clinic data remains available/);
});

test('desktop Doctor appointments include a seven-day calendar alongside the appointment queue', () => {
  assert.match(app, /Appointment calendar/);
  assert.match(app, /calendarDays\.map/);
  assert.match(app, /appointmentsForDay/);
  assert.match(app, /No visits/);
});
test('Doctor desktop and mobile navigation use Feather iconography and clinic brand palette', () => {
  assert.match(app, /import Feather from '@expo\/vector-icons\/Feather'/);
  assert.match(app, /name=\{\['home','calendar','users','activity'\]\[index\]\}/);
  assert.match(app, /navy:'#0C3B82', blue:'#0A84E8', teal:'#00C6C8', bg:'#F4FBFF'/);
  assert.match(app, /formatAppointmentDate/);
  assert.doesNotMatch(app, /<Text style=\{styles\.desktopSearchGlyph\}>Search<\/Text>/);
});
test('empty chart state is explicitly unrecorded and never carries another patient chart', () => {
  assert.match(app, /const \[states, setStates\] = useState\(\{\}\)/);
  assert.match(app, /const currentState = states\[selected\] \|\| 'unrecorded'/);
  assert.match(app, /setStates\(normalizeDentalChart\(entries\)\)/);
  assert.match(app, /No dental chart findings are recorded yet/);
  assert.match(app, /Chart could not be loaded/);
  assert.doesNotMatch(app, /46:'attention'|21:'treated'|36:'treated'/);
});
test('Android smoke test launches the exact Doctor package and captures previous runtime errors', () => {
  assert.match(workflow, /export ANDROID_AVD_HOME="\$HOME\/\.android\/avd"/);
  assert.match(workflow, /monkey -p com\.drpranali\.dental\.doctor 1/);
  assert.doesNotMatch(workflow, /monkey -p com\.drprani\.dental\.doctor/);
  assert.match(workflow, /doctor-previous-runtime-errors\.txt/);
});

test('Android emulator smoke test checks KVM permissions and retains failure diagnostics', () => {
  assert.match(workflow, /sudo chmod 666 \/dev\/kvm/);
  assert.match(workflow, /Android emulator requires \/dev\/kvm/);
  assert.match(workflow, /devices -l/);
  assert.match(workflow, /Android emulator did not connect to ADB/);
});