let started = false;
let active = false;
let locked = false;
let idleTimer = null;
let warningTimer = null;
let warningShown = false;
let context = {};

const IDLE_LIMIT = 25 * 60 * 1000;
const WARNING_BEFORE = 2 * 60 * 1000;
const node = selector => document.querySelector(selector);
const tr = (key, values) => context.t?.(key, values) || key;

function clearTimers() {
  window.clearTimeout(idleTimer);
  window.clearTimeout(warningTimer);
  idleTimer = null;
  warningTimer = null;
}

function setMessage(key, values) {
  const message = node('#sessionLockMessage');
  if (message) message.textContent = tr(key, values);
}

function setError(key) {
  const error = node('#sessionLockError');
  if (!error) return;
  error.textContent = tr(key);
  error.hidden = false;
}

function showLock(reason = 'session.lockedMessage') {
  if (!active || locked) return;
  locked = true;
  clearTimers();
  const overlay = node('#sessionLock');
  if (!overlay) return;
  setMessage(reason);
  const input = node('#sessionLockPassword');
  const error = node('#sessionLockError');
  if (error) error.hidden = true;
  overlay.hidden = false;
  overlay.setAttribute('aria-hidden', 'false');
  window.setTimeout(() => input?.focus(), 60);
  context.onLock?.();
}

function armTimers() {
  clearTimers();
  if (!active || locked) return;
  warningShown = false;
  warningTimer = window.setTimeout(() => {
    warningShown = true;
    context.onWarning?.();
  }, Math.max(1000, IDLE_LIMIT - WARNING_BEFORE));
  idleTimer = window.setTimeout(() => showLock(), IDLE_LIMIT);
}

function registerActivity() {
  if (!active || locked) return;
  if (warningShown) context.onWarningClear?.();
  armTimers();
}

async function unlock(event) {
  event?.preventDefault();
  const input = node('#sessionLockPassword');
  const password = input?.value?.trim() || '';
  const account = context.getAccount?.() || {};
  if (!password || (account.password && account.password !== password)) {
    setError('session.invalidPassword');
    if (input) input.value = '';
    input?.focus();
    return;
  }
  locked = false;
  warningShown = false;
  if (input) input.value = '';
  const error = node('#sessionLockError');
  if (error) error.hidden = true;
  const overlay = node('#sessionLock');
  if (overlay) overlay.hidden = true;
  context.onUnlock?.();
  armTimers();
}

export function initSessionGuard(options = {}) {
  if (started) return;
  started = true;
  context = options;
  node('#sessionLockForm')?.addEventListener('submit', unlock);
  ['pointerdown', 'keydown', 'touchstart'].forEach(eventName => {
    document.addEventListener(eventName, registerActivity, { passive: true });
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    if (active && !locked) armTimers();
  });
}

export function sessionWorkspaceEntered() {
  active = true;
  locked = false;
  node('#sessionLock')?.setAttribute('aria-hidden', 'true');
  armTimers();
}

export function sessionWorkspaceExited() {
  active = false;
  locked = false;
  clearTimers();
  const overlay = node('#sessionLock');
  if (overlay) {
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
  }
  const warning = node('#sessionLockWarning');
  if (warning) warning.hidden = true;
}

export function sessionExtend() {
  if (!active || locked) return;
  registerActivity();
}

export function sessionIsLocked() {
  return locked;
}
