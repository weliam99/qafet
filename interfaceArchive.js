const PROJECT_FILES = [
  'index.html',
  'styles.css',
  'sectionAdmin.css',
  'adminConsole.css',
  'fieldOps.css',
  'operationsEnhancements.css',
  'dashcam.css',
  'backupTools.css',
  'qualityLayer.css',
  'sessionGuard.css',
  'x10Core.css',
  'x20Core.css',
  'x30Core.css',
  'patrolMonitor.css',
  'mapMonitor.css',
  'main.js',
  'stateStorage.js',
  'accessControls.js',
  'adminBootstrap.js',
  'adminConsole.js',
  'adminNavigation.js',
  'assistant.js',
  'attendance.js',
  'cameraCapture.js',
  'dashcam.js',
  'fieldOps.js',
  'mapView.js',
  'patrolAdmin.js',
  'patrolMonitor.js',
  'patrolPhotos.js',
  'people.js',
  'qualityLayer.js',
  'reportsAnalytics.js',
  'roleAccess.js',
  'sessionGuard.js',
  'shifts.js',
  'workspace.js',
  'x10Core.js',
  'x20Core.js',
  'x30Core.js',
  'backup.html',
  'backup.css',
  'backup.js',
  'backupTools.js',
  'locales/ar.json',
  'miniapp.i18n.json',
  'interfaceArchive.js',
];

const TEXT_FILE = /\.(?:html?|css|js|json|md|txt)$/i;
const stamp = () => new Date().toISOString().slice(0, 10);

const redact = (value) => value
  .replace(/(\b(?:password|passcode|secret|apiKey|api_key|token|clientSecret|accessToken)\b\s*[:=]\s*['"`])[^'"`]*(['"`])/gi, '$1[REDACTED]$2')
  .replace(/\b(?:\+?966|0)5\d{8}\b/g, '[CONTACT_REDACTED]')
  .replace(/[PASSWORD_REDACTED]/g, '[PASSWORD_REDACTED]');

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
};

const readFile = async (path) => {
  if (path === 'index.html') {
    return { path, text: redact(`<!doctype html>\n${document.documentElement.outerHTML}`) };
  }
  const response = await fetch(new URL(path, document.baseURI), {
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { Accept: '*/*' },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (!TEXT_FILE.test(path)) return { path, binary: await response.arrayBuffer() };
  return { path, text: redact(await response.text()) };
};

const readme = (included, skipped, dependencies) => `# الفرسان ((قافطــ)) — حزمة واجهة آمنة

هذه الحزمة تضم آخر ملفات الواجهة المنشورة للتنزيل والمراجعة.

## قواعد الأمان
- تم استبعاد بيانات التشغيل والتخزين وقواعد البيانات وملفات النسخ JSON.
- تم تنقية كلمات المرور التجريبية وأرقام الاتصال والمفاتيح والرموز السرية.
- لا توجد ملفات خادم مستقلة في المشروع الحالي؛ التطبيق يعمل كواجهة متصفح تعتمد على خدمات المنصة.
- الشعارات الخارجية بقيت كروابط فقط، ولا توجد أصول محلية حساسة داخل الحزمة.

## الملفات المدرجة
${included.map((path) => `- ${path}`).join('\n') || '- لا توجد ملفات'}

## الملفات التي تعذر إدراجها
${skipped.map((item) => `- ${item.path}: ${item.reason}`).join('\n') || '- لا يوجد'}

## التبعيات الخارجية
${dependencies.map((url) => `- ${url}`).join('\n') || '- لا توجد'}

تاريخ الإنشاء: ${new Date().toISOString()}
`;

export async function downloadInterfaceArchive({ t, setStatus, setBusy }) {
  if (!window.JSZip) {
    setStatus(t('messages.error'), true);
    return;
  }
  setBusy(true);
  setStatus(t('common.loading'));
  try {
    const archive = new window.JSZip();
    const included = [];
    const skipped = [];
    const dependencies = new Set();

    for (const path of PROJECT_FILES) {
      try {
        setStatus(`${t('common.loading')} · ${path}`);
        const file = await readFile(path);
        if (file.binary) {
          archive.file(file.path, file.binary);
        } else {
          (file.text.match(/https?:\/\/[^\s"'<>]+/g) || [])
            .forEach((url) => dependencies.add(url.replace(/[),.;]+$/g, '')));
          archive.file(file.path, file.text);
        }
        included.push(path);
      } catch (error) {
        skipped.push({ path, reason: String(error?.message || 'تعذر القراءة') });
      }
    }

    if (!included.length) throw new Error('NO_FILES');
    const manifest = {
      format: 'marsad-alfursan-safe-interface-export',
      version: 1,
      exportedAt: new Date().toISOString(),
      includedFiles: included,
      skippedFiles: skipped,
      excluded: ['runtime storage', 'operational data', 'passwords', 'contact numbers', 'API keys', 'tokens', 'secrets'],
      externalDependencies: [...dependencies].sort(),
    };
    archive.file('SAFE-EXPORT-README.md', readme(included, skipped, [...dependencies].sort()));
    archive.file('interface-manifest.json', JSON.stringify(manifest, null, 2));
    archive.file('SERVER-AND-DEPENDENCY-INVENTORY.md', '# حالة الخادم\n\nلا توجد ملفات خادم مستقلة في المشروع الحالي. التطبيق واجهة متصفح، وتخزين المنصة لا يُصدّر ضمن هذه الحزمة.');

    const blob = await archive.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    downloadBlob(blob, `marsad-alfursan-safe-interface-${stamp()}.zip`);
    setStatus(t('archive.backupReady'));
  } catch (error) {
    console.error('Interface archive failed', error);
    setStatus(error.message === 'NO_FILES' ? t('messages.error') : t('messages.error'), true);
  } finally {
    setBusy(false);
  }
}
