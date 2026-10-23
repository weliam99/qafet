let runtime = { t: key => key, getState: () => null, getVersion: () => '', save: null };

const list = value => Array.isArray(value) ? value : [];
const tr = (key, values) => runtime.t?.(key, values) || key;
const text = value => String(value ?? '').trim();
const stamp = () => new Date().toISOString();
const clock = () => new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
const riskWeights = { normal: 1, important: 2, high: 4, critical: 7 };

function countOpenReports(state) {
  return list(state?.reports).filter(report => report?.status !== 'closed').length;
}

function priorityFor(summary) {
  if (summary.criticalSignals > 0 || summary.controlScore < 45) return 'critical';
  if (summary.highSignals > 0 || summary.controlScore < 70) return 'high';
  if (summary.pendingActions > 0 || summary.controlScore < 88) return 'important';
  return 'normal';
}

function signalList(state, summary) {
  const signals = [];
  if (summary.criticalSignals) signals.push(tr('x30.criticalSignals', { count: summary.criticalSignals }));
  if (summary.openReports) signals.push(tr('x30.openReports', { count: summary.openReports }));
  if (summary.pendingRequests) signals.push(tr('x30.pendingRequests', { count: summary.pendingRequests }));
  if (summary.unresolvedWarnings) signals.push(tr('x30.unresolvedWarnings', { count: summary.unresolvedWarnings }));
  if (summary.locationCoverage < 70) signals.push(tr('x30.locationCoverage', { count: summary.locationCoverage }));
  if (!signals.length) signals.push(tr('x30.allClear'));
  return signals;
}

export function inspectX30State(state = runtime.getState?.()) {
  const source = state || {};
  const reports = list(source.reports);
  const warnings = list(source.warnings);
  const requests = list(source.requests);
  const users = list(source.users);
  const x10 = source.x10Meta || {};
  const x20 = source.x20Meta || {};
  const openReports = reports.filter(report => report?.status !== 'closed');
  const criticalSignals = reports.filter(report => report?.severity === 'critical' && report?.status !== 'closed').length
    + warnings.filter(warning => warning?.severity === 'critical' || warning?.severity === 'high').length;
  const highSignals = reports.filter(report => ['high', 'important'].includes(report?.severity) && report?.status !== 'closed').length
    + warnings.filter(warning => warning?.status === 'open' || warning?.severity === 'important').length;
  const pendingRequests = requests.filter(request => request?.status === 'pending').length;
  const unresolvedWarnings = warnings.filter(warning => !warning?.signedAt).length;
  const locatedUsers = users.filter(user => Number.isFinite(Number(user?.lat)) && Number.isFinite(Number(user?.lng))).length;
  const locationCoverage = users.length ? Math.round((locatedUsers / users.length) * 100) : 100;
  const dataTrust = Number.isFinite(Number(x10.readiness)) ? Number(x10.readiness) : (Number(x20.readiness) || 100);
  const continuity = Number(x10.saveFailures) || Number(x20.saveFailures) ? 65 : 100;
  const riskLoad = openReports.reduce((sum, report) => sum + (riskWeights[report?.severity] || 1), 0)
    + warnings.reduce((sum, warning) => sum + (riskWeights[warning?.severity] || (warning?.status === 'open' ? 2 : 0)), 0)
    + pendingRequests * 2;
  const controlScore = Math.max(0, Math.min(100, Math.round(dataTrust * 0.34 + continuity * 0.22 + locationCoverage * 0.16 + Math.max(0, 100 - Math.min(100, riskLoad * 5)) * 0.28)));
  const pendingActions = pendingRequests + unresolvedWarnings;
  const summary = { controlScore, criticalSignals, highSignals, openReports: openReports.length, pendingRequests, pendingActions, unresolvedWarnings, locationCoverage, dataTrust, continuity, riskLoad };
  const priority = priorityFor(summary);
  const previous = source.x30Meta?.lastDecision || null;
  return {
    ...summary,
    priority,
    signals: signalList(source, summary),
    fingerprint: `${String(x20.fingerprint || x10.fingerprint || 'local').slice(0, 8)}-${controlScore}-${riskLoad}`,
    lastDecision: previous,
    decisions: list(source.x30Meta?.decisions).length,
    checkedAt: source.x30Meta?.checkedAt ? new Date(source.x30Meta.checkedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : tr('x30.notChecked'),
  };
}

function recordDecision(state, summary, action) {
  if (!state) return;
  const checkedAt = stamp();
  const decision = { action, priority: summary.priority, score: summary.controlScore, fingerprint: summary.fingerprint, version: runtime.getVersion?.() || '', checkedAt };
  state.x30Meta = {
    ...(state.x30Meta || {}),
    checkedAt,
    controlScore: summary.controlScore,
    priority: summary.priority,
    fingerprint: summary.fingerprint,
    lastDecision: decision,
    decisions: [decision, ...list(state.x30Meta?.decisions)].slice(0, 12),
  };
  state.audit = Array.isArray(state.audit) ? state.audit : [];
  state.audit.unshift({ action: `x30${action}`, actor: state.currentUser?.name || tr('x30.system'), time: `${tr('common.today')} ${clock()}` });
  state.audit = state.audit.slice(0, 100);
}

export function initX30Core(options = {}) {
  runtime = { ...runtime, ...options };
}

export function x30OverviewMarkup({ state, t, esc }) {
  const summary = inspectX30State(state);
  const statusClass = summary.priority === 'normal' ? 'good' : summary.priority === 'important' ? 'warn' : 'bad';
  const scoreClass = summary.controlScore >= 88 ? 'is-good' : summary.controlScore >= 70 ? 'is-warning' : 'is-critical';
  const decision = summary.lastDecision ? t('x30.lastDecisionAt', { time: new Date(summary.lastDecision.checkedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) }) : t('x30.noDecision');
  return `<section class="card x30-command-card" id="x30CommandCard" aria-labelledby="x30CommandTitle">
    <div class="x30-command-head"><div><span class="section-kicker">X30 · ${esc(t('x30.kicker'))}</span><h3 id="x30CommandTitle">${esc(t('x30.title'))}</h3><p>${esc(t('x30.subtitle'))}</p></div><div class="x30-emblem"><strong>30</strong><small>${esc(t('x30.level'))}</small></div></div>
    <div class="x30-control-row"><div class="x30-control-score ${scoreClass}"><strong>${summary.controlScore}%</strong><span>${esc(t('x30.controlScore'))}</span></div><div class="x30-priority"><span class="pill ${statusClass}">${esc(t(`x30.priority.${summary.priority}`))}</span><strong>${esc(summary.signals[0])}</strong><small>${esc(decision)} · ${esc(t('x30.decisions', { count: summary.decisions }))}</small></div></div>
    <div class="x30-metrics"><div><strong>${summary.criticalSignals}</strong><small>${esc(t('x30.critical'))}</small></div><div><strong>${summary.pendingActions}</strong><small>${esc(t('x30.pending'))}</small></div><div><strong>${summary.locationCoverage}%</strong><small>${esc(t('x30.coverage'))}</small></div><div><strong>${summary.riskLoad}</strong><small>${esc(t('x30.riskLoad'))}</small></div></div>
    <div class="x30-status-row"><span class="x30-detail">${esc(t('x30.dataTrust'))}: ${summary.dataTrust}%</span><span class="x30-detail">${esc(t('x30.continuity'))}: ${summary.continuity}%</span><span class="x30-detail">${esc(t('x30.fingerprint'))}: ${esc(summary.fingerprint)}</span><span class="x30-detail">${esc(t('x30.lastCheck'))}: ${esc(summary.checkedAt)}</span><span class="x30-detail">${esc(t('common.version'))} ${esc(runtime.getVersion?.() || '')}</span></div>
    <div class="x30-actions"><button type="button" class="btn btn-primary" id="x30Assess">${esc(t('x30.assess'))}</button><button type="button" class="btn btn-outline" id="x30Stabilize">${esc(t('x30.stabilize'))}</button></div>
  </section>`;
}

async function persistDecision(state, save, toast, t, action) {
  const summary = inspectX30State(state);
  recordDecision(state, summary, action);
  const result = await save?.();
  if (result === false) throw new Error('save-failed');
  toast?.(t(action === 'Assessment' ? 'x30.assessed' : 'x30.stabilized'));
}

export function bindX30Overview({ state, t, save, toast, render }) {
  const card = document.querySelector('#x30CommandCard');
  if (!card || card.dataset.bound === 'true') return;
  card.dataset.bound = 'true';
  const setBusy = busy => card.querySelectorAll('button').forEach(button => { button.disabled = busy; });
  card.querySelector('#x30Assess')?.addEventListener('click', async () => {
    setBusy(true);
    try { await persistDecision(state, save, toast, t, 'Assessment'); render?.(); } catch { toast?.(t('messages.error')); setBusy(false); }
  });
  card.querySelector('#x30Stabilize')?.addEventListener('click', async () => {
    setBusy(true);
    try { await persistDecision(state, save, toast, t, 'Stabilization'); render?.(); } catch { toast?.(t('messages.error')); setBusy(false); }
  });
}
