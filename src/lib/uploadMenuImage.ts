import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'menu-images';
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Resize an image file in the browser to keep storage payloads small.
 * Returns a JPEG/PNG Blob constrained to maxDim on the longest side.
 */
async function resizeImage(file: File, maxDim = 1024, quality = 0.85): Promise<Blob> {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img: HTMLImageElement = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });

  let { width, height } = img;
  if (width > maxDim || height > maxDim) {
    if (width > height) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(img, 0, 0, width, height);

  // Use webp if supported, fallback to jpeg
  const mime = 'image/webp';
  return await new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
      mime,
      quality,
    );
  });
}

/**
 * Upload a menu item image to Supabase Storage.
 * Returns a public URL suitable to store in menu_items.image.
 */
export async function uploadMenuImage(file: File, itemId?: string): Promise<string> {
  if (file.size > MAX_BYTES * 4) {
    throw new Error('الصورة أكبر من 20 ميغابايت — اختر صورة أصغر');
  }

  // Resize/compress to keep storage usage and bandwidth low
  let blob: Blob;
  try {
    blob = await resizeImage(file, 1024, 0.85);
  } catch {
    // Fallback to original file if resize fails
    blob = file;
  }

  if (blob.size > MAX_BYTES) {
    // Try harder with smaller dimensions
    blob = await resizeImage(file, 800, 0.75);
  }

  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
  const id = itemId ?? crypto.randomUUID();
  const path = `${id}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, {
      contentType: blob.type,
      upsert: true,
      cacheControl: '31536000', // 1 year
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Best-effort delete of an old image when replacing it.
 * Silently ignores errors (e.g. external URLs or already deleted files).
 */
export async function deleteMenuImageIfManaged(imageUrl: string | null | undefined): Promise<void> {
  if (!imageUrl) return;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = imageUrl.indexOf(marker);
  if (idx === -1) return;
  const path = imageUrl.substring(idx + marker.length);
  if (!path) return;
  try {
    await supabase.storage.from(BUCKET).remove([path]);
  } catch {
    // ignore
  }
}