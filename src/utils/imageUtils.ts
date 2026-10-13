// Image intake for the rich-text editor. Images are normalised to formats a
// .docx can embed (PNG / JPEG / GIF / BMP) and capped in size so a handful of
// phone photos cannot exhaust the browser's storage quota.

const EMBEDDABLE = ['image/png', 'image/jpeg', 'image/gif', 'image/bmp'];
const MAX_DIMENSION = 1600;
const MAX_INPUT_BYTES = 15 * 1024 * 1024;

export interface ProcessedImage {
  dataUrl: string;
  mimeType: string;
  widthPx: number;
  heightPx: number;
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the image'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('This file is not a readable image'));
    img.src = src;
  });
}

export async function processImageFile(file: File, maxDimension: number = MAX_DIMENSION): Promise<ProcessedImage> {
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error(`Image is too large (${(file.size / 1024 / 1024).toFixed(1)} MB; limit ${MAX_INPUT_BYTES / 1024 / 1024} MB)`);
  }
  const original = await readAsDataUrl(file);
  const img = await loadImage(original);
  const w = img.naturalWidth || 300;
  const h = img.naturalHeight || 150;
  const mime = file.type || original.match(/^data:([^;,]+)/)?.[1] || 'image/png';

  const scale = Math.min(1, maxDimension / Math.max(w, h));
  if (EMBEDDABLE.includes(mime) && scale === 1) {
    return { dataUrl: original, mimeType: mime, widthPx: w, heightPx: h };
  }

  // Re-encode (WebP/SVG/etc. → PNG, oversized images → scaled down)
  const outW = Math.max(1, Math.round(w * scale));
  const outH = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image conversion is not supported in this browser');
  const outMime = mime === 'image/jpeg' ? 'image/jpeg' : 'image/png';
  if (outMime === 'image/jpeg') {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, outW, outH);
  }
  ctx.drawImage(img, 0, 0, outW, outH);
  return { dataUrl: canvas.toDataURL(outMime, 0.9), mimeType: outMime, widthPx: outW, heightPx: outH };
}
