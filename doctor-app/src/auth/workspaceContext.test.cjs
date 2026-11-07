const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeWorkspaces,
  selectDefaultWorkspace,
  persistWorkspaceSession,
  switchAndPersistWorkspaceSession,
} = require('./workspaceContext.js');

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
