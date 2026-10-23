import {isAdminRole} from './roleAccess.js';

const list = value => Array.isArray(value) ? value : [];

export function currentAccount(state) {
  return list(state?.users).find(user => user.id === state?.currentUser?.id) || state?.currentUser || {};
}

export function visibleRequestsFor(state, account = currentAccount(state)) {
  const requests = list(state?.requests);
  if (isAdminRole(account.role)) return requests;
  if (account.role === 'supervisor') {
    return requests.filter(request => request.supervisorId === account.id || request.byId === account.id || (!request.byId && request.by === account.name));
  }
  return requests.filter(request => request.byId === account.id || request.by === account.name);
}

export function visibleWarningsFor(state, account = currentAccount(state)) {
  const warnings = list(state?.warnings);
  if (isAdminRole(account.role)) return warnings;
  if (account.role === 'supervisor') return warnings.filter(warning => warning.supervisorId === account.id || !warning.supervisorId);
  return warnings.filter(warning => warning.guardId === account.id);
}

export function warningRecipientsFor(state, account = currentAccount(state)) {
  return list(state?.users).filter(user => user.role === 'guard' && (isAdminRole(account.role) || user.supervisorId === account.id));
}
