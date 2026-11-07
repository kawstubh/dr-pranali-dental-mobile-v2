const SESSION_KEY = 'doctor_session';
const USER_KEY = 'doctor_user';

function normalizeWorkspaces(workspaces) {
  if (!Array.isArray(workspaces)) return [];
  const seen = new Set();
  const normalized = [];

  for (const workspace of workspaces) {
    if (!workspace || typeof workspace !== 'object') continue;
    const id = String(workspace.id || workspace.clinic_id || '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    normalized.push({
      id,
      clinic_id: String(workspace.clinic_id || id),
      name: String(workspace.name || workspace.workspace_name || id),
      organisation_name: String(workspace.organisation_name || ''),
      organisation_type: String(workspace.organisation_type || ''),
      clinic_type: String(workspace.clinic_type || ''),
      role: String(workspace.role || 'doctor'),
    });
  }
  return normalized;
}

function selectDefaultWorkspace(workspaces, defaultClinicId) {
  const normalized = normalizeWorkspaces(workspaces);
  if (!normalized.length) return null;
  const match = normalized.find(
    (workspace) =>
      workspace.id === String(defaultClinicId || '') ||
      workspace.clinic_id === String(defaultClinicId || '')
  );
  return match || normalized[0];
}

async function persistWorkspaceSession(storage, session) {
  if (!session?.access_token || !session?.user) {
    throw new Error('The clinic API returned an incomplete workspace session.');
  }
  const workspaces = normalizeWorkspaces(session.workspaces);
  const user = { ...session.user, workspaces };
  await storage.setItem(SESSION_KEY, session.access_token);
  await storage.setItem(USER_KEY, JSON.stringify(user));
  return {
    ...session,
    user,
    workspaces,
  };
}

async function switchAndPersistWorkspaceSession(
  storage,
  token,
  clinicId,
  switcher
) {
  if (!token) throw new Error('Sign in again before switching workspaces.');
  if (typeof switcher !== 'function') {
    throw new Error('Workspace switching is unavailable.');
  }
  const session = await switcher(token, clinicId);
  return persistWorkspaceSession(storage, session);
}

module.exports = {
  normalizeWorkspaces,
  selectDefaultWorkspace,
  persistWorkspaceSession,
  switchAndPersistWorkspaceSession,
};
