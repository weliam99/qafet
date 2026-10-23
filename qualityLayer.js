let started = false;
let active = false;
let lastSavedAt = null;
let timer = null;

const node = selector => document.querySelector(selector);
const translate = (t, key, values) => t?.(key, values) || key;

function paint({ t, stateReady = false } = {}) {
  const bar = node('#systemHealthBar');
  if (!bar) return;
  const online = navigator.onLine !== false;
  const dot = node('#systemHealthDot');
  const title = node('#systemHealthText');
  const detail = node('#systemHealthDetail');
  bar.classList.toggle('is-offline', !online);
  dot?.classList.toggle('is-offline', !online);
  if (title) title.textContent = translate(t, online ? 'quality.online' : 'quality.offline');
  if (detail) {
    if (!online) detail.textContent = translate(t, 'quality.offlineHint');
    else if (!stateReady) detail.textContent = translate(t, 'quality.starting');
    else if (lastSavedAt) detail.textContent = translate(t, 'quality.lastSaved', { time: lastSavedAt });
    else detail.textContent = translate(t, 'quality.storageReady');
  }
}

function currentTime() {
  return new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
}

export function initQualityLayer({ t, getState, getVersion }) {
  if (started) return;
  started = true;
  const version = node('#systemHealthVersion');
  if (version) version.textContent = getVersion?.() || '';
  const refresh = node('#systemHealthRefresh');
  refresh?.addEventListener('click', () => paint({ t, stateReady: Boolean(getState?.()) }));
  window.addEventListener('online', () => paint({ t, stateReady: Boolean(getState?.()) }));
  window.addEventListener('offline', () => paint({ t, stateReady: Boolean(getState?.()) }));
  window.addEventListener('unhandledrejection', () => {
    if (active) {
      const detail = node('#systemHealthDetail');
      if (detail) detail.textContent = translate(t, 'quality.unexpectedError');
    }
  });
  window.addEventListener('error', event => {
    if (!active || event?.message === 'ResizeObserver loop completed with undelivered notifications.') return;
    const detail = node('#systemHealthDetail');
    if (detail) detail.textContent = translate(t, 'quality.unexpectedError');
  });
  timer = window.setInterval(() => paint({ t, stateReady: Boolean(getState?.()) }), 30000);
  paint({ t, stateReady: Boolean(getState?.()) });
}

export function qualityWorkspaceEntered({ t, getState }) {
  active = true;
  const bar = node('#systemHealthBar');
  if (bar) bar.hidden = false;
  paint({ t, stateReady: Boolean(getState?.()) });
}

export function qualityWorkspaceExited() {
  active = false;
  const bar = node('#systemHealthBar');
  if (bar) bar.hidden = true;
}

export function qualityStateSaved({ t, getState }) {
  lastSavedAt = currentTime();
  paint({ t, stateReady: Boolean(getState?.()) });
}

export function stopQualityLayer() {
  if (timer) window.clearInterval(timer);
  timer = null;
}
