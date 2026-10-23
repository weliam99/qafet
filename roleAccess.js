const ALL_OPERATIONAL_VIEWS = ['overview', 'map', 'attendance', 'patrols', 'dashcam', 'prep', 'reports', 'requests', 'people', 'archive', 'settings'];

const ROLE_VIEWS = {
  owner: ALL_OPERATIONAL_VIEWS,
  admin: ALL_OPERATIONAL_VIEWS,
  supervisor: ['overview', 'map', 'attendance', 'patrols', 'dashcam', 'prep', 'reports', 'requests'],
  guard: ['overview', 'attendance', 'prep', 'patrols', 'dashcam', 'requests'],
};

export function normalizeRole(role = 'guard') {
  const value = String(role || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (['owner', 'مالك', 'المالك', 'مالك النظام', 'owner/admin'].includes(value)) return 'owner';
  if (['admin', 'administrator', 'manager', 'management', 'إدارة', 'الادارة', 'الإدارة', 'مدير النظام'].includes(value)) return 'admin';
  if (['supervisor', 'مشرف', 'مشرف الميدان', 'المشرف'].includes(value)) return 'supervisor';
  if (['guard', 'فرد ميداني', 'فرد', 'حارس', 'الحارس'].includes(value)) return 'guard';
  return value || 'guard';
}

export function isAdminRole(role) {
  const normalized = normalizeRole(role);
  return normalized === 'owner' || normalized === 'admin';
}

export function hasFullAccess(role) {
  return isAdminRole(role);
}

export function allowedViews(role = 'guard') {
  const normalized = normalizeRole(role);
  return hasFullAccess(normalized) ? ALL_OPERATIONAL_VIEWS : (ROLE_VIEWS[normalized] || ROLE_VIEWS.guard);
}

export function canAccessView(role, view) {
  return hasFullAccess(role) || allowedViews(role).includes(String(view || '').trim());
}

export function defaultViewForRole(role) {
  return hasFullAccess(role) ? 'overview' : normalizeRole(role) === 'guard' ? 'attendance' : 'overview';
}

export function roleNavVisibility(role, view) {
  return canAccessView(role, view);
}
