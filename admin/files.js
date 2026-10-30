// Turns a picked file into something ready to commit.
// Photos are resized to MAX_SIDE and saved as JPEG so the site stays fast;
// GIF and SVG are kept as they are; videos are uploaded unchanged.

const MAX_SIDE = 2400;
const JPEG_QUALITY = 0.85;
const MAX_VIDEO_MB = 50;

async function prepareFile(file, folder) {
  const isVideo = file.type.startsWith('video/');
  const keep = isVideo || ['image/gif', 'image/svg+xml'].includes(file.type);

  if (isVideo && file.size > MAX_VIDEO_MB * 1024 * 1024) {
    throw new Error(`${file.name} is larger than ${MAX_VIDEO_MB} MB. Please compress it (e.g. with HandBrake) and try again.`);
  }
  if (!isVideo && !file.type.startsWith('image/')) {
    throw new Error(`${file.name} is not an image or a video.`);
  }

  const blob = keep ? file : await resizeImage(file);
  const ext = keep ? file.name.split('.').pop().toLowerCase() : 'jpg';
  const name = file.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'file';

  return {
    path: `${folder}/${Date.now().toString(36)}-${name}.${ext}`,
    type: isVideo ? 'video' : 'image',
    base64: await toBase64(blob),
    url: URL.createObjectURL(blob),
  };
}

async function resizeImage(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; // transparent PNGs get a white background
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
}

function toBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
