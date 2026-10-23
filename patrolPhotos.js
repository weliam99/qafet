const MAX_SIDE = 1920;
const BAR_HEIGHT = 44;

const loadImage = src => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('IMAGE_LOAD_FAILED'));
  img.src = src;
});

function drawStampBar(ctx, width, meta) {
  ctx.fillStyle = 'rgba(7,27,43,.72)';
  ctx.fillRect(0, 0, width, BAR_HEIGHT);

  ctx.fillStyle = '#fff';
  ctx.font = '15px Arial';
  ctx.textAlign = 'right';
  const line = [meta.name, meta.time, meta.site].filter(Boolean).join(' · ');
  ctx.fillText(line, width - 12, 28);

  ctx.fillStyle = 'rgba(201,165,106,.95)';
  ctx.font = 'bold 13px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(meta.brand || '', 12, 28);
}

// Reads a photo taken with the phone camera, scales it down, stamps the
// name/time/site bar on it, and returns a JPEG data URL for the patrol.
export async function stampPhotoFile(file, meta = {}) {
  if (!file || !String(file.type || '').startsWith('image/')) throw new Error('NOT_AN_IMAGE');
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const srcW = img.naturalWidth || img.width;
    const srcH = img.naturalHeight || img.height;
    if (!srcW || !srcH) throw new Error('IMAGE_EMPTY');
    const scale = Math.min(1, MAX_SIDE / Math.max(srcW, srcH));
    const width = Math.round(srcW * scale);
    const height = Math.round(srcH * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    drawStampBar(ctx, width, meta);
    return canvas.toDataURL('image/jpeg', .88);
  } finally {
    URL.revokeObjectURL(url);
  }
}
