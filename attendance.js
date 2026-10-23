// Attendance view: guard check-in and check-out, work nature, geofence status and today's site log.
// Dependencies come from main.js through `ctx` (modules never import main.js).
import {shiftForUser,formatShiftWindow} from './shifts.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function workTypeCard(ctx, workType, workLabel, check, canCheckIn) {
  const { t, esc } = ctx;
  return `<div class="card work-type-card"><div class="card-head"><div><h3>${t('attendance.workNature')}</h3><small>${t('attendance.workNatureHint')}</small></div><span class="pill dark">${esc(workLabel)}</span></div><div class="segmented" id="workTypePicker"><button type="button" data-work-type="site" class="${workType === 'site' ? 'active' : ''}">⌖ ${t('attendance.siteWork')}</button><button type="button" data-work-type="patrol" class="${workType === 'patrol' ? 'active' : ''}">✦ ${t('attendance.patrolWork')}</button></div></div><div class="notice-box ${canCheckIn ? 'good' : 'bad'}">${workType === 'patrol' ? `✓ ${t('attendance.patrolReady')}` : check.inside ? `✓ ${t('geo.inside')} · ${t('geo.distance', { distance: check.distance || 0 })}` : `! ${t('geo.outside')} · ${t('geo.checkInBlocked')}`}</div>`;
}

function shiftCard(ctx, u, schedule, workLabel, workType, check, isGuard, canCheckIn) {
  const { t, esc } = ctx;
  const actions = isGuard
    ? `${!u.checkIn ? `<button class="btn btn-primary" id="checkInBtn" ${canCheckIn ? '' : 'disabled'}>◷ ${t('attendance.checkIn')}</button>` : `<button class="btn btn-danger" id="checkOutBtn">◷ ${t('attendance.checkOut')}</button>`}`
    : '';
  return `<div class="card"><div class="card-head"><h3>${t('attendance.currentShift')}</h3><span class="pill dark">${esc(schedule.groupLabel)} · ${esc(schedule.label)} · ${formatShiftWindow(schedule)}</span></div><div class="metric-line"><span>${t('attendance.workNature')}</span><strong>${esc(workLabel)}</strong></div><div class="metric-line"><span>${t('attendance.geofence')}</span><strong>${workType === 'patrol' ? t('attendance.patrolAssignment') : check.inside ? t('map.inside') : t('map.outside')}</strong></div><div class="metric-line"><span>${t('common.location')}</span><strong>${esc(check.site.name)}</strong></div><div class="metric-line"><span>${t('attendance.start')}</span><strong>${u.checkIn || t('attendance.notChecked')}</strong></div><div class="metric-line"><span>${t('attendance.end')}</span><strong>${u.checkOut || '—'}</strong></div><div class="header-actions" style="margin-top:22px">${actions}<button class="btn btn-outline" id="refreshGeo">⌖ ${t('common.refresh')}</button></div><p class="form-error" id="attendanceError" hidden></p></div>`;
}

function teamCard(ctx, isGuard) {
  const { state, t, esc, initials } = ctx;
  if (isGuard) {
    return `<div class="card"><div class="card-head"><h3>${t('attendance.timeline')}</h3><span class="pill good">${t('common.today')}</span></div><div class="notice-box good">${t('attendance.worked')}: <strong>${state.users.find(x => x.id === state.currentUser?.id)?.checkIn ? '03:42' : '00:00'} ${t('common.hours')}</strong></div></div>`;
  }
  const rows = state.users.filter(x => x.role === 'guard').map(x => `<tr><td><div class="person-cell"><span class="mini-avatar">${esc(initials(x.name))}</span>${esc(x.name)}</div></td><td>${esc(x.workType === 'patrol' ? t('attendance.patrolWork') : t('attendance.siteWork'))}</td><td>${x.checkIn || '—'}</td><td><span class="pill ${x.status === 'present' ? 'good' : x.status === 'late' ? 'warn' : 'bad'}">${t(`attendance.${x.status === 'present' ? 'present' : x.status === 'late' ? 'lateStatus' : 'absent'}`)}</span></td><td>${esc(x.site || t('common.unassigned'))}</td></tr>`).join('');
  return `<div class="card"><div class="card-head"><h3>${t('attendance.adminView')}</h3><span class="pill good">${t('common.today')}</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>${t('people.person')}</th><th>${t('attendance.workNature')}</th><th>${t('attendance.start')}</th><th>${t('common.status')}</th><th>${t('common.location')}</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
}

export function renderAttendanceView(ctx) {
  const { state, t, header, saveState, renderUser, startLocationWatch, showToast, attendanceAction, renderAttendance, geoCheck } = ctx;
  const u = state.users.find(x => x.id === state.currentUser?.id) || state.users[0] || {};
  const check = geoCheck();
  const isGuard = u.role === 'guard';
  const schedule = shiftForUser(u, new Date(), t, state);
  const workType = u.workType || 'site';
  const canCheckIn = check.inside;
  const workLabel = workType === 'patrol' ? t('attendance.patrolWork') : t('attendance.siteWork');
  const statusPill = isGuard ? `<span class="pill ${canCheckIn ? 'good' : 'bad'}">● ${canCheckIn ? t('attendance.readyToCheckIn') : t('geo.outside')}</span>` : '';

  $('#view-attendance').innerHTML =
    header('nav.attendance', 'attendance.title', 'attendance.subtitle', statusPill) +
    (isGuard ? workTypeCard(ctx, workType, workLabel, check, canCheckIn) : '') +
    `<div class="dashboard-grid">${shiftCard(ctx, u, schedule, workLabel, workType, check, isGuard, canCheckIn)}${teamCard(ctx, isGuard)}</div>`;

  if (isGuard) {
    $$('[data-work-type]').forEach(button => button.addEventListener('click', () => {
      u.workType = button.dataset.workType;
      u.workSelectedAt = new Date().toISOString();
      saveState();
      renderUser();
      renderAttendance();
    }));
    $('#checkInBtn')?.addEventListener('click', () => attendanceAction('in'));
    $('#checkOutBtn')?.addEventListener('click', () => attendanceAction('out'));
  }
  $('#refreshGeo').addEventListener('click', () => {
    startLocationWatch();
    renderAttendance();
    showToast(t('geo.checking'));
  });
}

export function attendanceActionCore(ctx, type) {
  const { state, t, uid, clock, addAudit, saveState, showToast, geoCheck, renderAttendance } = ctx;
  const u = state.users.find(x => x.id === state.currentUser.id);
  const check = geoCheck();
  const schedule = shiftForUser(u, new Date(), t, state);
  const workType = u.workType || 'site';

  if (type === 'in' && !schedule.working) {
    showToast(t('attendance.restDay'));
    renderAttendance();
    return;
  }
  if (!check.inside) {
    if (type === 'out') {
      state.notifications = Array.isArray(state.notifications) ? state.notifications : [];
      state.notifications.unshift({ id: uid('n'), type: 'outside', text: t('notifications.outside'), time: t('common.now'), read: false });
      addAudit('geofence');
      saveState();
      showToast(t('geo.violation'));
    } else {
      showToast(type === 'in' ? t('geo.checkInBlocked') : t('geo.checkOutBlocked'));
    }
    renderAttendance();
    return;
  }
  if (type === 'in') {
    u.checkIn = clock();
    u.checkInAt = new Date().toISOString();
    u.checkOut = null;
    u.checkOutAt = null;
    u.checkOutReason = null;
    u.attendanceType = workType;
    u.status = 'present';
    addAudit('attendanceIn');
    showToast(t('attendance.successIn'));
  } else {
    u.checkOut = clock();
    u.checkOutAt = new Date().toISOString();
    u.status = 'finished';
    u.checkOutReason = 'manual';
    addAudit('attendanceOut');
    showToast(t('attendance.successOut'));
  }
  saveState();
  renderAttendance();
}
