const list = value => Array.isArray(value) ? value : [];
const todayKey = () => new Date().toISOString().slice(0, 10);
const uid = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

export function normalizeFieldOpsState(state) {
  if (!state) return false;
  let changed = false;
  const today = todayKey();
  if (!state.fieldOps || typeof state.fieldOps !== 'object') {
    state.fieldOps = { date: today, prep: { status: 'draft', people: {}, patrols: [], updatedAt: null, updatedBy: '' }, archives: [] };
    changed = true;
  }
  state.fieldOps.archives = list(state.fieldOps.archives);
  state.fieldOps.prep = state.fieldOps.prep && typeof state.fieldOps.prep === 'object' ? state.fieldOps.prep : { status: 'draft', people: {}, patrols: [] };
  state.fieldOps.prep.people = state.fieldOps.prep.people && typeof state.fieldOps.prep.people === 'object' ? state.fieldOps.prep.people : {};
  state.fieldOps.prep.patrols = list(state.fieldOps.prep.patrols);
  if (state.fieldOps.date !== today) {
    state.fieldOps.archives.unshift({ id: uid('DAY'), date: state.fieldOps.date || today, prep: state.fieldOps.prep, patrols: list(state.patrols), createdAt: new Date().toISOString() });
    state.fieldOps.archives = state.fieldOps.archives.slice(0, 90);
    state.fieldOps.date = today;
    state.fieldOps.prep = { status: 'draft', people: {}, patrols: [], updatedAt: null, updatedBy: '' };
    list(state.users).forEach(user => { if (user.role === 'guard' || user.role === 'supervisor') user.patrols = 0; });
    state.patrols = [];
    changed = true;
  }
  list(state.users).forEach(user => {
    if ((user.role === 'guard' || user.role === 'supervisor') && !state.fieldOps.prep.people[user.id]) {
      state.fieldOps.prep.people[user.id] = user.status === 'present' ? 'present' : 'absent';
      changed = true;
    }
  });
  return changed;
}

const statusLabel = (t, status) => t({ present: 'fieldOps.present', absent: 'fieldOps.absent', late: 'fieldOps.late', withdrawn: 'fieldOps.withdrawn' }[status] || 'fieldOps.absent');
const statusClass = status => status === 'present' ? 'good' : status === 'late' ? 'warn' : status === 'withdrawn' ? 'bad' : '';

export function renderDailyPrep({ state, t, esc, actor, isAdminRole, initials, showToast, saveState, renderView, clock }) {
  const account = actor(state);
  const canEdit = isAdminRole(account.role) || account.role === 'supervisor';
  const prep = state.fieldOps?.prep || { status: 'draft', people: {}, patrols: [] };
  const users = list(state.users).filter(user => user.role === 'guard' || user.role === 'supervisor');
  const sites = list(state.sites);
  const supervisors = users.filter(user => user.role === 'supervisor');
  const peopleRows = users.length ? users.map(user => {
    const status = prep.people[user.id] || 'absent';
    const locked = !canEdit || (account.role === 'supervisor' && user.role === 'supervisor' && user.id !== account.id);
    return `<tr><td><div class="person-cell"><span class="mini-avatar">${esc(initials(user.name))}</span><div><strong>${esc(user.name)}</strong><small>${esc(user.site || t('common.unassigned'))}</small></div></div></td><td>${esc(t(user.role === 'supervisor' ? 'auth.supervisor' : 'auth.guard'))}</td><td><select class="prep-status-select" data-prep-person="${esc(user.id)}" ${locked ? 'disabled' : ''}><option value="present" ${status === 'present' ? 'selected' : ''}>${esc(statusLabel(t, 'present'))}</option><option value="late" ${status === 'late' ? 'selected' : ''}>${esc(statusLabel(t, 'late'))}</option><option value="absent" ${status === 'absent' ? 'selected' : ''}>${esc(statusLabel(t, 'absent'))}</option><option value="withdrawn" ${status === 'withdrawn' ? 'selected' : ''}>${esc(statusLabel(t, 'withdrawn'))}</option></select></td><td><span class="pill ${statusClass(status)}">${esc(statusLabel(t, status))}</span></td></tr>`;
  }).join('') : `<tr><td colspan="4"><div class="empty-state">${esc(t('fieldOps.noPeople'))}</div></td></tr>`;
  const patrolRows = prep.patrols.length ? prep.patrols.map(item => `<div class="fieldops-assignment-row"><div><strong>${esc(item.name)}</strong><small>${esc(item.siteName || t('common.unassigned'))} · ${esc(item.shift || t('dashboard.shiftMorning'))}</small></div><span class="pill ${item.status === 'approved' ? 'good' : item.status === 'returned' ? 'bad' : 'warn'}">${esc(t(`fieldOps.${item.status || 'draft'}`))}</span><button class="btn btn-outline" type="button" data-remove-patrol="${esc(item.id)}" ${canEdit ? '' : 'disabled'}>${esc(t('common.delete'))}</button></div>`).join('') : `<div class="empty-state">${esc(t('fieldOps.noPatrols'))}</div>`;
  const statusText = t(`fieldOps.${prep.status || 'draft'}`);
  const actionButtons = canEdit ? `<div class="header-actions"><button class="btn btn-secondary" type="button" id="savePrepDraft">${esc(t('fieldOps.saveDraft'))}</button><button class="btn btn-primary" type="button" id="sendPrepAdmin">${esc(t('prep.sendAdmin'))}</button>${isAdminRole(account.role) ? `<button class="btn btn-outline" type="button" id="approvePrep">${esc(t('common.approve'))}</button><button class="btn btn-danger" type="button" id="returnPrep">${esc(t('fieldOps.returnPrep'))}</button>` : ''}</div>` : '';
  const siteOptions = sites.map(site => `<option value="${esc(site.id)}">${esc(site.name)}</option>`).join('');
  const supervisorOptions = supervisors.map(user => `<option value="${esc(user.id)}">${esc(user.name)}</option>`).join('');
  const root = document.querySelector('#view-prep');
  root.innerHTML = `<div class="view-header"><div><div class="kicker">${esc(t('nav.prep'))}</div><h1>${esc(t('prep.title'))}</h1><p>${esc(t('fieldOps.prepSubtitle'))}</p></div>${actionButtons}</div><div class="fieldops-status-bar"><span>${esc(t('fieldOps.day'))}: <b dir="ltr">${esc(state.fieldOps?.date || todayKey())}</b></span><span class="pill ${prep.status === 'approved' ? 'good' : prep.status === 'returned' ? 'bad' : 'warn'}">${esc(statusText)}</span><small>${esc(t('fieldOps.lastUpdated'))}: ${esc(prep.updatedAt ? `${new Date(prep.updatedAt).toLocaleDateString('ar-SA')} ${clock(new Date(prep.updatedAt))}` : t('common.now'))}</small></div><div class="dashboard-grid fieldops-grid"><div class="card"><div class="card-head"><div><h3>${esc(t('fieldOps.peopleTitle'))}</h3><small>${esc(t('fieldOps.peopleHint'))}</small></div><span class="pill dark">${users.length} ${esc(t('people.person'))}</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>${esc(t('people.person'))}</th><th>${esc(t('people.role'))}</th><th>${esc(t('fieldOps.prepStatus'))}</th><th>${esc(t('common.status'))}</th></tr></thead><tbody>${peopleRows}</tbody></table></div></div><div class="card"><div class="card-head"><div><h3>${esc(t('fieldOps.patrolTitle'))}</h3><small>${esc(t('fieldOps.patrolHint'))}</small></div><span class="pill dark">${prep.patrols.length}</span></div>${canEdit ? `<form id="prepPatrolForm" class="fieldops-form"><input name="name" required placeholder="${esc(t('fieldOps.patrolName'))}"><select name="siteId"><option value="">${esc(t('common.unassigned'))}</option>${siteOptions}</select><select name="supervisorId"><option value="">${esc(t('fieldOps.noSupervisor'))}</option>${supervisorOptions}</select><button class="btn btn-secondary" type="submit">+ ${esc(t('fieldOps.addPatrol'))}</button></form>` : ''}<div class="fieldops-assignment-list">${patrolRows}</div></div></div><div class="card fieldops-summary"><div class="card-head"><div><h3>${esc(t('fieldOps.attendanceSummary'))}</h3><small>${esc(t('fieldOps.attendanceHint'))}</small></div></div><div class="fieldops-summary-grid"><span class="pill good">${users.filter(user => (prep.people[user.id] || 'absent') === 'present').length} ${esc(t('fieldOps.present'))}</span><span class="pill warn">${users.filter(user => prep.people[user.id] === 'late').length} ${esc(t('fieldOps.late'))}</span><span class="pill bad">${users.filter(user => ['absent', 'withdrawn'].includes(prep.people[user.id])).length} ${esc(t('fieldOps.absent'))}</span></div></div>`;

  root.querySelectorAll('[data-prep-person]').forEach(select => select.addEventListener('change', () => { prep.people[select.dataset.prepPerson] = select.value; }));
  root.querySelector('#prepPatrolForm')?.addEventListener('submit', event => { event.preventDefault(); const data = new FormData(event.currentTarget); const site = sites.find(item => item.id === data.get('siteId')); prep.patrols.push({ id: uid('PREP'), name: String(data.get('name') || '').trim(), siteId: String(data.get('siteId') || ''), siteName: site?.name || '', supervisorId: String(data.get('supervisorId') || ''), shift: t('dashboard.shiftMorning'), status: 'draft' }); event.currentTarget.reset(); renderDailyPrep({ state, t, esc, actor, isAdminRole, initials, showToast, saveState, renderView, clock }); });
  root.querySelectorAll('[data-remove-patrol]').forEach(button => button.addEventListener('click', () => { prep.patrols = prep.patrols.filter(item => item.id !== button.dataset.removePatrol); renderDailyPrep({ state, t, esc, actor, isAdminRole, initials, showToast, saveState, renderView, clock }); }));
  const updatePrep = (status, message) => { prep.status = status; prep.updatedAt = new Date().toISOString(); prep.updatedBy = account.id; state.notifications = list(state.notifications); if (status === 'sent') list(state.users).filter(user => isAdminRole(user.role)).forEach(user => state.notifications.unshift({ id: uid('PREPN'), targetUserId: user.id, type: 'dailyPrep', text: t('fieldOps.prepSent'), time: t('common.now'), read: false })); if (status === 'returned') list(state.users).filter(user => user.role === 'supervisor').forEach(user => state.notifications.unshift({ id: uid('PREPN'), targetUserId: user.id, type: 'dailyPrep', text: t('fieldOps.prepReturned'), time: t('common.now'), read: false })); state.notifications = state.notifications.slice(0, 120); saveState(); showToast(t(message)); renderDailyPrep({ state, t, esc, actor, isAdminRole, initials, showToast, saveState, renderView, clock }); };
  root.querySelector('#savePrepDraft')?.addEventListener('click', () => updatePrep('draft', 'fieldOps.prepSaved'));
  root.querySelector('#sendPrepAdmin')?.addEventListener('click', () => { updatePrep('sent', 'fieldOps.prepSent'); });
  root.querySelector('#approvePrep')?.addEventListener('click', () => updatePrep('approved', 'fieldOps.prepApproved'));
  root.querySelector('#returnPrep')?.addEventListener('click', () => updatePrep('returned', 'fieldOps.prepReturned'));
}
