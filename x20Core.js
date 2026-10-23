let runtime = { t: key => key, getState: () => null, getVersion: () => '', save: null };

const list = value => Array.isArray(value) ? value : [];
const tr = (key, values) => runtime.t?.(key, values) || key;
const text = value => String(value ?? '').trim();
const stamp = () => new Date().toISOString();
const nowText = () => new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
const weights = { normal: 1, important: 2, high: 4, critical: 8 };

function shortHash(value) {
  let hash = 2166136261;
  const source = String(value);
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function countBy(state, key, predicate) {
  return list(state?.[key]).filter(predicate).length;
}

export function inspectX20State(state = runtime.getState?.()) {
  const source = state || {};
  const users = list(source.users);
  const sites = list(source.sites);
  const reports = list(source.reports);
  const requests = list(source.requests);
  const patrols = list(source.patrols);
  const x10 = source.x10Meta || {};
  const x20 = source.x20Meta || {};
  const openReports = reports.filter(report => report?.status !== 'closed');
  const reportRisk = openReports.reduce((sum, report) => sum + (weights[report?.severity] || 1), 0);
  const pendingRequests = requests.filter(request => request?.status === 'pending').length;
  const unresolvedWarnings = countBy(source, 'warnings', warning => !warning?.signedAt);
  const usersWithLocation = users.filter(user => Number.isFinite(Number(user?.lat)) && Number.isFinite(Number(user?.lng))).length;
  const patrolCoverage = users.length ? Math.round((usersWithLocation / users.length) * 100) : 100;
  const dataScore = Math.max(0, 100 - Math.min(60, (Number(x10.issues) || 0) * 8));
  const savePenalty = Math.min(45, (Number(x10.saveFailures) || 0) * 10 + (Number(x10.saveConflicts) || 0) * 15);
  const continuityScore = Math.max(0, 100 - savePenalty);
  const fieldScore = Math.max(0, 100 - Math.min(55, reportRisk * 5 + pendingRequests * 3 + unresolvedWarnings * 2));
  const readiness = Math.max(0, Math.min(100, Math.round(dataScore * 0.35 + continuityScore * 0.25 + fieldScore * 0.25 + patrolCoverage * 0.15)));
  const flags = [];
  if (Number(x10.issues) > 0) flags.push(tr('x20.dataReview', { count: x10.issues }));
  if (reportRisk > 0) flags.push(tr('x20.openRisk', { count: openReports.length }));
  if (pendingRequests > 0) flags.push(tr('x20.pendingRequests', { count: pendingRequests }));
  if (savePenalty > 0) flags.push(tr('x20.saveReview'));
  if (!flags.length) flags.push(tr('x20.allClear'));
  const fingerprint = shortHash([
    x10.fingerprint || '',
    users.map(user => text(user.id)).sort().join(','),
    sites.map(site => text(site.id)).sort().join(','),
    reports.map(report => `${text(report.id)}:${text(report.status)}`).sort().join(','),
    requests.map(request => `${text(request.id)}:${text(request.status)}`).sort().join(',')
  ].join('|'));
  return {
    readiness,
    dataScore,
    continuityScore,
    fieldScore,
    patrolCoverage,
    users: users.length,
    sites: sites.length,
    openReports: openReports.length,
    reportRisk,
    pendingRequests,
    unresolvedWarnings,
    flags,
    fingerprint,
    checkpoint: x20?.checkpoint || null,
    runs: list(x20?.history).length,
    checkedAt: x20?.checkedAt ? new Date(x20.checkedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : tr('x20.notChecked')
  };
}

function recordRun(state, summary) {
  if (!state) return;
  const checkedAt = stamp();
  state.x20Meta = {
    ...(state.x20Meta || {}),
    checkedAt,
    readiness: summary.readiness,
    fingerprint: summary.fingerprint,
    history: [{ checkedAt, readiness: summary.readiness, fingerprint: summary.fingerprint }, ...list(state.x20Meta?.history)].slice(0, 10)
  };
}

function createCheckpoint(state, summary) {
  if (!state) return;
  const createdAt = stamp();
  state.x20Meta = {
    ...(state.x20Meta || {}),
    checkpoint: {
      createdAt,
      fingerprint: summary.fingerprint,
      readiness: summary.readiness,
      counts: { users: summary.users, sites: summary.sites, reports: summary.openReports, requests: summary.pendingRequests }
    }
  };
  state.audit = Array.isArray(state.audit) ? state.audit : [];
  state.audit.unshift({ action: 'x20Checkpoint', actor: state.currentUser?.name || tr('x20.system'), time: `${tr('common.today')} ${nowText()}` });
  state.audit = state.audit.slice(0, 100);
}

export function initX20Core(options = {}) {
  runtime = { ...runtime, ...options };
}

export function x20OverviewMarkup({ state, t, esc }) {
  const summary = inspectX20State(state);
  const statusClass = summary.readiness >= 85 ? 'good' : summary.readiness >= 65 ? 'warn' : 'bad';
  const scoreClass = summary.readiness >= 85 ? 'is-good' : 'is-warning';
  const checkpointText = summary.checkpoint ? t('x20.checkpointAt', { time: new Date(summary.checkpoint.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) }) : t('x20.noCheckpoint');
  return `<section class="card x20-command-card" id="x20CommandCard" aria-labelledby="x20CommandTitle">
    <div class="x20-command-head"><div><span class="section-kicker">X20 · ${esc(t('x20.kicker'))}</span><h3 id="x20CommandTitle">${esc(t('x20.title'))}</h3><p>${esc(t('x20.subtitle'))}</p></div><div class="x20-emblem"><strong>20</strong><small>${esc(t('x20.level'))}</small></div></div>
    <div class="x20-score-row"><div class="x20-score ${scoreClass}"><strong>${summary.readiness}%</strong><span>${esc(t('x20.readiness'))}</span></div><div class="x20-flags"><strong>${esc(summary.flags[0])}</strong><small>${esc(t('x20.fingerprint'))}: ${esc(summary.fingerprint)}</small><small>${esc(checkpointText)}</small></div></div>
    <div class="x20-metrics"><div><strong>${summary.dataScore}%</strong><small>${esc(t('x20.dataIntegrity'))}</small></div><div><strong>${summary.continuityScore}%</strong><small>${esc(t('x20.continuity'))}</small></div><div><strong>${summary.fieldScore}%</strong><small>${esc(t('x20.fieldReadiness'))}</small></div><div><strong>${summary.patrolCoverage}%</strong><small>${esc(t('x20.coverage'))}</small></div></div>
    <div class="x20-status-row"><span class="pill ${statusClass}">${esc(summary.readiness >= 85 ? t('x20.ready') : t('x20.review'))}</span><span class="x20-detail">${esc(t('x20.openReports', { count: summary.openReports }))}</span><span class="x20-detail">${esc(t('x20.runs', { count: summary.runs }))}</span><span class="x20-detail">${esc(t('x20.lastCheck'))}: ${esc(summary.checkedAt)}</span><span class="x20-detail">${esc(t('common.version'))} ${esc(runtime.getVersion?.() || '')}</span></div>
    <div class="x20-actions"><button type="button" class="btn btn-outline" id="x20Audit">${esc(t('x20.runCheck'))}</button><button type="button" class="btn btn-secondary" id="x20Checkpoint">${esc(t('x20.createCheckpoint'))}</button></div>
  </section>`;
}

async function saveRun(state, toast, t, createSafeCheckpoint = false) {
  const summary = inspectX20State(state);
  recordRun(state, summary);
  if (createSafeCheckpoint) createCheckpoint(state, summary);
  const result = await runtime.save?.();
  if (result === false) throw new Error('save-failed');
  toast?.(createSafeCheckpoint ? t('x20.checkpointCreated') : t('x20.checked'));
}

export function bindX20Overview({ state, t, esc, save, toast, render }) {
  runtime.save = save || runtime.save;
  const card = document.querySelector('#x20CommandCard');
  if (!card || card.dataset.bound === 'true') return;
  card.dataset.bound = 'true';
  const setBusy = busy => card.querySelectorAll('button').forEach(button => { button.disabled = busy; });
  card.querySelector('#x20Audit')?.addEventListener('click', async () => {
    setBusy(true);
    try { await saveRun(state, toast, t); render?.(); } catch { toast?.(t('messages.error')); setBusy(false); }
  });
  card.querySelector('#x20Checkpoint')?.addEventListener('click', async () => {
    setBusy(true);
    try { await saveRun(state, toast, t, true); render?.(); } catch { toast?.(t('messages.error')); setBusy(false); }
  });
}
