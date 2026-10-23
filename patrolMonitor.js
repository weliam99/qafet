const list = value => Array.isArray(value) ? value : [];

const visiblePatrols = (state, account) => {
  const records = list(state?.patrols);
  if (account?.role === 'owner' || account?.role === 'admin') return records;
  return records.filter(item => item.guardId === account?.id || item.guard === account?.name);
};

const followUpState = patrol => patrol?.followUpStatus || (patrol?.status === 'completed' ? 'done' : 'open');
const statusTone = status => status === 'completed' ? 'good' : status === 'pending' ? 'warn' : 'bad';
const canFollowUp = account => ['owner', 'admin', 'supervisor'].includes(account?.role);

function routeForPatrol(patrol, routes, sites) {
  if (!patrol) return null;
  return routes.find(route => route.id === patrol.routeId)
    || routes.find(route => sites.find(site => site.id === route.siteId)?.name === patrol.site)
    || null;
}

function checkpointProgress(patrol, route) {
  const total = Math.max(1, list(route?.checkpoints).length || 4);
  const done = Math.min(total, Number(patrol?.points || patrol?.photoCount || 0));
  return { done, total };
}

function patrolRow(patrol, routes, sites, t, esc, followAllowed) {
  const open = followUpState(patrol) !== 'done';
  const route = routeForPatrol(patrol, routes, sites);
  const progress = checkpointProgress(patrol, route);
  const followButton = followAllowed
    ? `<button class="btn btn-outline patrol-follow-button" type="button" data-follow-up-id="${esc(patrol.id)}">${open ? esc(t('patrolMonitor.markFollowed')) : esc(t('patrolMonitor.reopenFollowUp'))}</button>`
    : '';
  return `<article class="patrol-monitor-row"><div class="patrol-monitor-main"><span class="patrol-monitor-id">${esc(patrol.id || t('common.noData'))}</span><div><strong>${esc(patrol.guard || t('common.unassigned'))}</strong><small>${esc(patrol.site || t('common.unassigned'))} · ${esc(patrol.time || t('common.now'))}${route ? ` · ${esc(route.name)}` : ''}</small></div></div><div class="patrol-monitor-meta"><span class="pill ${statusTone(patrol.status)}">${esc(t(`patrolMonitor.${patrol.status === 'completed' ? 'completed' : patrol.status === 'pending' ? 'inProgress' : 'needsReview'}`))}</span><span class="patrol-monitor-checks">${progress.done}/${progress.total} ${esc(t('patrolMonitor.checkpoints'))}</span>${followButton}</div></article>`;
}

export function renderPatrolMonitor({ state, t, esc, saveState, showToast, actor, renderView }) {
  const root = document.querySelector('#view-patrols');
  if (!root) return;
  root.querySelector('#patrolMonitorCard')?.remove();
  const account = actor(state);
  const patrols = visiblePatrols(state, account).slice().sort((a, b) => String(b.createdAt || b.time || '').localeCompare(String(a.createdAt || a.time || '')));
  const routes = list(state.patrolRoutes);
  const sites = list(state.sites);
  const completed = patrols.filter(item => item.status === 'completed').length;
  const inProgress = patrols.filter(item => item.status !== 'completed').length;
  const needsFollowUp = patrols.filter(item => followUpState(item) !== 'done').length;
  const followAllowed = canFollowUp(account);
  const routeRows = routes.length ? routes.slice(0, 8).map(route => {
    const site = sites.find(item => item.id === route.siteId);
    const related = patrols.filter(item => item.routeId === route.id || (site?.name && item.site === site.name));
    const latest = related[0];
    const progress = checkpointProgress(latest, route);
    const isComplete = latest?.status === 'completed' && progress.done >= progress.total;
    const progressTone = isComplete ? 'good' : latest ? 'warn' : '';
    const progressText = latest ? `${progress.done}/${progress.total} ${t('patrolMonitor.checkpoints')}` : t('patrolMonitor.routeReady');
    return `<div class="patrol-route-row"><div><strong>${esc(route.name || t('map.patrolRoute'))}</strong><small>${esc(site?.name || t('common.unassigned'))} · ${esc(progressText)}</small></div><span class="pill ${progressTone}">${esc(isComplete ? t('patrolMonitor.routeComplete') : latest ? t('patrolMonitor.routeActive') : t('patrolMonitor.routeReady'))}</span></div>`;
  }).join('') : `<div class="empty-state">${esc(t('patrolMonitor.noRoutes'))}</div>`;
  const card = document.createElement('section');
  card.id = 'patrolMonitorCard';
  card.className = 'patrol-monitor-card';
  card.innerHTML = `<div class="patrol-monitor-head"><div><div class="kicker">${esc(t('patrolMonitor.kicker'))}</div><h2>${esc(t('patrolMonitor.title'))}</h2><p>${esc(t('patrolMonitor.subtitle'))}</p></div><button class="btn btn-secondary" type="button" id="openPatrolMap">⌖ ${esc(t('patrolMonitor.openMap'))}</button></div><div class="patrol-monitor-stats"><div><strong>${completed}</strong><span>${esc(t('patrolMonitor.completed'))}</span></div><div><strong>${inProgress}</strong><span>${esc(t('patrolMonitor.inProgress'))}</span></div><div><strong>${needsFollowUp}</strong><span>${esc(t('patrolMonitor.needsFollowUp'))}</span></div><div><strong>${routes.length}</strong><span>${esc(t('patrolMonitor.routes'))}</span></div></div><div class="patrol-monitor-grid"><div class="patrol-monitor-panel"><div class="card-head"><div><h3>${esc(t('patrolMonitor.logTitle'))}</h3><small>${esc(t('patrolMonitor.logHint'))}</small></div><div class="patrol-filter" role="group" aria-label="${esc(t('patrolMonitor.filterLabel'))}"><button type="button" class="active" data-monitor-filter="all">${esc(t('common.all'))}</button><button type="button" data-monitor-filter="open">${esc(t('patrolMonitor.pendingFilter'))}</button></div></div><div id="patrolMonitorRows" class="patrol-monitor-list"></div></div><div class="patrol-monitor-panel"><div class="card-head"><div><h3>${esc(t('patrolMonitor.routesTitle'))}</h3><small>${esc(t('patrolMonitor.routesHint'))}</small></div><span class="pill dark">${routes.length}</span></div><div class="patrol-route-list">${routeRows}</div></div></div>`;
  root.appendChild(card);

  const rowsRoot = card.querySelector('#patrolMonitorRows');
  const drawRows = filter => {
    const filtered = filter === 'open' ? patrols.filter(item => followUpState(item) !== 'done') : patrols;
    rowsRoot.innerHTML = filtered.length
      ? filtered.slice(0, 12).map(item => patrolRow(item, routes, sites, t, esc, followAllowed)).join('')
      : `<div class="empty-state">${esc(t('patrolMonitor.empty'))}</div>`;
    rowsRoot.querySelectorAll('[data-follow-up-id]').forEach(button => button.addEventListener('click', async () => {
      const patrol = patrols.find(item => item.id === button.dataset.followUpId);
      if (!patrol || !followAllowed) return;
      const next = followUpState(patrol) === 'done' ? 'open' : 'done';
      patrol.followUpStatus = next;
      patrol.followUpAt = new Date().toISOString();
      try {
        await saveState();
        showToast(t(next === 'done' ? 'patrolMonitor.followedToast' : 'patrolMonitor.reopenedToast'));
        renderPatrolMonitor({ state, t, esc, saveState, showToast, actor, renderView });
      } catch {
        showToast(t('messages.error'));
      }
    }));
  };
  card.querySelectorAll('[data-monitor-filter]').forEach(button => button.addEventListener('click', () => {
    card.querySelectorAll('[data-monitor-filter]').forEach(item => item.classList.toggle('active', item === button));
    drawRows(button.dataset.monitorFilter);
  }));
  card.querySelector('#openPatrolMap')?.addEventListener('click', () => renderView('map'));
  drawRows('all');
}
