let runtime = { t: key => key, getState: () => null, getVersion: () => '' };
let saveState = null;
let online = navigator.onLine !== false;
let lastSaveAt = null;
let lastSaveOk = true;
let saveEvents = 0;
let saveFailures = 0;
let saveConflicts = 0;
let inspection = { checkedAt: null, summary: null };
let repairInProgress = false;

const list = value => Array.isArray(value) ? value : [];
const tr = (key, values) => runtime.t?.(key, values) || key;
const nowText = () => new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
const text = value => String(value ?? '').trim();
const stamp = () => new Date().toISOString();
const hashText = value => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

const COLLECTIONS = ['users', 'sites', 'patrols', 'reports', 'requests', 'warnings', 'notifications', 'audit', 'opinions', 'projects', 'archives'];
const ID_COLLECTIONS = ['users', 'sites', 'patrols', 'reports', 'requests', 'warnings'];
const severityWeights = { normal: 1, important: 2, high: 4, critical: 8 };

function collectionIssues(items) {
  const seen = new Set();
  let duplicates = 0;
  list(items).forEach(item => {
    const id = text(item?.id);
    if (!id) return;
    if (seen.has(id)) duplicates += 1;
    seen.add(id);
  });
  return duplicates;
}

function fingerprint(state) {
  const parts = ID_COLLECTIONS.map(key => `${key}:${list(state?.[key]).map(item => text(item?.id)).sort().join(',')}`);
  return hashText(parts.join('|'));
}

function latestCheck(state) {
  return state?.x10Meta?.checkedAt || inspection.checkedAt;
}

export function inspectX10State(state = runtime.getState?.()) {
  const source = state || {};
  const missingCollections = COLLECTIONS.filter(key => !Array.isArray(source[key])).length;
  const users = list(source.users);
  const sites = list(source.sites);
  const reports = list(source.reports);
  const requests = list(source.requests);
  const patrols = list(source.patrols);
  const warnings = list(source.warnings);
  const malformedUsers = users.filter(user => !text(user?.id) || !text(user?.name) || !text(user?.role)).length;
  const malformedSites = sites.filter(site => !text(site?.id) || !text(site?.name)).length;
  const malformedReports = reports.filter(item => !text(item?.id) || !text(item?.title)).length;
  const malformedRequests = requests.filter(item => !text(item?.id) || (!text(item?.title) && !text(item?.type))).length;
  const malformedPatrols = patrols.filter(item => !text(item?.id) || !text(item?.site)).length;
  const duplicateIds = ID_COLLECTIONS.reduce((total, key) => total + collectionIssues(source[key]), 0);
  const pending = reports.filter(item => item?.status !== 'closed').length
    + requests.filter(item => item?.status === 'pending').length
    + warnings.filter(item => !item?.signedAt).length;
  const highRisk = reports.filter(item => ['high', 'critical'].includes(item?.severity)).length
    + warnings.filter(item => item?.severity === 'high' || item?.status === 'open').length;
  const weightedRisk = reports.reduce((sum, item) => sum + (severityWeights[item?.severity] || 0), 0)
    + warnings.reduce((sum, item) => sum + (severityWeights[item?.severity] || (item?.status === 'open' ? 2 : 0)), 0);
  const severity = missingCollections * 12
    + malformedUsers * 8
    + malformedSites * 8
    + malformedReports * 5
    + malformedRequests * 4
    + malformedPatrols * 5
    + duplicateIds * 10
    + Math.min(20, weightedRisk);
  const issues = missingCollections + malformedUsers + malformedSites + malformedReports + malformedRequests + malformedPatrols + duplicateIds;
  const readiness = Math.max(0, Math.min(100, 100 - severity));
  const checkedAt = latestCheck(source);
  const meta = source.x10Meta || {};
  return {
    users: users.length,
    sites: sites.length,
    patrols: patrols.length,
    reports: reports.length,
    pending,
    highRisk,
    issues,
    duplicateIds,
    missingCollections,
    readiness,
    audit: list(source.audit).length,
    lastAudit: list(source.audit)[0]?.time || tr('x10.noActivity'),
    checkedAt: checkedAt ? new Date(checkedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : tr('x10.notChecked'),
    online,
    saved: lastSaveOk,
    savedAt: lastSaveAt || tr('x10.notSavedYet'),
    saveEvents,
    saveFailures,
    saveConflicts,
    storageStatus: lastSaveOk === false ? tr('x10.storageAttention') : (lastSaveAt ? tr('x10.storageReady') : tr('x10.storagePending')),
    checks: list(meta.checkHistory).length,
    fingerprint: fingerprint(source),
    lastGood: meta.lastKnownGood?.checkedAt || null,
  };
}

function recordInspection(state, summary) {
  const checkedAt = stamp();
  inspection = { checkedAt, summary };
  if (!state) return;
  state.x10Meta = {
    ...(state.x10Meta || {}),
    checkedAt,
    readiness: summary.readiness,
    issues: summary.issues,
    version: runtime.getVersion?.() || '',
    fingerprint: summary.fingerprint,
    lastKnownGood: summary.issues === 0 ? { checkedAt, readiness: summary.readiness, fingerprint: summary.fingerprint } : state.x10Meta?.lastKnownGood,
    checkHistory: [{ checkedAt, readiness: summary.readiness, issues: summary.issues, fingerprint: summary.fingerprint }, ...list(state.x10Meta?.checkHistory)].slice(0, 5)
  };
}

function auditInspection(state, action) {
  if (!state) return;
  state.audit = Array.isArray(state.audit) ? state.audit : [];
  state.audit.unshift({ action, actor: state.currentUser?.name || tr('x10.system'), time: `${tr('common.today')} ${nowText()}` });
  state.audit = state.audit.slice(0, 100);
}

export function initX10Core(options = {}) {
  runtime = { ...runtime, ...options };
  saveState = options.saveState || null;
  const update = next => {
    online = next;
    document.querySelectorAll('[data-x10-online]').forEach(node => {
      node.textContent = tr(next ? 'x10.connected' : 'x10.disconnected');
      node.classList.toggle('is-warning', !next);
    });
  };
  window.addEventListener('online', () => update(true));
  window.addEventListener('offline', () => update(false));
  update(online);
}

export function x10RecordSaveSuccess() {
  saveEvents += 1;
  lastSaveAt = nowText();
  lastSaveOk = true;
  const state = runtime.getState?.();
  if (state) state.x10Meta = { ...(state.x10Meta || {}), lastSaveAt: stamp(), saveFailures, saveConflicts };
  document.querySelectorAll('[data-x10-save]').forEach(node => {
    node.textContent = tr('x10.savedAt', { time: lastSaveAt });
    node.classList.remove('is-warning');
  });
  document.querySelectorAll('[data-x10-conflict]').forEach(node => { node.textContent = ''; });
}

export function x10RecordSaveFailure(error) {
  saveEvents += 1;
  saveFailures += 1;
  lastSaveOk = false;
  const state = runtime.getState?.();
  if (state) state.x10Meta = { ...(state.x10Meta || {}), saveFailures, saveConflicts };
  document.querySelectorAll('[data-x10-save]').forEach(node => {
    node.textContent = tr('x10.saveFailed');
    node.classList.add('is-warning');
  });
}

export function x10RecordSaveConflict() {
  saveEvents += 1;
  saveConflicts += 1;
  lastSaveOk = false;
  document.querySelectorAll('[data-x10-save]').forEach(node => {
    node.textContent = tr('x10.saveConflict');
    node.classList.add('is-warning');
  });
  document.querySelectorAll('[data-x10-conflict]').forEach(node => {
    node.textContent = tr('x10.conflictCount', { count: saveConflicts });
  });
}

export function repairX10State(state = runtime.getState?.()) {
  if (!state || repairInProgress) return false;
  repairInProgress = true;
  let changed = false;
  try {
    COLLECTIONS.forEach(key => {
      if (!Array.isArray(state[key])) {
        state[key] = [];
        changed = true;
      }
    });
    const runStamp = Date.now();
    ID_COLLECTIONS.forEach(key => {
      const seen = new Set();
      state[key].forEach((item, index) => {
        if (!item || typeof item !== 'object') return;
        let id = text(item.id);
        if (!id || seen.has(id)) {
          id = `x10-${key}-${runStamp}-${index}`;
          item.id = id;
          changed = true;
        }
        seen.add(id);
      });
    });
    if (changed) {
      auditInspection(state, 'x10Repair');
      state.x10Meta = { ...(state.x10Meta || {}), lastRepairAt: stamp(), repairVersion: runtime.getVersion?.() || '' };
    }
    return changed;
  } finally {
    repairInProgress = false;
  }
}

export function x10OverviewMarkup({ state, t, esc }) {
  const summary = inspectX10State(state);
  const statusClass = summary.issues ? 'warn' : 'good';
  const readinessClass = summary.readiness < 80 ? 'is-warning' : 'is-good';
  return `<section class="card x10-command-card" id="x10CommandCard" aria-labelledby="x10CommandTitle">
    <div class="x10-command-head"><div><span class="section-kicker">X10 · ${esc(t('x10.kicker'))}</span><h3 id="x10CommandTitle">${esc(t('x10.title'))}</h3><p>${esc(t('x10.subtitle'))}</p></div><span class="x10-seal">10×</span></div>
    <div class="x10-metrics"><div><strong>${summary.users}</strong><small>${esc(t('x10.users'))}</small></div><div><strong>${summary.sites}</strong><small>${esc(t('x10.sites'))}</small></div><div><strong>${summary.pending}</strong><small>${esc(t('x10.pending'))}</small></div><div><strong>${summary.audit}</strong><small>${esc(t('x10.audit'))}</small></div></div>
    <div class="x10-status-row"><span class="pill ${statusClass}">${esc(summary.issues ? t('x10.reviewNeeded', { count: summary.issues }) : t('x10.integrityGood'))}</span><span class="x10-readiness ${readinessClass}">${esc(t('x10.readiness'))}: ${summary.readiness}%</span><span class="x10-runtime" data-x10-online>${esc(summary.online ? t('x10.connected') : t('x10.disconnected'))}</span><span class="x10-runtime ${summary.saved === false ? 'is-warning' : ''}" data-x10-save>${esc(summary.savedAt)}</span><span class="x10-runtime ${summary.saved === false ? 'is-warning' : ''}">${esc(summary.storageStatus)}</span><span class="x10-runtime">${esc(t('x10.lastCheck'))}: ${esc(summary.checkedAt)}</span><span class="x10-runtime">${esc(t('x10.checks'))}: ${summary.checks}</span><span class="x10-runtime" data-x10-conflict>${summary.saveConflicts ? esc(t('x10.conflictCount', { count: summary.saveConflicts })) : ''}</span><span class="x10-version">${esc(t('common.version'))} ${esc(runtime.getVersion?.() || '')}</span></div>
    <div class="x10-actions"><button type="button" class="btn btn-outline" id="x10Refresh">${esc(t('x10.refresh'))}</button>${summary.issues ? `<button type="button" class="btn btn-secondary" id="x10Repair">${esc(t('x10.repair'))}</button>` : ''}</div>
  </section>`;
}

async function persistInspection(state, save, toast, t) {
  const summary = inspectX10State(state);
  recordInspection(state, summary);
  auditInspection(state, 'x10Check');
  const result = await (save || saveState)?.();
  if (result === false) throw new Error('save-failed');
  toast?.(t('x10.checked'));
}

export function bindX10Overview({ state, t, esc, save, toast, render }) {
  const card = document.querySelector('#x10CommandCard');
  if (!card || card.dataset.bound === 'true') return;
  card.dataset.bound = 'true';
  const setBusy = busy => card.querySelectorAll('button').forEach(button => { button.disabled = busy; });
  card.querySelector('#x10Refresh')?.addEventListener('click', async () => {
    setBusy(true);
    try {
      await persistInspection(state, save, toast, t);
      render?.();
    } catch {
      toast?.(t('messages.error'));
      setBusy(false);
    }
  });
  card.querySelector('#x10Repair')?.addEventListener('click', async () => {
    setBusy(true);
    try {
      if (!repairX10State(state)) {
        toast?.(t('x10.noRepairNeeded'));
        setBusy(false);
        return;
      }
      const summary = inspectX10State(state);
      recordInspection(state, summary);
      const result = await (save || saveState)?.();
      if (result === false) throw new Error('save-failed');
      toast?.(t('x10.repaired'));
      render?.();
    } catch {
      toast?.(t('messages.error'));
      setBusy(false);
    }
  });
}
