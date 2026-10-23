import { downloadInterfaceArchive } from './interfaceArchive.js';

const BACKUP_FORMAT = 'marsad-alfursan-data-backup';
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const SENSITIVE_KEY = /password|passcode|secret|api.?key|access.?token|token/i;

const dateStamp = () => new Date().toISOString().slice(0, 10);

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
};

const sanitizeBackupState = (source) => {
  const walk = (value) => {
    if (Array.isArray(value)) return value.map(walk);
    if (!value || typeof value !== 'object') return value;
    return Object.entries(value).reduce((safe, [key, item]) => {
      if (SENSITIVE_KEY.test(key)) return safe;
      safe[key] = walk(item);
      return safe;
    }, {});
  };
  const safe = walk(source || {});
  safe.currentUser = null;
  return safe;
};

const restoreLocalCredentials = (restored, currentState) => {
  const credentials = new Map();
  (Array.isArray(currentState?.users) ? currentState.users : []).forEach((user) => {
    if (!user?.password) return;
    if (user.id) credentials.set(`id:${user.id}`, user.password);
    if (user.phone || user.username) credentials.set(`phone:${user.phone || user.username}`, user.password);
  });
  restored.users = (Array.isArray(restored.users) ? restored.users : []).map((user) => {
    const password = credentials.get(`id:${user.id}`) || credentials.get(`phone:${user.phone || user.username}`);
    return password ? { ...user, password } : user;
  });
  return restored;
};

const readBackupFile = async (file) => {
  if (!file) throw new Error('NO_FILE');
  if (file.size > MAX_FILE_SIZE) throw new Error('FILE_TOO_LARGE');

  let payload;
  try {
    payload = JSON.parse(await file.text());
  } catch {
    throw new Error('INVALID_JSON');
  }

  const state = payload?.format === BACKUP_FORMAT ? payload.state : payload;
  if (!state || typeof state !== 'object' || Array.isArray(state)) throw new Error('INVALID_BACKUP');
  if (!Array.isArray(state.users) || !Array.isArray(state.sites)) throw new Error('INVALID_BACKUP');
  return sanitizeBackupState(state);
};

document.querySelector('#footerBackupLink')?.addEventListener('click', (event) => {
  const archiveNav = document.querySelector('[data-view="archive"]');
  if (!archiveNav || archiveNav.hidden || archiveNav.disabled) return;
  event.preventDefault();
  archiveNav.click();
});

export function backupToolsMarkup(t) {
  return `<p class="backup-hint">${t('archive.backupHint')}</p><div class="backup-actions-inline"><button class="btn btn-secondary" id="downloadBackup" type="button">${t('archive.create')}</button><label class="btn btn-outline backup-file-label" for="restoreBackupFile">${t('archive.chooseBackup')}<input id="restoreBackupFile" type="file" accept="application/json,.json"></label><button class="btn btn-outline" id="restoreBackup" type="button">${t('archive.restore')}</button><button class="btn btn-outline" id="downloadInterfaceArchive" type="button">${t('archive.interfaceExport')}</button></div><small class="backup-file-status" id="backupFileStatus" aria-live="polite"></small>`;
}

export function bindBackupTools({ state, t, saveState, showToast, renderArchive }) {
  const downloadButton = document.querySelector('#downloadBackup');
  const interfaceArchiveButton = document.querySelector('#downloadInterfaceArchive');
  const restoreButton = document.querySelector('#restoreBackup');
  const restoreInput = document.querySelector('#restoreBackupFile');
  const fileStatus = document.querySelector('#backupFileStatus');

  const setStatus = (message, isError = false) => {
    if (!fileStatus) return;
    fileStatus.textContent = message;
    fileStatus.classList.toggle('error', isError);
  };

  const setBusy = (busy) => {
    [downloadButton, interfaceArchiveButton, restoreButton].forEach((button) => {
      if (button) button.disabled = busy;
    });
  };

  interfaceArchiveButton?.addEventListener('click', () => downloadInterfaceArchive({ t, setStatus, setBusy }));

  downloadButton?.addEventListener('click', () => {
    try {
      const payload = {
        format: BACKUP_FORMAT,
        version: 5,
        appVersion: state.version || '4.6.0',
        capabilities: ['x10-integrity', 'x10-safety-snapshot', 'x10-conflict-protection', 'x20-readiness', 'x20-checkpoints', 'x20-fingerprint', 'x30-control-score', 'x30-priority-decisions', 'x30-audit-trail', 'x30-versioned-decisions', 'session-lock', 'current-location'],
        exportedAt: new Date().toISOString(),
        security: { sensitiveFieldsExcluded: true, credentialsPreservedLocally: true },
        state: sanitizeBackupState(state),
      };
      downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }), `marsad-alfursan-data-${dateStamp()}.json`);
      setStatus(t('archive.backupReady'));
      showToast(t('archive.backupReady'));
    } catch {
      setStatus(t('messages.error'), true);
      showToast(t('messages.error'));
    }
  });

  restoreInput?.addEventListener('change', () => {
    const file = restoreInput.files?.[0];
    setStatus(file ? `${file.name} · ${t('archive.restoreReady')}` : '');
  });

  restoreButton?.addEventListener('click', async () => {
    restoreButton.disabled = true;
    setStatus(t('common.loading'));
    try {
      const restored = await readBackupFile(restoreInput?.files?.[0]);
      if (!window.confirm(t('archive.restoreConfirm'))) {
        setStatus(t('archive.restoreCancelled'));
        return;
      }

      const currentUser = state.currentUser;
      restoreLocalCredentials(restored, state);
      Object.keys(state).forEach(key => delete state[key]);
      Object.assign(state, restored, { currentUser });
      await saveState();
      setStatus(t('archive.restoreSuccess'));
      showToast(t('archive.restoreSuccess'));
      if (restoreInput) restoreInput.value = '';
      renderArchive();
    } catch (error) {
      const messages = {
        NO_FILE: t('archive.restoreChoose'),
        FILE_TOO_LARGE: t('archive.restoreTooLarge'),
        INVALID_JSON: t('archive.restoreInvalid'),
        INVALID_BACKUP: t('archive.restoreInvalid'),
      };
      setStatus(messages[error.message] || t('messages.error'), true);
    } finally {
      restoreButton.disabled = false;
    }
  });
}
