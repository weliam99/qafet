let activeStream = null;
let activeTrack = null;
let activeVideo = null;

const stopStream = () => {
  activeStream?.getTracks().forEach(track => track.stop());
  activeStream = null;
  activeTrack = null;
  activeVideo = null;
};

export async function startMobileCamera(video) {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('CAMERA_UNSUPPORTED');
  stopStream();
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 2560 },
      height: { ideal: 1440 },
      frameRate: { ideal: 30, max: 30 },
    },
  });
  activeStream = stream;
  activeTrack = stream.getVideoTracks()[0] || null;
  activeVideo = video;
  video.srcObject = stream;
  video.playsInline = true;
  video.muted = true;
  await video.play();
  const capabilities = activeTrack?.getCapabilities?.() || {};
  const settings = activeTrack?.getSettings?.() || {};
  let focusSupported = false;
  if (Array.isArray(capabilities.focusMode) && capabilities.focusMode.length) {
    focusSupported = true;
    const focusMode = capabilities.focusMode.includes('continuous') ? 'continuous' : capabilities.focusMode[0];
    try { await activeTrack.applyConstraints({ advanced: [{ focusMode }] }); } catch (error) { /* use the device default */ }
  }
  return {
    width: settings.width || video.videoWidth,
    height: settings.height || video.videoHeight,
    zoom: capabilities.zoom ? { min: capabilities.zoom.min, max: capabilities.zoom.max, step: capabilities.zoom.step || 0.1, value: settings.zoom || capabilities.zoom.min } : null,
    focusSupported,
  };
}

export async function setCameraZoom(value) {
  if (!activeTrack || !Number.isFinite(Number(value))) return false;
  const capabilities = activeTrack.getCapabilities?.() || {};
  if (!capabilities.zoom) return false;
  const zoom = Math.min(capabilities.zoom.max, Math.max(capabilities.zoom.min, Number(value)));
  try {
    await activeTrack.applyConstraints({ advanced: [{ zoom }] });
    return true;
  } catch (error) {
    return false;
  }
}

export async function focusCamera() {
  if (!activeTrack) return false;
  const capabilities = activeTrack.getCapabilities?.() || {};
  if (!Array.isArray(capabilities.focusMode) || !capabilities.focusMode.length) return false;
  const focusMode = capabilities.focusMode.includes('single-shot') ? 'single-shot' : capabilities.focusMode.includes('continuous') ? 'continuous' : capabilities.focusMode[0];
  try {
    await activeTrack.applyConstraints({ advanced: [{ focusMode }] });
    if (focusMode === 'single-shot' && capabilities.focusMode.includes('continuous')) {
      setTimeout(() => activeTrack?.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {}), 500);
    }
    return true;
  } catch (error) {
    return false;
  }
}

export async function captureCameraFile(video) {
  if (!video?.videoWidth || !video?.videoHeight) throw new Error('CAMERA_NOT_READY');
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('CANVAS_UNAVAILABLE');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('PHOTO_CAPTURE_FAILED')), 'image/jpeg', 0.94));
  return new File([blob], `patrol-${Date.now()}.jpg`, { type: 'image/jpeg' });
}

export function stopMobileCamera() {
  stopStream();
}

export function cameraIsActive() {
  return Boolean(activeStream && activeVideo);
}
