import {normalizeRole} from './roleAccess.js';

const DEFAULT_OWNER = {
  id: 'u-owner-new',
  name: 'المالك',
  username: '[CONTACT_REDACTED]',
  phone: '[CONTACT_REDACTED]',
  password: '[REDACTED]',
  role: 'owner',
  site: 'غرفة العمليات',
  projectId: '',
  status: 'absent',
  checkIn: null,
  checkOut: null,
  lat: null,
  lng: null,
  patrols: 0,
  score: 0,
};

const DEFAULT_ADMIN = {
  id: 'u-admin-new',
  name: 'الإدارة',
  username: '[CONTACT_REDACTED]',
  phone: '[CONTACT_REDACTED]',
  password: '[REDACTED]',
  role: 'admin',
  site: 'غرفة العمليات',
  projectId: '',
  status: 'absent',
  checkIn: null,
  checkOut: null,
  lat: null,
  lng: null,
  patrols: 0,
  score: 0,
};

const ACCOUNT_RESET_VERSION = 3;
const validRoles = new Set(['owner', 'admin', 'supervisor', 'guard']);
const list = value => Array.isArray(value) ? value : [];

const resetPresence = (user, template) => {
  Object.assign(user, {
    ...template,
    ...user,
    id: user.id || template.id,
    role: normalizeRole(user.role || template.role),
    projectId: user.projectId ?? '',
    status: user.status || 'absent',
    checkIn: user.checkIn ?? null,
    checkOut: user.checkOut ?? null,
    checkInAt: user.checkInAt ?? null,
    checkOutAt: user.checkOutAt ?? null,
    lat: user.lat ?? null,
    lng: user.lng ?? null,
    patrols: Number.isFinite(user.patrols) ? user.patrols : 0,
    score: Number.isFinite(user.score) ? user.score : 0,
  });
  return user;
};

function ensureAccount(state, template, matcher) {
  const existing = list(state.users).find(matcher);
  if (existing) {
    resetPresence(existing, template);
    return existing;
  }
  const account = { ...template };
  state.users.push(account);
  return account;
}

export function ensureOperationalAccounts(state) {
  if (!state) return false;
  if (!Array.isArray(state.users)) state.users = [];
  let changed = false;

  // Older X31 builds used this marker to reset demo accounts. Never replace
  // an existing user list during migration because it may contain live data.
  if (state.accountResetVersion !== ACCOUNT_RESET_VERSION) {
    state.accountResetVersion = ACCOUNT_RESET_VERSION;
    changed = true;
  }
  const before = state.users.length;
  ensureAccount(state, DEFAULT_OWNER, user => user.id === DEFAULT_OWNER.id || user.phone === DEFAULT_OWNER.phone || normalizeRole(user.role) === 'owner');
  ensureAccount(state, DEFAULT_ADMIN, user => user.id === DEFAULT_ADMIN.id || user.phone === DEFAULT_ADMIN.phone || normalizeRole(user.role) === 'admin');
  changed = changed || state.users.length !== before;

  state.users.forEach(user => {
    const normalized = normalizeRole(user.role);
    if (validRoles.has(normalized) && user.role !== normalized) {
      user.role = normalized;
      changed = true;
    } else if (!validRoles.has(normalized)) {
      user.role = 'guard';
      changed = true;
    }
    if (!user.username && user.phone) {
      user.username = user.phone;
      changed = true;
    }
  });
  return changed;
}

export function ensureAdminAccount(state) {
  return ensureOperationalAccounts(state);
}

export const defaultOwnerCredentials = {
  phone: DEFAULT_OWNER.phone,
  password: DEFAULT_OWNER.password,
};

export const defaultAdminCredentials = {
  phone: DEFAULT_ADMIN.phone,
  password: DEFAULT_ADMIN.password,
};
