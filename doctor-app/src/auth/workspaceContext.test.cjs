const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeWorkspaces,
  canManageWorkspace,
  selectDefaultWorkspace,
  persistWorkspaceSession,
  switchAndPersistWorkspaceSession,
  createSessionWriteCoordinator,
} = require('./workspaceContext.js');


test('workspace management follows the active membership role and requires an organisation', () => {
  const ownerWorkspace = { organisation_id: 'org-a', role: 'owner' };
  const adminWorkspace = { organisation_id: 'org-a', role: 'admin' };
  const doctorWorkspace = { organisation_id: 'org-a', role: 'doctor' };
  const dentistWorkspace = { organisation_id: 'org-a', role: 'dentist' };

  assert.equal(canManageWorkspace({ role: 'owner' }, ownerWorkspace, true), true);
  assert.equal(canManageWorkspace({ role: 'admin' }, adminWorkspace, true), true);
  // The active membership returned by the API wins over a stale cached user role.
  assert.equal(canManageWorkspace({ role: 'doctor' }, adminWorkspace, true), true);
  assert.equal(canManageWorkspace({ role: 'admin' }, doctorWorkspace, true), false);
  assert.equal(canManageWorkspace({ role: 'admin' }, dentistWorkspace, true), false);
  // A cached admin membership cannot expose controls during an offline startup.
  assert.equal(canManageWorkspace({ role: 'admin' }, adminWorkspace, false), false);
  assert.equal(canManageWorkspace({ role: 'owner' }, ownerWorkspace), false);
  assert.equal(canManageWorkspace({ role: 'owner' }, { organisation_id: 'org-a' }), false);
  assert.equal(canManageWorkspace({ role: 'owner' }, { organisation_id: '' , role: 'owner' }), false);
  assert.equal(canManageWorkspace({ role: 'admin' }, { organisation_id: '   ', role: 'admin' }), false);
  assert.equal(canManageWorkspace({ role: 'admin' }, null), false);
});

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    async getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    async setItem(key, value) {
      values.set(key, value);
    },
    async multiSet(entries) {
      entries.forEach(([key, value]) => values.set(key, value));
    },
    async multiRemove(keys) {
      keys.forEach((key) => values.delete(key));
    },
    values,
  };
}

test('normalizes and de-duplicates authorised workspaces', () => {
  const result = normalizeWorkspaces([
    {
      id: 'clinic-a',
      clinic_id: 'clinic-a',
      organisation_id: 'org-a',
      name: 'Main Clinic',
      organisation_name: 'Clinic Group',
      role: 'owner',
    },
    {
      id: 'clinic-a',
      clinic_id: 'clinic-a',
      name: 'Duplicate',
      organisation_name: 'Clinic Group',
      role: 'owner',
    },
    { id: '', name: 'Invalid' },
  ]);

  assert.deepEqual(result, [
    {
      id: 'clinic-a',
      clinic_id: 'clinic-a',
      organisation_id: 'org-a',
      name: 'Main Clinic',
      organisation_name: 'Clinic Group',
      organisation_type: '',
      clinic_type: '',
      role: 'owner',
    },
  ]);
});

test('selects the legacy workspace when it is still authorised', () => {
  const workspaces = normalizeWorkspaces([
    { id: 'branch-b', name: 'Branch B' },
    { id: 'clinic-a', name: 'Main Clinic' },
  ]);

  assert.equal(selectDefaultWorkspace(workspaces, 'clinic-a').id, 'clinic-a');
  assert.equal(selectDefaultWorkspace(workspaces, 'missing').id, 'branch-b');
  assert.equal(selectDefaultWorkspace([], 'clinic-a'), null);
});

test('persists the replacement token and active user with workspace list', async () => {
  const storage = createStorage();
  const result = await persistWorkspaceSession(storage, {
    access_token: 'new-token',
    user: { id: 'doctor-1', clinic_id: 'clinic-b', role: 'dentist' },
    workspaces: [{ id: 'clinic-b', organisation_id: 'org-b', name: 'Branch B', role: 'dentist' }],
  });

  assert.equal(await storage.getItem('doctor_session'), 'new-token');
  assert.deepEqual(JSON.parse(await storage.getItem('doctor_user')), {
    id: 'doctor-1',
    clinic_id: 'clinic-b',
    role: 'dentist',
    workspaces: [
      {
        id: 'clinic-b',
        clinic_id: 'clinic-b',
        organisation_id: 'org-b',
        name: 'Branch B',
        organisation_name: '',
        organisation_type: '',
        clinic_type: '',
        role: 'dentist',
      },
    ],
  });
  assert.equal(result.access_token, 'new-token');
});

test('failed workspace switch leaves the stored session unchanged', async () => {
  const storage = createStorage({
    doctor_session: 'existing-token',
    doctor_user: JSON.stringify({ id: 'doctor-1', clinic_id: 'clinic-a' }),
  });
  const beforeToken = await storage.getItem('doctor_session');
  const beforeUser = await storage.getItem('doctor_user');

  await assert.rejects(
    switchAndPersistWorkspaceSession(
      storage,
      beforeToken,
      'clinic-b',
      async () => {
        throw new Error('Workspace switch denied');
      }
    ),
    /Workspace switch denied/
  );

  assert.equal(await storage.getItem('doctor_session'), beforeToken);
  assert.equal(await storage.getItem('doctor_user'), beforeUser);
});


test('stale workspace refresh cannot overwrite a newer workspace session', async () => {
  let storedSession = null;
  const coordinator = createSessionWriteCoordinator(
    async (session) => { storedSession = session; return session; },
    async () => { storedSession = null; }
  );

  const refreshGeneration = coordinator.captureRead();
  const switchGeneration = coordinator.beginMutation();

  assert.equal(
    await coordinator.writeIfCurrent(refreshGeneration, { access_token: 'old-token' }),
    null
  );
  const switched = await coordinator.writeIfCurrent(
    switchGeneration,
    { access_token: 'new-token', user: { clinic_id: 'clinic-b' } }
  );

  assert.equal(switched.access_token, 'new-token');
  assert.equal(storedSession.access_token, 'new-token');
});

test('workspace refresh does not start while a session mutation is pending', () => {
  const coordinator = createSessionWriteCoordinator(async (session) => session, async () => {});
  const generation = coordinator.beginMutation();

  assert.equal(coordinator.captureRead(), null);

  coordinator.finishMutation(generation);
  assert.equal(coordinator.captureRead(), generation);
});

test('serialized session writes leave the newest workspace session in storage', async () => {
  let storedSession = null;
  let releaseOldWrite;
  let markOldWriteStarted;
  const oldWriteStarted = new Promise((resolve) => { markOldWriteStarted = resolve; });
  const coordinator = createSessionWriteCoordinator(
    async (session) => {
      if (session.access_token === 'old-refresh-token') {
        markOldWriteStarted();
        await new Promise((resolve) => { releaseOldWrite = resolve; });
      }
      storedSession = session;
      return session;
    },
    async () => { storedSession = null; }
  );

  const refreshGeneration = coordinator.captureRead();
  const oldWrite = coordinator.writeIfCurrent(refreshGeneration, {
    access_token: 'old-refresh-token',
  });
  await oldWriteStarted;

  const switchGeneration = coordinator.beginMutation();
  const newWrite = coordinator.writeIfCurrent(switchGeneration, {
    access_token: 'new-workspace-token',
  });
  releaseOldWrite();

  await Promise.all([oldWrite, newWrite]);
  assert.equal(storedSession.access_token, 'new-workspace-token');
});

test('a delayed logout cannot clear a newer sign-in', async () => {
  let storedSession = { access_token: 'old-token' };
  const coordinator = createSessionWriteCoordinator(
    async (session) => { storedSession = session; return session; },
    async () => { storedSession = null; }
  );

  const logoutGeneration = coordinator.beginMutation();
  const loginGeneration = coordinator.beginMutation();

  assert.equal(await coordinator.clearIfCurrent(logoutGeneration), false);
  await coordinator.writeIfCurrent(loginGeneration, { access_token: 'new-token' });
  assert.equal(storedSession.access_token, 'new-token');
});
