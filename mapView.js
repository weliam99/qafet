// Live map view: sites, geofences, people positions, patrol paths and the signed-in user's location.
// Dependencies come from main.js through `ctx` (modules never import main.js).

let liveMap = null;
let locationRefreshTimer = null;
const list = value => Array.isArray(value) ? value : [];
const hasPoint = point => Number.isFinite(Number(point?.lat)) && Number.isFinite(Number(point?.lng));
const toPoint = point => ({ lat: Number(point.lat), lng: Number(point.lng) });

function currentStoredPosition(state) {
  const user = list(state?.users).find(item => item.id === state.currentUser?.id);
  const fresh = user?.locationAt && Date.now() - Number(user.locationAt) < 120000;
  if (!fresh || !hasPoint(user)) return null;
  return toPoint(user);
}

function setLocationStatus(statusId, text, tone = 'warn') {
  const status = statusId ? document.querySelector(`#${statusId}`) : null;
  if (!status) return;
  status.textContent = text;
  status.className = `pill ${tone}`;
}

function drawCurrentLocation(map, position, accuracy, t) {
  if (!map || !position) return;
  if (map._currentLocationLayer) map.removeLayer(map._currentLocationLayer);
  const radius = Math.max(accuracy || 0, 12);
  const accuracyCircle = L.circle([position.lat, position.lng], {
    radius,
    color: '#dc675a',
    fillColor: '#dc675a',
    fillOpacity: .1,
    weight: 1,
  });
  const marker = L.circleMarker([position.lat, position.lng], {
    radius: 9,
    color: '#fffdfa',
    weight: 3,
    fillColor: '#dc675a',
    fillOpacity: 1,
  }).bindPopup(`<b>${t('map.you')}</b><br>${t('map.accuracy')}: ${Math.round(accuracy || 0)}m`);
  map._currentLocationLayer = L.layerGroup([accuracyCircle, marker]).addTo(map);
}

function locateUser({ map, state, t, statusId, pan = true } = {}) {
  if (!map || !navigator.geolocation) {
    setLocationStatus(statusId, t('map.locationUnsupported'), 'bad');
    return;
  }
  setLocationStatus(statusId, t('map.locating'), 'warn');
  navigator.geolocation.getCurrentPosition(position => {
    const coords = {
      lat: Number(position.coords.latitude),
      lng: Number(position.coords.longitude),
    };
    const user = list(state?.users).find(item => item.id === state.currentUser?.id);
    if (user) {
      user.lat = coords.lat;
      user.lng = coords.lng;
      user.locationAt = Date.now();
    }
    drawCurrentLocation(map, coords, position.coords.accuracy, t);
    if (pan) map.setView([coords.lat, coords.lng], Math.max(map.getZoom(), 17), { animate: true });
    setLocationStatus(statusId, `${t('map.locationFound')} · ${t('map.accuracy')}: ${Math.round(position.coords.accuracy || 0)}m`, 'good');
  }, error => {
    const message = error?.code === 1 ? t('map.locationDenied') : t('map.locationUnavailable');
    setLocationStatus(statusId, message, 'bad');
  }, { enableHighAccuracy: true, maximumAge: 10000, timeout: 12000 });
}

function patrolProgress(route, state) {
  const site = list(state.sites).find(item => item.id === route.siteId);
  const related = list(state.patrols)
    .filter(item => item.routeId === route.id || (site?.name && item.site === site.name))
    .sort((a, b) => String(b.createdAt || b.time || '').localeCompare(String(a.createdAt || a.time || '')));
  const latest = related[0];
  const total = Math.max(1, list(route.checkpoints).length || 4);
  const done = Math.min(total, Number(latest?.points || latest?.photoCount || 0));
  return { latest, total, done, related };
}

function routeColor(progress) {
  if (progress.latest?.status === 'completed') return '#55aa83';
  if (progress.latest) return '#c9a56a';
  return '#5b7280';
}

function drawPatrolPaths(map, state, esc, t) {
  list(state.patrolRoutes).forEach(route => {
    const progress = patrolProgress(route, state);
    const routePoints = list(route.path).filter(hasPoint);
    const trackPoints = list(progress.latest?.track || progress.latest?.path).filter(hasPoint);
    const points = trackPoints.length >= 2 ? trackPoints : routePoints;
    if (points.length < 2) return;
    const color = routeColor(progress);
    const line = L.polyline(points.map(point => [Number(point.lat), Number(point.lng)]), {
      color,
      weight: progress.latest?.status === 'completed' ? 5 : 4,
      opacity: .8,
      dashArray: progress.latest?.status === 'completed' ? undefined : '8 8',
    }).addTo(map);
    line.bindPopup(`<b>${esc(route.name || t('map.patrolRoute'))}</b><br>${esc(t('map.routeTrack'))}<br>${progress.done}/${progress.total} ${esc(t('map.checkpoints'))}`);
  });
}

export function initMapView(ctx, id = 'liveMap') {
  const { state, t, esc, roleName, CENTER, statusId } = ctx;
  const el = document.querySelector(`#${id}`);
  if (!el || typeof L === 'undefined') return null;
  if (locationRefreshTimer) {
    clearInterval(locationRefreshTimer);
    locationRefreshTimer = null;
  }
  if (el._leaflet_id) {
    el._leaflet_id = null;
    el.innerHTML = '';
  }
  const stored = currentStoredPosition(state);
  const start = stored || CENTER;
  const m = L.map(el, { zoomControl: false }).setView([start.lat, start.lng], stored ? 17 : 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(m);
  L.control.zoom({ position: 'bottomleft' }).addTo(m);

  list(state.sites).filter(hasPoint).forEach(site => {
    L.circle([site.lat, site.lng], { radius: Number(site.radius) || 0, color: '#c9a56a', fillColor: '#c9a56a', fillOpacity: .08, weight: 2 })
      .addTo(m)
      .bindPopup(`<b>${esc(site.name || t('common.unassigned'))}</b><br>${esc(t('map.geofences'))}: ${Number(site.radius) || 0}m`);
    L.marker([site.lat, site.lng], { icon: L.divIcon({ className: 'site-pin', html: '<span>⌖</span>', iconSize: [26, 26] }) })
      .addTo(m)
      .bindTooltip(esc(site.name || t('common.unassigned')));
  });

  list(state.users).filter(hasPoint).forEach(user => {
    const color = user.id === state.currentUser?.id ? '#dc675a' : '#37b6bd';
    const lastSeen = user.locationAt ? new Date(Number(user.locationAt)).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : t('map.unknownTime');
    L.circleMarker([Number(user.lat), Number(user.lng)], { radius: 7, color, fillColor: color, fillOpacity: 1 })
      .addTo(m)
      .bindPopup(`<b>${esc(user.name || t('common.unassigned'))}</b><br>${esc(roleName(user.role))}<br>${esc(user.status || t('common.offline'))}<br>${esc(t('map.lastSeen'))}: ${esc(lastSeen)}`);
  });
  drawPatrolPaths(m, state, esc, t);

  if (stored) drawCurrentLocation(m, stored, 0, t);
  liveMap = m;
  if (statusId || id === 'overviewMap') {
    setTimeout(() => locateUser({ map: m, state, t, statusId, pan: !stored }), 80);
    locationRefreshTimer = setInterval(() => {
      const view = document.querySelector(id === 'overviewMap' ? '#view-overview' : '#view-map');
      if (view?.hidden) {
        clearInterval(locationRefreshTimer);
        locationRefreshTimer = null;
        return;
      }
      locateUser({ map: m, state, t, statusId, pan: false });
    }, 30000);
  }
  return m;
}

function personStatus(user, t) {
  if (user.status === 'present') return { label: t('attendance.present'), tone: 'good' };
  if (user.status === 'late') return { label: t('attendance.lateStatus'), tone: 'warn' };
  return { label: t('attendance.absent'), tone: 'bad' };
}

function monitoringMarkup({ state, t, esc }) {
  const people = list(state.users).filter(user => user.role === 'guard' || user.role === 'supervisor');
  const tracked = people.filter(hasPoint);
  const routes = list(state.patrolRoutes);
  const activePatrols = list(state.patrols).filter(item => item.status !== 'completed').length;
  const peopleRows = tracked.length ? tracked.slice(0, 8).map(user => {
    const status = personStatus(user, t);
    const lastSeen = user.locationAt ? new Date(Number(user.locationAt)).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : t('map.unknownTime');
    return `<div class="map-person-row"><span class="map-person-dot ${status.tone}"></span><div><strong>${esc(user.name || t('common.unassigned'))}</strong><small>${esc(user.site || t('common.unassigned'))} · ${esc(t('map.lastSeen'))} ${esc(lastSeen)}</small></div><span class="pill ${status.tone}">${esc(status.label)}</span></div>`;
  }).join('') : `<div class="empty-state">${esc(t('map.noTrackedPeople'))}</div>`;
  const routeRows = routes.length ? routes.slice(0, 8).map(route => {
    const site = list(state.sites).find(item => item.id === route.siteId);
    const progress = patrolProgress(route, state);
    const done = progress.latest?.status === 'completed';
    const tone = done ? 'good' : progress.latest ? 'warn' : '';
    return `<div class="map-route-row"><div><strong>${esc(route.name || t('map.patrolRoute'))}</strong><small>${esc(site?.name || t('common.unassigned'))} · ${progress.done}/${progress.total} ${esc(t('map.checkpoints'))}</small></div><span class="pill ${tone}">${esc(done ? t('map.routeComplete') : progress.latest ? t('map.routeInProgress') : t('map.routeReady'))}</span></div>`;
  }).join('') : `<div class="empty-state">${esc(t('map.noRoutes'))}</div>`;
  return `<div class="map-monitor-summary"><div><strong>${tracked.length}/${people.length}</strong><small>${esc(t('map.peopleTitle'))}</small></div><div><strong>${activePatrols}</strong><small>${esc(t('patrolMonitor.inProgress'))}</small></div><div><strong>${routes.length}</strong><small>${esc(t('map.routesTitle'))}</small></div></div><div class="map-monitor-grid"><div class="map-monitor-panel"><div class="card-head"><div><h3>${esc(t('map.peopleTitle'))}</h3><small>${esc(t('map.peopleHint'))}</small></div><span class="pill dark">${tracked.length}/${people.length}</span></div><div class="map-people-list">${peopleRows}</div></div><div class="map-monitor-panel"><div class="card-head"><div><h3>${esc(t('map.routesTitle'))}</h3><small>${esc(t('map.routesHint'))}</small></div><span class="pill dark">${routes.length}</span></div><div class="map-routes-list">${routeRows}</div></div></div>`;
}

export function renderMapView(ctx) {
  const { state, t, clock, header, CENTER } = ctx;
  const current = state.currentUser;
  const statusId = 'mapLocationStatus';
  document.querySelector('#view-map').innerHTML =
    header('nav.map', 'map.title', 'map.subtitle', `<div class="map-header-actions"><button class="btn btn-secondary" id="centerMap" type="button">⌖ ${t('map.locationButton')}</button><button class="btn btn-outline" id="refreshLiveMap" type="button">↻ ${t('map.refresh')}</button></div>`) +
    `<div class="card"><div class="map-panel" style="height:calc(100vh - 280px);min-height:420px"><div id="liveMap" class="live-map"></div><div class="map-legend"><div class="legend-row"><i class="legend-dot"></i>${t('map.livePeople')}</div><div class="legend-row"><i class="legend-dot orange"></i>${t('map.geofences')}</div><div class="legend-row"><i class="legend-dot" style="background:#dc675a"></i>${t('map.you')}</div></div></div><div class="map-bottom"><span id="${statusId}" class="pill warn">${t('map.locating')}</span><span>${t('map.lastUpdate')}: <b id="mapLastUpdate">${clock()}</b></span></div></div>${monitoringMarkup({ state, t, esc: ctx.esc })}`;
  setTimeout(() => {
    const m = initMapView({ ...ctx, statusId }, 'liveMap');
    document.querySelector('#centerMap')?.addEventListener('click', () => locateUser({ map: m, state, t, statusId, pan: true }));
    document.querySelector('#refreshLiveMap')?.addEventListener('click', () => {
      const refreshed = initMapView({ ...ctx, statusId }, 'liveMap');
      const stamp = document.querySelector('#mapLastUpdate');
      if (stamp) stamp.textContent = clock();
      if (!refreshed && current) setLocationStatus(statusId, `${t('map.locationUnavailable')} · ${CENTER.lat.toFixed(3)}, ${CENTER.lng.toFixed(3)}`, 'bad');
    });
    if (!m && current) setLocationStatus(statusId, `${t('map.locationUnavailable')} · ${CENTER.lat.toFixed(3)}, ${CENTER.lng.toFixed(3)}`, 'bad');
  }, 60);
}
