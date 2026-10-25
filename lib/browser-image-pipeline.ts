import type { SupabaseClient } from '@supabase/supabase-js';

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

const ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_RAW_BYTES = 20 * 1024 * 1024; // 20MB limit before resizing

/**
 * Validates a user-selected file before client-side processing.
 * Strictly catches HEIC/HEIF files with clear guidance, rejects non-images,
 * and checks raw file size limits.
 */
export function validateImageFile(file: File): ImageValidationResult {
  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();

  // (2) Handle HEIC / HEIF with a clear, helpful explanation
  if (
    fileName.endsWith('.heic') ||
    fileName.endsWith('.heif') ||
    fileType.includes('heic') ||
    fileType.includes('heif')
  ) {
    return {
      valid: false,
      error: `"${file.name}" is in HEIC/HEIF format, which web browsers cannot decode directly. Please convert it to JPEG or PNG before uploading (on iPhone: Settings > Camera > Formats > Most Compatible).`,
    };
  }

  // Check MIME type or extension
  const isImageMime = fileType.startsWith('image/');
  const hasImageExt = ACCEPTED_EXTENSIONS.some((ext) => fileName.endsWith(ext));

  if (!isImageMime && !hasImageExt) {
    return {
      valid: false,
      error: `"${file.name}" is not an accepted image. Please upload JPEG, PNG, or WebP files.`,
    };
  }

  // Check oversized raw file
  if (file.size > MAX_RAW_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `"${file.name}" is too large (${sizeMb} MB). Please select an image under 20 MB.`,
    };
  }

  return { valid: true };
}

/**
 * Client-side resize and compression pipeline:
 * 1. Decodes via createImageBitmap with imageOrientation: 'from-image' to preserve correct EXIF rotation.
 * 2. Scales down to a max dimension of 1600px while maintaining aspect ratio.
 * 3. Encodes to WebP at quality ~0.82.
 */
export async function processImageFile(file: File): Promise<Blob> {
  // Use imageOrientation: 'from-image' to respect orientation tags from mobile cameras
  const bitmap = await createImageBitmap(file, {
    imageOrientation: 'from-image',
  });

  const maxDimension = 1600;
  let targetWidth = bitmap.width;
  let targetHeight = bitmap.height;

  if (targetWidth > maxDimension || targetHeight > maxDimension) {
    if (targetWidth >= targetHeight) {
      targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
      targetWidth = maxDimension;
    } else {
      targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
      targetHeight = maxDimension;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Canvas 2D context not available.');
  }

  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  bitmap.close();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('WebP canvas compression failed.'));
        }
      },
      'image/webp',
      0.82 // WebP quality target ~0.82
    );
  });
}

/**
 * Generates a client-side random UUID storage path:
 * products/{product_id}/{uuid}.webp
 */
export function generateClientStoragePath(productId: string): string {
  const uuid = crypto.randomUUID();
  return `products/${productId}/${uuid}.webp`;
}

/**
 * Uploads a WebP blob directly to Supabase Storage with the owner's authenticated session.
 * Features retry logic for transient network failures and simulated progress callbacks.
 */
export async function uploadImageWithRetry(
  supabase: SupabaseClient,
  storagePath: string,
  blob: Blob,
  maxRetries = 2,
  onProgress?: (percent: number) => void
): Promise<void> {
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      if (onProgress) {
        onProgress(Math.min(90, 20 + attempt * 25));
      }

      const { error } = await supabase.storage
        .from('product-media')
        .upload(storagePath, blob, {
          contentType: 'image/webp',
          cacheControl: '31536000', // 1-year immutable cache
          upsert: false,
        });

      if (error) {
        throw error;
      }

      if (onProgress) {
        onProgress(100);
      }
      return;
    } catch (err) {
      attempt++;
      if (attempt > maxRetries) {
        throw err;
      }
      // Exponential backoff wait before retry
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
}

