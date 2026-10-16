import { getSupabase } from './supabaseClient';

export const BOOK_COVER_BUCKET = 'book-covers';
export const MAX_BOOK_COVER_INPUT_BYTES = 12 * 1024 * 1024;
export const MAX_BOOK_COVER_STORAGE_BYTES = 120 * 1024;

const SUPPORTED_BOOK_COVER_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const validateBookCoverFile = (file: File): string | null => {
  if (!SUPPORTED_BOOK_COVER_TYPES.includes(file.type)) {
    return 'Choose a JPEG, PNG, or WebP image.';
  }
  if (file.size <= 0) {
    return 'The selected image is empty or unreadable.';
  }
  if (file.size > MAX_BOOK_COVER_INPUT_BYTES) {
    return 'Choose an image that is 12 MB or smaller.';
  }
  return null;
};

const canvasToWebp = (canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> =>
  new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));

export const prepareBookCoverUpload = async (file: File): Promise<Blob> => {
  const validationError = validateBookCoverFile(file);
  if (validationError) throw new Error(validationError);
  if (typeof createImageBitmap !== 'function') {
    throw new Error('This browser cannot resize images safely. Try a current browser or select a smaller image.');
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('The selected image could not be opened. Choose a valid JPEG, PNG, or WebP file.');
  }

  try {
    const dimensionsAreSafe = bitmap.width > 0 && bitmap.height > 0
      && bitmap.width <= 4096 && bitmap.height <= 4096
      && bitmap.width * bitmap.height <= 16_000_000;
    if (!dimensionsAreSafe) {
      throw new Error('Use an image no larger than 4096 × 4096 pixels (16 megapixels).');
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('The browser could not prepare this image for storage.');

    const maxWidth = 900;
    const maxHeight = 1350;
    let scale = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
    const minimumScale = Math.min(1, 360 / Math.max(bitmap.width, bitmap.height));
    const qualities = [0.76, 0.66, 0.56, 0.46];
    let qualityIndex = 0;

    for (let attempt = 0; attempt < 16; attempt += 1) {
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      const blob = await canvasToWebp(canvas, qualities[qualityIndex]);
      if (!blob || blob.type !== 'image/webp') {
        throw new Error('This browser could not encode WebP images. Try a current browser.');
      }
      if (blob.size <= MAX_BOOK_COVER_STORAGE_BYTES) return blob;

      if (qualityIndex < qualities.length - 1) {
        qualityIndex += 1;
      } else {
        const nextScale = scale * 0.85;
        if (nextScale < minimumScale) break;
        scale = nextScale;
        qualityIndex = 1;
      }
    }

    throw new Error('This cover could not be reduced to 120 KB. Choose a smaller or simpler image.');
  } finally {
    bitmap.close();
  }
};

export const createBookCoverStoragePath = (): string => {
  const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${id}.webp`;
};

export const discardUnattachedBookCover = async (storagePath?: string): Promise<void> => {
  if (!storagePath) return;
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const { error } = await supabase.storage.from(BOOK_COVER_BUCKET).remove([storagePath]);
    if (error) console.warn('Could not clean up an unattached book cover:', error.message);
  } catch (error) {
    console.warn('Could not clean up an unattached book cover:', error);
  }
};
