const filesToArchive = [
  'index.html',
  'styles.css',
  'sectionAdmin.css',
  'adminConsole.css',
  'fieldOps.css',
  'operationsEnhancements.css',
  'dashcam.css',
  'patrolMonitor.css',
  'mapMonitor.css',
  'main.js',
  'stateStorage.js',
  'accessControls.js',
  'adminBootstrap.js',
  'adminConsole.js',
  'fieldOps.js',
  'patrolAdmin.js',
  'patrolMonitor.js',
  'people.js',
  'roleAccess.js',
  'shifts.js',
  'workspace.js',
  'dashcam.js',
  'reportsAnalytics.js',
  'cameraCapture.js',
  'mapView.js',
  'attendance.js',
  'patrolPhotos.js',
  'adminNavigation.js',
  'locales/ar.json',
  'miniapp.i18n.json',
  'backup.html',
  'backup.css',
  'backupTools.css',
  'backupTools.js',
  'interfaceArchive.js',
  'qualityLayer.css',
  'qualityLayer.js',
  'sessionGuard.css',
  'sessionGuard.js',
  'x10Core.css',
  'x10Core.js',
  'x20Core.css',
  'x20Core.js',
  'x30Core.css',
  'x30Core.js',
  'assistant.js',
  'backup.js',
];

// Source snapshot used when the protected preview returns HTTP 403 for index.html.
// It is sanitized before being placed in the downloadable package.
const INDEX_SOURCE_HTML = String.raw`<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="theme-color" content="#101820">
  <title>الفرسان ((قافطــ))</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css">
  <link rel="stylesheet" href="styles.css">
  <link rel="stylesheet" href="sectionAdmin.css">
  <link rel="stylesheet" href="adminConsole.css">
  <link rel="stylesheet" href="fieldOps.css">
  <link rel="stylesheet" href="operationsEnhancements.css">
  <link rel="stylesheet" href="dashcam.css">
  <link rel="stylesheet" href="backupTools.css">
  <link rel="stylesheet" href="qualityLayer.css">
  <link rel="stylesheet" href="sessionGuard.css">
  <link rel="stylesheet" href="x10Core.css">
  <link rel="stylesheet" href="x20Core.css">
  <link rel="stylesheet" href="x30Core.css">
</head>
<body>
  <div class="app-shell" id="appShell">
    <section class="auth-screen" id="authScreen">
      <div class="auth-visual">
        <div class="brand-mark large"><img src="https://alfursan.me/alfursan-first-photo-logo.png" alt="شعار الفرسان الأولى"></div>
        <p class="eyebrow" data-i18n="brand.eyebrow"></p>
        <h1 data-i18n="auth.title"></h1>
        <p class="auth-subtitle" data-i18n="auth.subtitle"></p>
        <div class="security-orbit"><i></i><i></i><i></i><b>24<br><small>ساعة</small></b></div>
      </div>
      <div class="auth-panel">
        <div class="mobile-brand"><div class="brand-mark"><img src="https://alfursan.me/alfursan-first-photo-logo-small.png" alt="شعار الفرسان الأولى"></div><span data-i18n="brand.name"></span></div>
        <form id="loginForm" class="auth-form">
          <div class="field"><label for="loginPhone" data-i18n="auth.phone"></label><input id="loginPhone" inputmode="tel" autocomplete="tel" data-i18n-placeholder="auth.phonePlaceholder" required></div>
          <div class="field"><label for="loginPassword" data-i18n="auth.password"></label><input id="loginPassword" type="password" data-i18n-placeholder="auth.passwordPlaceholder" required></div>
          <label class="check-row"><input id="rememberLogin" type="checkbox"><span data-i18n="auth.remember"></span></label>
          <button class="btn btn-primary btn-wide" type="submit"><span data-i18n="auth.login"></span><span class="btn-arrow">←</span></button>
          <button class="text-button" id="forgotPassword" type="button" data-i18n="auth.forgot"></button>
          <p class="form-error" id="loginError" role="alert" hidden></p>
        </form>
      </div>
    </section>
    <div class="maintenance-screen" id="maintenanceScreen" hidden><div class="maintenance-icon">◼</div><h2 data-i18n="common.maintenance"></h2><p data-i18n="messages.maintenanceOn"></p><button class="btn btn-ghost" id="maintenanceLogin" data-i18n="common.back"></button></div>
    <section class="session-lock" id="sessionLock" hidden aria-hidden="true"><div class="session-lock-card" role="dialog" aria-modal="true" aria-labelledby="sessionLockTitle"><div class="session-lock-mark" aria-hidden="true">◈</div><h2 id="sessionLockTitle" data-i18n="session.title"></h2><p id="sessionLockMessage"></p><form id="sessionLockForm"><label for="sessionLockPassword" data-i18n="session.password"></label><input id="sessionLockPassword" type="password" autocomplete="current-password" data-i18n-placeholder="session.passwordPlaceholder" required><p class="session-lock-error" id="sessionLockError" role="alert" hidden></p><button class="btn btn-primary" type="submit" data-i18n="session.unlock"></button></form></div></section>
    <div class="session-lock-warning" id="sessionLockWarning" hidden role="status" aria-live="polite" data-i18n="session.warning"></div>
    <section class="workspace" id="workspace" hidden>
      <aside class="sidebar" id="sidebar">
        <div class="side-brand"><div class="brand-mark"><img src="https://alfursan.me/alfursan-first-photo-logo-small.png" alt="شعار الفرسان الأولى"></div><div><strong data-i18n="brand.name"></strong><small data-i18n="brand.eyebrow"></small></div><button class="icon-btn sidebar-close" id="closeSidebar" aria-label="إغلاق القائمة">×</button></div>
        <div class="current-user"><div class="avatar" id="userAvatar">م</div><div><strong id="userName"></strong><small id="userRole"></small></div><span class="online-dot"></span></div>
        <nav class="main-nav" aria-label="التنقل الرئيسي" id="mainNav">
          <div class="nav-label" data-i18n="dashboard.title"></div>
          <button class="nav-item active" data-view="overview"><span class="nav-icon">⌂</span><span data-i18n="nav.overview"></span></button>
          <button class="nav-item" data-view="map"><span class="nav-icon">⌖</span><span data-i18n="nav.map"></span><em class="nav-live" data-i18n="dashboard.live"></em></button>
          <button class="nav-item" data-view="attendance"><span class="nav-icon">◷</span><span data-i18n="nav.attendance"></span></button>
          <button class="nav-item" data-view="patrols"><span class="nav-icon">✦</span><span data-i18n="nav.patrols"></span></button>
          <button class="nav-item" data-view="dashcam"><span class="nav-icon">▣</span><span data-i18n="nav.dashcam"></span><em class="nav-live" data-i18n="dashboard.live"></em></button>
          <button class="nav-item supervisor-only" data-view="prep"><span class="nav-icon">▦</span><span data-i18n="nav.prep"></span></button>
          <div class="nav-label second" data-i18n="nav.reports"></div>
          <button class="nav-item" data-view="reports"><span class="nav-icon">!</span><span data-i18n="nav.reports"></span><b class="nav-count" id="reportCount">3</b></button>
          <button class="nav-item" data-view="requests"><span class="nav-icon">↗</span><span data-i18n="nav.requests"></span></button>
          <button class="nav-item manager-only" data-view="people"><span class="nav-icon">♙</span><span data-i18n="nav.people"></span></button>
          <button class="nav-item manager-only" data-view="archive"><span class="nav-icon">▤</span><span data-i18n="nav.archive"></span></button>
          <button class="nav-item manager-only" data-view="settings"><span class="nav-icon">⚙</span><span data-i18n="nav.settings"></span></button>
        </nav>
        <div class="side-footer"><button class="support-link" id="contactButton" data-i18n="common.contact"></button><div class="system-status"><span class="online-dot"></span><span data-i18n="common.online"></span><small id="versionLabel"></small></div><button class="logout-link" id="logoutButton" data-i18n="common.logout"></button></div>
      </aside>
      <div class="main-area">
        <header class="topbar"><button class="icon-btn menu-toggle" id="openSidebar" aria-label="فتح القائمة">☰</button><div class="topbar-title"><span class="crumb" data-i18n="brand.name"></span><span class="crumb-sep">/</span><strong id="topbarViewTitle"></strong></div><div class="topbar-actions"><button class="icon-btn notification-trigger" id="notificationButton" aria-label="التنبيهات">♧<b id="notificationDot"></b></button><button class="user-chip" id="roleSwitch"><span class="avatar small" id="topAvatar">م</span><span id="topUserName"></span><span class="chevron">⌄</span></button><div class="role-menu" id="roleMenu" hidden><button data-switch-role="admin" data-i18n="auth.admin"></button><button data-switch-role="supervisor" data-i18n="auth.supervisor"></button><button data-switch-role="guard" data-i18n="auth.guard"></button></div></div></header>
        <div class="system-health-bar" id="systemHealthBar" hidden role="status" aria-live="polite"><span class="health-dot" id="systemHealthDot"></span><strong id="systemHealthText"></strong><small id="systemHealthDetail"></small><span class="health-version" id="systemHealthVersion"></span><button id="systemHealthRefresh" type="button" data-i18n="quality.refresh"></button></div>
        <main class="content" id="content">
          <section class="view" id="view-overview"></section>
          <section class="view" id="view-map" hidden></section>
          <section class="view" id="view-attendance" hidden></section>
          <section class="view" id="view-patrols" hidden></section>
          <section class="view" id="view-dashcam" hidden></section>
          <section class="view" id="view-prep" hidden></section>
          <section class="view" id="view-reports" hidden></section>
          <section class="view" id="view-requests" hidden></section>
          <section class="view" id="view-people" hidden></section>
          <section class="view" id="view-archive" hidden></section>
          <section class="view" id="view-settings" hidden></section>
        </main>
        <footer class="app-footer"><div class="footer-owner"><span data-i18n="common.owner"></span> <strong data-i18n="common.ownerName"></strong></div><span class="footer-separator">•</span><div><span data-i18n="common.version"></span> <strong id="footerVersion"></strong></div><div class="footer-contact"><span data-i18n="common.contact"></span><a class="footer-contact-link" href="tel:[CONTACT_REDACTED]"><span data-i18n="common.call"></span> <bdi>[CONTACT_REDACTED]</bdi></a><a class="footer-contact-link whatsapp-link" href="https://api.whatsapp.com/send?phone=[CONTACT_REDACTED]" target="_blank" rel="noopener noreferrer"><span data-i18n="common.whatsapp"></span> <bdi>[CONTACT_REDACTED]</bdi></a></div><a class="footer-contact-link" id="footerBackupLink" href="#archive"><span data-i18n="archive.backup"></span></a></footer>
      </div>
    </section>
    <div class="toast" id="toast" role="status" aria-live="polite"></div>
    <div class="notifications-panel" id="notificationsPanel" hidden><div class="panel-head"><strong data-i18n="notifications.title"></strong><button class="icon-btn" id="closeNotifications">×</button></div><div id="notificationsList"></div><button class="text-button" id="markNotifications" data-i18n="notifications.read"></button></div>
    <div class="assistant-widget" id="assistantWidget"><button class="assistant-fab" id="assistantToggle" aria-label="المساعد الذكي">✦</button><div class="assistant-panel" id="assistantPanel" hidden><div class="assistant-head"><div><strong data-i18n="assistant.title"></strong><small data-i18n="assistant.subtitle"></small></div><button class="icon-btn" id="closeAssistant">×</button></div><div class="assistant-messages" id="assistantMessages"></div><form class="assistant-form" id="assistantForm"><input id="assistantInput" data-i18n-placeholder="assistant.placeholder"><button type="submit" data-i18n="assistant.ask"></button></form></div></div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
  <script type="module" src="main.js"></script>
</body>
</html>`;

const STORE_KEY = 'alfursan_state_v2';
const LEGACY_KEYS = ['alfursan_state_v1', 'marsad_alfursan_state', 'marsad_state'];
const BACKUP_FORMAT = 'marsad-alfursan-data-backup';
const t = (key) => window.miniappI18n?.t?.(key) ?? key;
const fileList = document.querySelector('#fileList');
const downloadButton = document.querySelector('#downloadBackup');
const interfaceArchiveButton = document.querySelector('#downloadInterfaceArchive');
const indexSourceButton = document.querySelector('#downloadIndexSource');
const dataButton = document.querySelector('#downloadDataBackup');
const restoreButton = document.querySelector('#restoreDataBackup');
const restoreInput = document.querySelector('#restoreDataFile');
const status = document.querySelector('#backupStatus');

const filesFragment = document.createDocumentFragment();
filesToArchive.forEach((filePath) => {
  const item = document.createElement('li');
  item.textContent = filePath;
  filesFragment.appendChild(item);
});
fileList?.appendChild(filesFragment);

const setStatus = (message, isError = false) => {
  if (!status) return;
  status.textContent = message;
  status.classList.toggle('error', isError);
};

const setBusy = (busy) => {
  [interfaceArchiveButton, indexSourceButton, downloadButton, dataButton, restoreButton].forEach((button) => {
    if (button) button.disabled = busy;
  });
};

const wait = (duration) => new Promise((resolve) => window.setTimeout(resolve, duration));

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
};

const dateStamp = () => new Date().toISOString().slice(0, 10);

const readWithFetch = async (filePath, fileUrl, credentials) => {
  const response = await fetch(fileUrl, {
    cache: 'no-store',
    credentials,
    redirect: 'follow',
    headers: { Accept: '*/*' },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return { filePath, content: await response.arrayBuffer() };
};

const readProjectFile = async (filePath) => {
  if (filePath === 'index.html' && INDEX_SOURCE_HTML) {
    return { filePath, content: new TextEncoder().encode(INDEX_SOURCE_HTML).buffer, source: 'embedded' };
  }
  const fileUrl = new URL(filePath, document.baseURI).href;
  let lastError;
  for (const credentials of ['same-origin', 'omit']) {
    try {
      return await readWithFetch(filePath, fileUrl, credentials);
    } catch (error) {
      lastError = error;
      await wait(80);
    }
  }
  const problem = new Error(`تعذر الوصول إلى ${filePath}`);
  problem.filePath = filePath;
  problem.cause = lastError;
  throw problem;
};

const storage = () => window.miniappsAI?.storage;

const readStoredState = async () => {
  if (!storage()?.getItem) throw new Error('STORAGE_UNAVAILABLE');
  const keys = [STORE_KEY, ...LEGACY_KEYS];
  for (const key of keys) {
    try {
      const raw = await storage().getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return { state: parsed, key };
      }
    } catch (error) {
      console.warn(`تعذر قراءة ${key}`, error);
    }
  }
  throw new Error('NO_DATA');
};

const buildPayload = (state, sourceKey) => ({
  format: BACKUP_FORMAT,
  version: 2,
  exportedAt: new Date().toISOString(),
  sourceKey,
  state,
});

const downloadDataBackup = async () => {
  setBusy(true);
  setStatus('جارٍ تجهيز بيانات التشغيل...');
  try {
    const stored = await readStoredState();
    const payload = buildPayload(stored.state, stored.key);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    downloadBlob(blob, `marsad-alfursan-data-${dateStamp()}.json`);
    setStatus('تم تنزيل بيانات التشغيل بنجاح. احفظ الملف في مكان آمن.');
  } catch (error) {
    console.error('Data backup failed', error);
    const message = error.message === 'NO_DATA'
      ? 'لا توجد بيانات محفوظة بعد. افتح النظام وسجّل الدخول أولاً.'
      : error.message === 'STORAGE_UNAVAILABLE'
        ? 'هذه صفحة ملفات مستقلة ولا تصل إلى تخزين النظام. افتح النظام واستخدم الأرشيف والنسخ الاحتياطي من داخله.'
        : 'تعذر قراءة بيانات التشغيل. أعد تحميل النظام ثم حاول مرة أخرى.';
    setStatus(message, true);
  } finally {
    setBusy(false);
  }
};

const textFilePattern = /\.(?:html?|css|js|json|md|txt)$/i;
const redactInterfaceText = (text) => text
  .replace(/(\b(?:password|passcode|secret|apiKey|api_key|token|clientSecret|accessToken)\b\s*[:=]\s*['"`])[^'"`]*(['"`])/gi, '$1[REDACTED]$2')
  .replace(/\b(?:\+?966|0)5\d{8}\b/g, '[CONTACT_REDACTED]')
  .replace(/[PASSWORD_REDACTED]/g, '[PASSWORD_REDACTED]');

const decodeArchiveContent = (buffer) => new TextDecoder().decode(buffer || new ArrayBuffer(0));

const interfaceReadme = (externalDependencies, skippedFiles = []) => `# Marsad Al-Fursan — Safe Interface Export

This package contains the current interface source, styles, UI modules, localization, and configuration needed to review or migrate the dashboard appearance.

## Safe export rules
- Runtime state, stored records, backup JSON, passwords, contact numbers, API keys, tokens, and secrets are excluded or redacted.
- The exported files are a visual and structural interface package; replace redacted demo credentials before connecting another backend.
- No database or platform storage contents are included.

## Preview
- Open index.html for the full dashboard preview.
- Dashboard route: index.html#overview
- Patrols and live camera route: index.html#patrols
- For desktop matching, use a viewport at least 1200px wide.
- For mobile matching, use a viewport around 390px wide and refresh index.html.

## External dependencies
${externalDependencies.map((url) => `- ${url}`).join('\n') || '- None detected'}

## Files not included
${skippedFiles.map((item) => `- ${item.path}: ${item.reason}`).join('\n') || '- None'}

Generated: ${new Date().toISOString()}
`;

const serverStatus = `# Server and dependency inventory

## Server status
No independent server, backend, database, container, or deployment source files are present in this workspace.
The current project is a browser-side miniapp. Its runtime storage and platform services are injected by the host environment and are intentionally not exported.

## Included in this ZIP
- The current HTML entry point and backup page.
- Current CSS, JavaScript modules, Arabic localization, X10/X20 modules, camera and map integrations.
- Sanitized interface documentation and a generated manifest.
- No local asset directory exists in this workspace; brand images are referenced as external URLs and are listed in the manifest.

## External runtime dependencies
- Leaflet 1.9.4: https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css and https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js
- jsPDF 2.5.1: https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js
- JSZip 3.10.1: https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js (in-app and backup page export)
- Google Fonts: IBM Plex Sans Arabic and Space Grotesk

If a deployable backend is required, provide or add its source separately; this archive does not invent server files.

Generated: ${new Date().toISOString()}
`;

const downloadIndexSource = async () => {
  setBusy(true);
  setStatus('جارٍ تجهيز ملف index.html من المصدر المحلي...');
  try {
    const safeHtml = redactInterfaceText(INDEX_SOURCE_HTML);
    const blob = new Blob([safeHtml], { type: 'text/html;charset=utf-8' });
    downloadBlob(blob, `marsad-alfursan-index-${dateStamp()}.html`);
    setStatus('تم تنزيل ملف index.html من المصدر المحلي بعد تنقيته.');
  } catch (error) {
    console.error('Index source download failed', error);
    setStatus('تعذر تنزيل ملف index.html. أعد المحاولة من صفحة الأرشيف.', true);
  } finally {
    setBusy(false);
  }
};

const downloadSafeInterfaceArchive = async () => {
  if (!window.JSZip) {
    setStatus('أداة ZIP غير متاحة. أعد تحميل الصفحة ثم حاول مرة أخرى.', true);
    return;
  }
  setBusy(true);
  setStatus(`جارٍ تجهيز حزمة الواجهة الآمنة (${filesToArchive.length} ملفاً)...`);
  try {
    const archive = new window.JSZip();
    const externalDependencies = new Set();
    const includedFiles = [];
    const skippedFiles = [];
    for (const filePath of filesToArchive) {
      setStatus(`جارٍ تنظيف وإضافة الملف: ${filePath}`);
      try {
        const response = await readProjectFile(filePath);
        if (!textFilePattern.test(filePath)) {
          archive.file(response.filePath, response.content);
          includedFiles.push(response.filePath);
          continue;
        }
        const rawText = decodeArchiveContent(response.content);
        const urls = rawText.match(/https?:\/\/[^\s"'<>]+/g) || [];
        urls.forEach((url) => externalDependencies.add(url.replace(/[),.;]+$/g, '')));
        archive.file(response.filePath, redactInterfaceText(rawText));
        includedFiles.push(response.filePath);
      } catch (error) {
        const cause = String(error?.cause?.message || error?.message || 'تعذر القراءة');
        skippedFiles.push({ path: filePath, reason: cause });
        console.warn('Safe interface file skipped', filePath, error);
      }
    }
    if (!includedFiles.length) throw new Error('NO_INTERFACE_FILES');
    const manifest = {
      format: 'marsad-alfursan-safe-interface-export',
      version: 1,
      exportedAt: new Date().toISOString(),
      includedFiles,
      skippedFiles,
      excluded: ['runtime storage', 'database records', 'backup JSON', 'passwords', 'contact numbers', 'API keys', 'tokens', 'secrets'],
      externalDependencies: [...externalDependencies].sort(),
      preview: { entry: 'index.html', desktopViewport: '>=1200px', mobileViewport: '390px' },
    };
    archive.file('SAFE-EXPORT-README.md', interfaceReadme(manifest.externalDependencies, skippedFiles));
    archive.file('interface-manifest.json', JSON.stringify(manifest, null, 2));
    archive.file('SERVER-AND-DEPENDENCY-INVENTORY.md', serverStatus);
    const blob = await archive.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    downloadBlob(blob, `marsad-alfursan-safe-interface-${dateStamp()}.zip`);
    setStatus(skippedFiles.length
      ? `تم إنشاء الحزمة وبدأ التنزيل، مع تعذر إدراج ${skippedFiles.length} ملف. راجع التقرير داخل ZIP.`
      : 'تم إنشاء حزمة الواجهة الآمنة وبدأ التنزيل.');
  } catch (error) {
    console.error('Safe interface archive failed', error);
    setStatus(error.message === 'NO_INTERFACE_FILES'
      ? 'تعذر الوصول إلى ملفات الواجهة من صفحة الأرشيف. افتح الصفحة من النسخة المنشورة ثم أعد المحاولة.'
      : 'تعذر إنشاء حزمة الواجهة الآمنة. أعد المحاولة من صفحة الأرشيف.', true);
  } finally {
    setBusy(false);
  }
};

const parseBackupFile = async (file) => {
  if (!file) throw new Error('NO_FILE');
  if (file.size > 5 * 1024 * 1024) throw new Error('FILE_TOO_LARGE');
  const text = await file.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error('INVALID_JSON');
  }
  const state = payload?.format === BACKUP_FORMAT ? payload.state : payload;
  if (!state || typeof state !== 'object' || Array.isArray(state)) throw new Error('INVALID_BACKUP');
  if (!Array.isArray(state.users) || !Array.isArray(state.sites)) throw new Error('INVALID_BACKUP');
  return state;
};

const restoreDataBackup = async () => {
  setBusy(true);
  setStatus('جارٍ فحص ملف البيانات...');
  try {
    const state = await parseBackupFile(restoreInput?.files?.[0]);
    if (!window.confirm(t('archive.restoreConfirm'))) {
      setStatus('تم إلغاء الاستعادة.');
      return;
    }
    if (!storage()?.setItem) throw new Error('STORAGE_UNAVAILABLE');
    await storage().setItem(STORE_KEY, JSON.stringify(state));
    if (restoreInput) restoreInput.value = '';
    setStatus('تمت استعادة البيانات بنجاح. افتح النظام أو أعد تحميله لرؤية البيانات.');
  } catch (error) {
    console.error('Data restore failed', error);
    const messages = {
      NO_FILE: 'اختر ملف JSON أولاً.',
      FILE_TOO_LARGE: 'حجم الملف أكبر من الحد المسموح به وهو 5 ميجابايت.',
      INVALID_JSON: 'الملف ليس بصيغة JSON صحيحة.',
      INVALID_BACKUP: 'الملف لا يبدو نسخة بيانات صالحة للفرسان ((قافطــ)).',
      STORAGE_UNAVAILABLE: 'هذه صفحة ملفات مستقلة ولا تصل إلى تخزين النظام. افتح النظام واستخدم الأرشيف والنسخ الاحتياطي من داخله.',
    };
    setStatus(messages[error.message] || 'تعذر استعادة النسخة. تحقق من الملف ثم حاول مرة أخرى.', true);
  } finally {
    setBusy(false);
  }
};

const downloadProjectArchive = async () => {
  // Keep the general project button safe as well: it exports the same redacted interface package.
  return downloadSafeInterfaceArchive();
};

interfaceArchiveButton?.addEventListener('click', downloadSafeInterfaceArchive);
indexSourceButton?.addEventListener('click', downloadIndexSource);
downloadButton?.addEventListener('click', downloadProjectArchive);
dataButton?.addEventListener('click', downloadDataBackup);
restoreButton?.addEventListener('click', restoreDataBackup);
