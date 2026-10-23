function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function downloadCsv(rows, filename) {
  const csv = '\ufeff' + rows.map(row => row.map(csvCell).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

const followUpDone = report => report?.followUpStatus === 'done';

export function appendReportsAnalytics({ state, t, esc, showToast, saveState, actor }) {
  const root = document.querySelector('#view-reports');
  if (!root) return;
  root.querySelector('.reports-analytics-card')?.remove();
  const reports = Array.isArray(state.reports) ? state.reports : [];
  const area = document.createElement('section');
  area.className = 'card reports-analytics-card';
  area.innerHTML = `<div class="card-head"><div><h3>${t('analytics.title')}</h3><small>${t('analytics.subtitle')}</small></div><button class="btn btn-secondary" id="exportAnalytics">${t('analytics.export')}</button></div><div class="analytics-grid"><div class="analytics-metric"><span>${t('analytics.total')}</span><strong id="analyticsTotal">0</strong></div><div class="analytics-metric"><span>${t('analytics.open')}</span><strong id="analyticsOpen">0</strong></div><div class="analytics-metric"><span>${t('analytics.followUpPending')}</span><strong id="analyticsFollowUp">0</strong></div><div class="analytics-metric"><span>${t('analytics.closed')}</span><strong id="analyticsClosed">0</strong></div></div><div class="analytics-filters"><label>${t('common.search')}<input id="analyticsSearch" type="search" placeholder="${t('analytics.searchPlaceholder')}"></label><label>${t('reports.severity')}<select id="analyticsSeverity"><option value="all">${t('common.all')}</option><option value="normal">${t('reports.normal')}</option><option value="important">${t('reports.important')}</option><option value="high">${t('reports.high')}</option><option value="critical">${t('reports.critical')}</option></select></label><label>${t('common.status')}<select id="analyticsStatus"><option value="all">${t('common.all')}</option><option value="open">${t('reports.open')}</option><option value="inProgress">${t('reports.inProgress')}</option><option value="closed">${t('reports.closed')}</option></select></label></div><div id="analyticsRows" class="analytics-list"></div>`;
  root.prepend(area);
  const search = area.querySelector('#analyticsSearch');
  const severity = area.querySelector('#analyticsSeverity');
  const status = area.querySelector('#analyticsStatus');
  const rowsRoot = area.querySelector('#analyticsRows');
  const matches = () => reports.filter(report => {
    const query = search.value.trim().toLowerCase();
    const haystack = `${report.id} ${report.title} ${report.site} ${report.by}`.toLowerCase();
    return (!query || haystack.includes(query)) && (severity.value === 'all' || report.severity === severity.value) && (status.value === 'all' || report.status === status.value);
  });
  const draw = () => {
    const filtered = matches();
    const openReports = reports.filter(item => item.status !== 'closed');
    area.querySelector('#analyticsTotal').textContent = String(reports.length);
    area.querySelector('#analyticsOpen').textContent = String(openReports.length);
    area.querySelector('#analyticsFollowUp').textContent = String(openReports.filter(item => !followUpDone(item)).length);
    area.querySelector('#analyticsClosed').textContent = String(reports.filter(item => item.status === 'closed').length);
    rowsRoot.innerHTML = filtered.length ? filtered.slice(0, 12).map(report => {
      const pending = report.status !== 'closed' && !followUpDone(report);
      return `<div class="analytics-row"><div><strong>${esc(report.id)} · ${esc(report.title || t('common.noData'))}</strong><small>${esc(report.site || t('common.unassigned'))} · ${esc(report.time || t('common.now'))}</small></div><span class="pill ${report.severity === 'critical' || report.severity === 'high' ? 'bad' : report.severity === 'important' ? 'warn' : 'good'}">${t(`reports.${report.severity}`)}</span>${report.status !== 'closed' ? `<button class="btn btn-outline" data-follow-up-report="${esc(report.id)}">${pending ? t('analytics.markFollowUp') : t('analytics.reopenFollowUp')}</button><button class="btn btn-outline" data-close-report="${esc(report.id)}">${t('analytics.close')}</button>` : `<span class="pill good">${t('reports.closed')}</span>`}</div>`;
    }).join('') : `<div class="empty-state">${t('analytics.empty')}</div>`;
    rowsRoot.querySelectorAll('[data-follow-up-report]').forEach(button => button.addEventListener('click', async () => {
      const report = reports.find(item => item.id === button.dataset.followUpReport);
      if (!report) return;
      report.followUpStatus = followUpDone(report) ? 'open' : 'done';
      report.followUpAt = new Date().toISOString();
      await saveState();
      draw();
      showToast(t(report.followUpStatus === 'done' ? 'analytics.followUpDone' : 'analytics.followUpReopened'));
    }));
    rowsRoot.querySelectorAll('[data-close-report]').forEach(button => button.addEventListener('click', async () => {
      const report = reports.find(item => item.id === button.dataset.closeReport);
      if (!report) return;
      report.status = 'closed';
      report.closedAt = new Date().toISOString();
      report.closedBy = actor(state)?.name || '';
      await saveState();
      draw();
      showToast(t('analytics.closedToast'));
    }));
  };
  [search, severity, status].forEach(input => input.addEventListener('input', draw));
  area.querySelector('#exportAnalytics').addEventListener('click', () => {
    const filtered = matches();
    downloadCsv([[t('reports.number'), t('reports.type'), t('reports.severity'), t('common.location'), t('common.status'), t('analytics.followUp')], ...filtered.map(report => [report.id, t(`reports.${report.type}`), t(`reports.${report.severity}`), report.site, t(`reports.${report.status}`), followUpDone(report) ? t('analytics.followUpDone') : t('analytics.followUpPending')])], `mirsad-reports-${new Date().toISOString().slice(0, 10)}.csv`);
    showToast(t('analytics.exported'));
  });
  draw();
}
