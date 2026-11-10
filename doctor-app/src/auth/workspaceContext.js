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
      organisation_id: String(workspace.organisation_id || ''),
      name: String(workspace.name || workspace.workspace_name || id),
      organisation_name: String(workspace.organisation_name || ''),
      organisation_type: String(workspace.organisation_type || ''),
      clinic_type: String(workspace.clinic_type || ''),
      role: String(workspace.role || 'doctor'),
    });
  }
  return normalized;
}

function canManageWorkspace(_user, activeWorkspace, membershipFresh = false) {
  // Cached memberships are useful for navigation while offline, but must never
  // expose organisation administration controls until the API has refreshed
  // the active workspace membership for this session.
  if (membershipFresh !== true) return false;
  const organisationId = String(activeWorkspace?.organisation_id || '').trim();
  // The active workspace membership is authoritative; the cached user role can
  // be stale after an administrator is demoted or membership permissions change.
  const workspaceRole = String(activeWorkspace?.role || '').trim();
  return Boolean(organisationId) && ['owner', 'admin'].includes(workspaceRole);
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
  const entries = [
    [SESSION_KEY, session.access_token],
    [USER_KEY, JSON.stringify(user)],
  ];
  if (typeof storage.multiSet === 'function') {
    await storage.multiSet(entries);
  } else {
    await storage.setItem(SESSION_KEY, session.access_token);
    await storage.setItem(USER_KEY, JSON.stringify(user));
  }
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
  canManageWorkspace,
  selectDefaultWorkspace,
  persistWorkspaceSession,
  switchAndPersistWorkspaceSession,
};


function createSessionWriteCoordinator(writeSession, clearSession) {
  if (typeof writeSession !== 'function' || typeof clearSession !== 'function') {
    throw new TypeError('Session write and clear handlers are required.');
  }

  let generation = 0;
  let mutationPending = false;
  let queue = Promise.resolve();

  function enqueue(operation) {
    const result = queue.then(operation, operation);
    queue = result.catch(() => {});
    return result;
  }

  return {
    beginMutation() {
      generation += 1;
      mutationPending = true;
      return generation;
    },

    captureRead() {
      return mutationPending ? null : generation;
    },

    finishMutation(expectedGeneration) {
      if (expectedGeneration === generation) mutationPending = false;
    },

    writeIfCurrent(expectedGeneration, session) {
      return enqueue(async () => {
        if (expectedGeneration === null || expectedGeneration !== generation) {
          return null;
        }
        const result = await writeSession(session);
        if (expectedGeneration !== generation) {
          // A newer mutation may have failed before it queued its own storage
          // write. Remove this now-stale session before the next queued write
          // runs, rather than leaving old credentials persisted.
          await clearSession();
          return null;
        }
        mutationPending = false;
        return result;
      });
    },

    clearIfCurrent(expectedGeneration) {
      return enqueue(async () => {
        if (expectedGeneration !== generation) return false;
        await clearSession();
        if (expectedGeneration === generation) mutationPending = false;
        return true;
      });
    },
  };
}

module.exports.createSessionWriteCoordinator = createSessionWriteCoordinator;
