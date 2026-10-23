const GROUPS = [
  { id: 'group-1', code: 'A', nameKey: 'attendance.groupA', shift: 'morning' },
  { id: 'group-2', code: 'B', nameKey: 'attendance.groupB', shift: 'evening' },
  { id: 'group-3', code: 'C', nameKey: 'attendance.groupC', shift: 'morning' },
  { id: 'group-4', code: 'D', nameKey: 'attendance.groupD', shift: 'evening' },
];

const DAY_MS = 86400000;
const pad = value => String(value).padStart(2, '0');
const dateOnly = value => {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};
const diffDays = (from, to) => Math.floor((dateOnly(to) - dateOnly(from)) / DAY_MS);
const atTime = (day, hour) => {
  const date = new Date(day);
  date.setHours(hour, 0, 0, 0);
  return date;
};

export function shiftGroups() {
  return GROUPS.map(group => ({ ...group }));
}

export function normalizeShiftState(state) {
  let changed = false;
  if (!state.shiftSystem || typeof state.shiftSystem !== 'object') {
    state.shiftSystem = { anchorDate: new Date().toISOString().slice(0, 10), cycleDays: 10 };
    changed = true;
  }
  if (!state.shiftSystem.anchorDate) {
    state.shiftSystem.anchorDate = new Date().toISOString().slice(0, 10);
    changed = true;
  }
  state.shiftSystem.cycleDays = 10;
  let assignmentIndex = 0;
  (state.users || []).forEach(user => {
    if (user.role === 'admin') return;
    if (!GROUPS.some(group => group.id === user.shiftGroup)) {
      user.shiftGroup = GROUPS[assignmentIndex % GROUPS.length].id;
      assignmentIndex += 1;
      changed = true;
    }
    if (user.checkIn && !user.checkInAt) {
      const today = new Date();
      const parts = String(user.checkIn).split(':').map(Number);
      if (Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
        today.setHours(parts[0], parts[1], 0, 0);
        user.checkInAt = today.toISOString();
        changed = true;
      }
    }
    if (!user.checkOut) user.checkOutAt = user.checkOutAt || null;
  });
  return changed;
}

export function shiftForUser(user, value = new Date(), t = key => key, state = null) {
  const group = GROUPS.find(item => item.id === user?.shiftGroup) || GROUPS[0];
  const anchorValue = state?.shiftSystem?.anchorDate || new Date().toISOString().slice(0, 10);
  const anchor = new Date(`${anchorValue}T00:00:00`);
  const safeAnchor = Number.isNaN(anchor.getTime()) ? new Date(value) : anchor;
  const elapsed = ((diffDays(safeAnchor, value) % 10) + 10) % 10;
  const workingPair = elapsed < 5 ? ['group-1', 'group-2'] : ['group-3', 'group-4'];
  const working = workingPair.includes(group.id);
  const shift = group.shift;
  const startHour = shift === 'morning' ? 6 : 18;
  const startDay = new Date(value);
  if (shift === 'evening' && value.getHours() < 6) startDay.setDate(startDay.getDate() - 1);
  const start = atTime(startDay, startHour);
  const end = new Date(start);
  end.setHours(end.getHours() + 12);
  return {
    group,
    working,
    resting: !working,
    shift,
    label: t(shift === 'morning' ? 'dashboard.shiftMorning' : 'dashboard.shiftEvening'),
    groupLabel: t(group.nameKey),
    start,
    end,
    closeAfter: new Date(end.getTime() + 30 * 60000),
    cycleDay: elapsed + 1,
  };
}

export function closeExpiredAttendance(state, value = new Date()) {
  const closed = [];
  (state.users || []).forEach(user => {
    if (!user.checkInAt || user.checkOutAt || user.status === 'finished') return;
    const schedule = shiftForUser(user, value, key => key, state);
    if (value < schedule.closeAfter) return;
    user.checkOutAt = value.toISOString();
    user.checkOut = `${pad(value.getHours())}:${pad(value.getMinutes())}`;
    user.status = 'finished';
    user.checkOutReason = 'auto-shift-close';
    user.autoCheckoutWarning = true;
    closed.push({ user, schedule, at: value });
  });
  return closed;
}

export function formatShiftWindow(schedule) {
  const start = schedule.start.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  const end = schedule.end.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  return `${start} – ${end}`;
}
