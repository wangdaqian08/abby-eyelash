// The master the admin uploads: the source photo cropped and resized in the browser, by the rules of scripts/photos.mjs
// (cover the ratio, fixed output size, JPEG, no metadata). What the editor shows is exactly what is cut here (cropRect).
import type { AdminRatio } from '../../data/photos.ts';
import { JPEG_QUALITY, OUT, cropRect } from '../../lib/photo-admin.ts';

/** The master as base64 (no data: prefix): the source cropped with cropRect and scaled to OUT[ratio], on white, JPEG at JPEG_QUALITY. */
export async function render(source: Blob, ratio: AdminRatio, focus: { x: number; y: number }): Promise<string> {
  const url = URL.createObjectURL(source);
  try {
    // An <img> (not createImageBitmap): every browser applies the phone's EXIF rotation to it, also when it is drawn.
    const img = Object.assign(new Image(), { src: url });
    await img.decode();
    const [w, h] = OUT[ratio];
    const c = cropRect(img.naturalWidth, img.naturalHeight, ratio, focus.x, focus.y);
    const canvas = Object.assign(document.createElement('canvas'), { width: w, height: h });
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff'; // JPEG has no transparency: a transparent PNG would turn black
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, c.sx, c.sy, c.sw, c.sh, 0, 0, w, h);
    const jpeg = await new Promise<Blob | null>((done) => canvas.toBlob(done, 'image/jpeg', JPEG_QUALITY));
    if (!jpeg) throw new Error('canvas.toBlob gave nothing');
    return await new Promise<string>((done, fail) => {
      const reader = new FileReader();
      reader.onload = () => done(String(reader.result).slice(String(reader.result).indexOf(',') + 1));
      reader.onerror = () => fail(reader.error);
      reader.readAsDataURL(jpeg);
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
