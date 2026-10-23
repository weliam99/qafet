let activeVideo = null;
let activeCameraId = null;
let telemetryTimer = null;

const nowLabel = () => new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
const dateLabel = () => new Date().toISOString().slice(0, 10);
const uid = () => `DC-${Date.now().toString().slice(-7)}`;

const defaultCameras = () => [
  { id: 'cam-01', vehicle: 'الدورية 01', plate: 'أ ب 1234', site: 'المجمع الإداري الرئيسي', sim: '•••• 2481', network: '4G LTE', signal: 82, status: 'online', lastSeen: nowLabel(), streamUrl: '', gps: '24.7136, 46.6753' },
  { id: 'cam-02', vehicle: 'الدورية 02', plate: 'أ ب 5678', site: 'البوابة الشمالية', sim: '•••• 7790', network: '5G', signal: 96, status: 'online', lastSeen: nowLabel(), streamUrl: '', gps: '24.7164, 46.6729' },
  { id: 'cam-03', vehicle: 'الدورية 03', plate: 'أ ب 9012', site: 'الساحة الخلفية', sim: '•••• 4426', network: '4G LTE', signal: 58, status: 'idle', lastSeen: nowLabel(), streamUrl: '', gps: '24.7098, 46.6793' },
];

function stopStream() {
  if (activeVideo) {
    activeVideo.pause();
    activeVideo.removeAttribute('src');
    activeVideo.load();
  }
  activeVideo = null;
  activeCameraId = null;
}

function stopTelemetry() {
  if (telemetryTimer) window.clearInterval(telemetryTimer);
  telemetryTimer = null;
}

function cameraState(camera, ctx) {
  const status = camera?.status || 'offline';
  return {
    label: ctx.t(`dashcam.${status}`),
    tone: status === 'online' ? 'good' : status === 'idle' ? 'warn' : 'bad',
  };
}

function renderEvents(root, ctx) {
  const events = Array.isArray(ctx.state.dashcamEvents) ? ctx.state.dashcamEvents : [];
  const list = root.querySelector('#dashcamEvents');
  if (!list) return;
  list.textContent = '';
  if (!events.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    const title = document.createElement('strong');
    title.textContent = ctx.t('dashcam.emptyTitle');
    empty.append(title, document.createTextNode(ctx.t('dashcam.emptyHint')));
    list.appendChild(empty);
    return;
  }
  events.slice(0, 12).forEach(event => {
    const row = document.createElement('div');
    row.className = 'setting-row dashcam-event';
    const text = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = event.typeLabel || ctx.t('dashcam.incident');
    const meta = document.createElement('small');
    meta.textContent = `${event.vehicle || ctx.t('common.unassigned')} · ${event.user || ctx.t('common.unassigned')} · ${event.date} · ${event.time}`;
    text.append(title, meta);
    if (event.note) {
      const note = document.createElement('p');
      note.textContent = event.note;
      text.appendChild(note);
    }
    const badge = document.createElement('span');
    badge.className = `pill ${event.snapshot ? 'good' : 'warn'}`;
    badge.textContent = event.snapshot ? ctx.t('dashcam.saved') : ctx.t('dashcam.metadataSaved');
    row.append(text, badge);
    list.appendChild(row);
  });
}

function renderCameraRows(root, ctx) {
  const list = root.querySelector('#dashcamCameraRows');
  if (!list) return;
  list.textContent = '';
  const cameras = Array.isArray(ctx.state.dashcamCameras) ? ctx.state.dashcamCameras : [];
  if (!cameras.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `<strong>${ctx.t('dashcam.noCameras')}</strong>${ctx.t('dashcam.noCamerasHint')}`;
    list.appendChild(empty);
    return;
  }
  cameras.forEach(camera => {
    const state = cameraState(camera, ctx);
    const row = document.createElement('div');
    row.className = 'dashcam-camera-row';
    row.dataset.cameraId = camera.id;
    row.innerHTML = `<div class="dashcam-camera-identity"><span class="camera-signal ${state.tone}"></span><div><strong>${ctx.esc(camera.vehicle)}</strong><small>${ctx.esc(camera.plate)} · ${ctx.esc(camera.site)}</small></div></div><div class="dashcam-camera-meta"><span class="pill ${state.tone}">${ctx.esc(state.label)}</span><small>${ctx.esc(camera.network || ctx.t('dashcam.networkUnknown'))} · ${Number(camera.signal || 0)}%</small></div>`;
    row.addEventListener('click', () => selectCamera(root, ctx, camera.id));
    list.appendChild(row);
  });
}

function selectCamera(root, ctx, cameraId) {
  const camera = ctx.state.dashcamCameras.find(item => item.id === cameraId);
  if (!camera) return;
  const select = root.querySelector('#dashcamCameraSelect');
  if (select) select.value = camera.id;
  root.querySelector('#dashcamVehicle').textContent = camera.vehicle;
  root.querySelector('#dashcamPlate').textContent = camera.plate;
  root.querySelector('#dashcamSite').textContent = camera.site;
  root.querySelector('#dashcamNetwork').textContent = `${camera.network || ctx.t('dashcam.networkUnknown')} · ${Number(camera.signal || 0)}%`;
  root.querySelector('#dashcamLastSeen').textContent = camera.lastSeen || ctx.t('dashcam.neverSeen');
  root.querySelector('#dashcamStreamUrl').value = camera.streamUrl || '';
  const state = cameraState(camera, ctx);
  const badge = root.querySelector('#dashcamState');
  badge.textContent = state.label;
  badge.className = `pill ${state.tone}`;
  root.querySelector('#dashcamConnectionHint').textContent = camera.streamUrl ? ctx.t('dashcam.gatewayConfigured') : ctx.t('dashcam.telemetryOnly');
  root.querySelectorAll('.dashcam-camera-row').forEach(row => row.classList.toggle('selected', row.dataset.cameraId === camera.id));
  if (activeCameraId !== camera.id) {
    stopStream();
    root.querySelector('#dashcamPlaceholder').hidden = false;
    root.querySelector('#dashcamOverlay').hidden = true;
    root.querySelector('#dashcamVideo').hidden = true;
    root.querySelector('#dashcamStatus').textContent = ctx.t('dashcam.ready');
    root.querySelector('#captureDashcam').disabled = true;
    root.querySelector('#stopDashcam').disabled = true;
  }
}

function currentCamera(root, ctx) {
  return ctx.state.dashcamCameras.find(item => item.id === root.querySelector('#dashcamCameraSelect')?.value) || ctx.state.dashcamCameras[0];
}

function updateTelemetry(root, ctx) {
  ctx.state.dashcamCameras.forEach(camera => {
    if (camera.status === 'offline') return;
    const drift = Math.round((Math.random() - 0.5) * 8);
    camera.signal = Math.max(18, Math.min(100, Number(camera.signal || 70) + drift));
    camera.lastSeen = nowLabel();
  });
  const camera = currentCamera(root, ctx);
  if (camera) selectCamera(root, ctx, camera.id);
  renderCameraRows(root, ctx);
  ctx.saveState();
}

export function stopDashcam() {
  stopStream();
  stopTelemetry();
}

export function renderDashcamView(ctx) {
  const root = document.querySelector('#view-dashcam');
  if (!root) return;
  stopDashcam();
  if (!Array.isArray(ctx.state.dashcamCameras)) {
    ctx.state.dashcamCameras = defaultCameras();
    ctx.saveState();
  }
  if (!Array.isArray(ctx.state.dashcamEvents)) ctx.state.dashcamEvents = [];
  const user = ctx.state.users?.find(item => item.id === ctx.state.currentUser?.id) || ctx.state.currentUser || {};
  const cameras = ctx.state.dashcamCameras;
  root.innerHTML = `${ctx.header('nav.dashcam', 'dashcam.title', 'dashcam.subtitle', `<button class="btn btn-secondary" id="refreshDashcams" type="button">↻ ${ctx.t('dashcam.refresh')}</button>`)}<div class="dashcam-summary stats-grid"><div class="stat-card"><div class="stat-top"><span>${ctx.t('dashcam.fleet')}</span><span class="stat-icon">▣</span></div><div class="stat-value" id="dashcamFleetCount">${cameras.length}</div><div class="stat-foot">${ctx.t('dashcam.vehicleCameras')}</div></div><div class="stat-card"><div class="stat-top"><span>${ctx.t('dashcam.connected')}</span><span class="stat-icon">⌁</span></div><div class="stat-value" id="dashcamOnlineCount">${cameras.filter(item => item.status === 'online').length}</div><div class="stat-foot good">${ctx.t('dashcam.cellularLink')}</div></div><div class="stat-card"><div class="stat-top"><span>${ctx.t('dashcam.signal')}</span><span class="stat-icon">◒</span></div><div class="stat-value" id="dashcamSignal">${Math.round(cameras.reduce((sum, item) => sum + Number(item.signal || 0), 0) / Math.max(cameras.length, 1))}%</div><div class="stat-foot">${ctx.t('dashcam.averageSignal')}</div></div><div class="stat-card"><div class="stat-top"><span>${ctx.t('dashcam.eventsTitle')}</span><span class="stat-icon">!</span></div><div class="stat-value" id="dashcamEventCount">${ctx.state.dashcamEvents.length}</div><div class="stat-foot">${ctx.t('dashcam.savedToday')}</div></div></div><div class="dashcam-console"><aside class="card dashcam-fleet-card"><div class="card-head"><div><h3>${ctx.t('dashcam.fleetTitle')}</h3><small>${ctx.t('dashcam.fleetHint')}</small></div><span class="pill good">${ctx.t('dashcam.cellularReady')}</span></div><div class="field"><label for="dashcamCameraSelect">${ctx.t('dashcam.chooseCamera')}</label><select id="dashcamCameraSelect">${cameras.map(camera => `<option value="${ctx.esc(camera.id)}">${ctx.esc(camera.vehicle)} · ${ctx.esc(camera.plate)}</option>`).join('')}</select></div><div class="dashcam-camera-list" id="dashcamCameraRows"></div></aside><div class="camera-card"><div class="card-head"><div><h3 id="dashcamVehicle">${ctx.esc(cameras[0]?.vehicle || ctx.t('common.unassigned'))}</h3><small class="camera-quality-label" id="dashcamStatus">${ctx.t('dashcam.ready')}</small></div><span class="pill warn" id="dashcamState">${ctx.t('dashcam.idle')}</span></div><div class="camera-preview live-camera-preview"><video id="dashcamVideo" autoplay playsinline muted hidden></video><div class="camera-placeholder" id="dashcamPlaceholder"><strong>${ctx.t('dashcam.vehiclePlaceholder')}</strong><span id="dashcamConnectionHint">${cameras[0]?.streamUrl ? ctx.t('dashcam.gatewayConfigured') : ctx.t('dashcam.telemetryOnly')}</span></div><div class="camera-overlay" id="dashcamOverlay" hidden><strong id="dashcamOverlayVehicle">${ctx.esc(cameras[0]?.vehicle || '')}</strong><span>${ctx.t('dashcam.cellularOverlay')}</span></div></div><div class="dashcam-vehicle-meta"><span><b>${ctx.t('dashcam.plate')}:</b> <span id="dashcamPlate">${ctx.esc(cameras[0]?.plate || '')}</span></span><span><b>${ctx.t('common.location')}:</b> <span id="dashcamSite">${ctx.esc(cameras[0]?.site || '')}</span></span><span><b>${ctx.t('dashcam.network')}:</b> <span id="dashcamNetwork">${ctx.esc(cameras[0]?.network || '')} · ${Number(cameras[0]?.signal || 0)}%</span></span><span><b>${ctx.t('dashcam.lastSeen')}:</b> <span id="dashcamLastSeen">${ctx.esc(cameras[0]?.lastSeen || ctx.t('dashcam.neverSeen'))}</span></span></div><div class="field dashcam-stream-field"><label for="dashcamStreamUrl">${ctx.t('dashcam.streamUrl')}</label><input id="dashcamStreamUrl" type="url" inputmode="url" placeholder="https://gateway.example/live/cam-01" value="${ctx.esc(cameras[0]?.streamUrl || '')}"><small>${ctx.t('dashcam.streamHint')}</small></div><div class="capture-actions"><button class="btn btn-primary" id="connectDashcam" type="button">${ctx.t('dashcam.connect')}</button><button class="btn btn-outline" id="captureDashcam" type="button" disabled>${ctx.t('dashcam.capture')}</button><button class="btn btn-outline" id="stopDashcam" type="button" disabled>${ctx.t('dashcam.stop')}</button></div><div class="field dashcam-note-field"><label for="dashcamNote">${ctx.t('dashcam.note')}</label><textarea id="dashcamNote" rows="2" placeholder="${ctx.t('dashcam.notePlaceholder')}"></textarea></div><p class="boundary-hint">${ctx.t('dashcam.privacyHint')}</p></div></div><div class="card dashcam-events-card"><div class="card-head"><div><h3>${ctx.t('dashcam.eventsTitle')}</h3><small>${ctx.t('dashcam.eventsHint')}</small></div><span class="pill" id="dashcamEventCountBottom">${ctx.state.dashcamEvents.length}</span></div><div id="dashcamEvents"></div></div>`;

  const video = root.querySelector('#dashcamVideo');
  const select = root.querySelector('#dashcamCameraSelect');
  const connect = root.querySelector('#connectDashcam');
  const stopButton = root.querySelector('#stopDashcam');
  const capture = root.querySelector('#captureDashcam');
  const streamInput = root.querySelector('#dashcamStreamUrl');
  const status = root.querySelector('#dashcamStatus');
  const placeholder = root.querySelector('#dashcamPlaceholder');
  const overlay = root.querySelector('#dashcamOverlay');
  const overlayVehicle = root.querySelector('#dashcamOverlayVehicle');
  const note = root.querySelector('#dashcamNote');

  const setLive = (live, camera) => {
    capture.disabled = !live;
    stopButton.disabled = !live;
    connect.disabled = live;
    status.textContent = ctx.t(live ? 'dashcam.active' : 'dashcam.ready');
    placeholder.hidden = live;
    overlay.hidden = !live;
    video.hidden = !live;
    overlayVehicle.textContent = camera?.vehicle || '';
  };

  const open = async () => {
    const camera = currentCamera(root, ctx);
    if (!camera) return;
    camera.streamUrl = streamInput.value.trim();
    await ctx.saveState();
    connect.disabled = true;
    status.textContent = ctx.t('dashcam.connecting');
    camera.status = 'online';
    camera.lastSeen = nowLabel();
    try {
      if (camera.streamUrl) {
        video.src = camera.streamUrl;
        await video.play();
        activeVideo = video;
        activeCameraId = camera.id;
        setLive(true, camera);
      } else {
        activeVideo = video;
        activeCameraId = camera.id;
        capture.disabled = false;
        stopButton.disabled = false;
        connect.disabled = true;
        status.textContent = ctx.t('dashcam.telemetryConnected');
        placeholder.hidden = false;
        overlay.hidden = true;
        video.hidden = true;
      }
      root.querySelector('#dashcamState').textContent = ctx.t('dashcam.online');
      root.querySelector('#dashcamState').className = 'pill good';
      ctx.showToast(ctx.t('dashcam.connectedToast'));
    } catch {
      video.removeAttribute('src');
      video.load();
      activeVideo = video;
      activeCameraId = camera.id;
      setLive(true, camera);
      status.textContent = ctx.t('dashcam.gatewayPlaybackError');
      ctx.showToast(ctx.t('dashcam.gatewayPlaybackError'));
    }
    renderCameraRows(root, ctx);
    await ctx.saveState();
  };

  const stopCamera = async () => {
    const camera = currentCamera(root, ctx);
    stopStream();
    if (camera) {
      camera.status = 'idle';
      camera.lastSeen = nowLabel();
    }
    setLive(false, camera);
    root.querySelector('#dashcamState').textContent = ctx.t('dashcam.idle');
    root.querySelector('#dashcamState').className = 'pill warn';
    renderCameraRows(root, ctx);
    await ctx.saveState();
  };

  const captureFrame = async () => {
    const camera = currentCamera(root, ctx);
    if (!camera || !activeVideo) return;
    capture.disabled = true;
    try {
      let snapshot = null;
      if (video.videoWidth && video.videoHeight) {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(video.videoWidth, 1280);
        canvas.height = Math.round(canvas.width * video.videoHeight / video.videoWidth);
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        snapshot = canvas.toDataURL('image/jpeg', 0.72);
      }
      ctx.state.dashcamEvents.unshift({ id: uid(), date: dateLabel(), time: nowLabel(), vehicle: camera.vehicle, cameraId: camera.id, network: camera.network, user: user.name || '', typeLabel: ctx.t('dashcam.incident'), note: note.value.trim(), snapshot });
      ctx.state.dashcamEvents = ctx.state.dashcamEvents.slice(0, 30);
      await ctx.saveState();
      note.value = '';
      root.querySelector('#dashcamEventCount').textContent = String(ctx.state.dashcamEvents.length);
      root.querySelector('#dashcamEventCountBottom').textContent = String(ctx.state.dashcamEvents.length);
      renderEvents(root, ctx);
      ctx.showToast(snapshot ? ctx.t('dashcam.captured') : ctx.t('dashcam.metadataCaptured'));
    } catch {
      ctx.showToast(ctx.t('dashcam.captureError'));
    } finally {
      capture.disabled = false;
    }
  };

  select.addEventListener('change', () => selectCamera(root, ctx, select.value));
  streamInput.addEventListener('change', () => {
    const camera = currentCamera(root, ctx);
    if (camera) camera.streamUrl = streamInput.value.trim();
  });
  connect.addEventListener('click', open);
  stopButton.addEventListener('click', stopCamera);
  capture.addEventListener('click', captureFrame);
  root.querySelector('#refreshDashcams').addEventListener('click', () => {
    updateTelemetry(root, ctx);
    ctx.showToast(ctx.t('dashcam.refreshed'));
  });
  renderCameraRows(root, ctx);
  selectCamera(root, ctx, cameras[0]?.id);
  renderEvents(root, ctx);
  telemetryTimer = window.setInterval(() => updateTelemetry(root, ctx), 15000);
}
