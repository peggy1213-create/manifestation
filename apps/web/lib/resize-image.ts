'use client';

/**
 * Photos are resized in the browser before they ever leave the device: the long
 * edge is capped at 1200px and the image is re-encoded as JPEG, which also drops
 * the EXIF block — so no GPS coordinates travel with a 足跡 photo.
 */

export const MAX_PHOTO_EDGE = 1200;
const JPEG_QUALITY = 0.82;

export interface ResizedPhoto {
  blob: Blob;
  width: number;
  height: number;
}

export async function resizeImage(
  file: Blob,
  maxEdge: number = MAX_PHOTO_EDGE,
): Promise<ResizedPhoto> {
  // `from-image` applies the EXIF orientation while decoding, so a portrait
  // photo taken sideways is not re-encoded on its side.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });

  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const blob = await drawToJpeg(bitmap, width, height);
    return { blob, width, height };
  } finally {
    bitmap.close();
  }
}

async function drawToJpeg(bitmap: ImageBitmap, width: number, height: number): Promise<Blob> {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('2d context unavailable');
    context.drawImage(bitmap, 0, 0, width, height);
    return canvas.convertToBlob({ type: 'image/jpeg', quality: JPEG_QUALITY });
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('2d context unavailable');
  context.drawImage(bitmap, 0, 0, width, height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob returned nothing'))),
      'image/jpeg',
      JPEG_QUALITY,
    );
  });
}
