'use client';

import { useState, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { DatabaseProductImage, getProductImageUrl } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import {
  validateImageFile,
  processImageFile,
  generateClientStoragePath,
  uploadImageWithRetry,
} from '@/lib/browser-image-pipeline';
import {
  registerUploadedImageAction,
  deleteProductImageAction,
  reorderProductImagesAction,
  updateImageAltTextAction,
} from './actions';

interface ImageManagerProps {
  productId: string;
  initialImages: DatabaseProductImage[];
  onImagesChange?: (images: DatabaseProductImage[]) => void;
}

export function ImageManager({
  productId,
  initialImages,
  onImagesChange,
}: ImageManagerProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<DatabaseProductImage[]>(
    [...initialImages].sort((a, b) => a.sort_order - b.sort_order)
  );

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Inline Alt Text Editing State
  const [editingAltId, setEditingAltId] = useState<string | null>(null);
  const [altTextInput, setAltTextInput] = useState<string>('');

  const maxImages = 6;
  const remainingSlots = maxImages - images.length;

  const updateImagesState = (newImages: DatabaseProductImage[]) => {
    setImages(newImages);
    if (onImagesChange) {
      onImagesChange(newImages);
    }
  };

  // Handle file selection and browser processing pipeline
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Reset input so user can pick again even if cancelled
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setErrorMessage(null);
    setStatusMessage(null);

    // 1. Enforce max slots
    if (files.length > remainingSlots) {
      setErrorMessage(
        `You can only add ${remainingSlots} more image${
          remainingSlots === 1 ? '' : 's'
        } (maximum 6 images per curtain).`
      );
      return;
    }

    // 2. Validate all picked files first
    for (const file of files) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setErrorMessage(validation.error || 'Invalid file selected.');
        return;
      }
    }

    // 3. Initialize Supabase browser client
    const supabase = createClient();
    if (!supabase) {
      setErrorMessage('Storage client unavailable.');
      return;
    }

    setIsUploading(true);
    let uploadedCount = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setStatusMessage(`Processing image ${i + 1} of ${files.length}...`);
        setUploadProgress(15);

        // Resize via createImageBitmap with imageOrientation: 'from-image' to max 1600px & WebP ~0.82
        const webpBlob = await processImageFile(file);

        // Generate client-side storage path: products/{product_id}/{uuid}.webp
        const storagePath = generateClientStoragePath(productId);

        setStatusMessage(`Uploading image ${i + 1} of ${files.length}...`);

        // Upload directly to Supabase Storage with owner session + retry
        await uploadImageWithRetry(
          supabase,
          storagePath,
          webpBlob,
          2,
          (progress) => setUploadProgress(progress)
        );

        // Call Server Action to validate path & object existence, enforce cap, and insert row
        setStatusMessage(`Registering image ${i + 1} of ${files.length}...`);
        const result = await registerUploadedImageAction(
          productId,
          storagePath,
          file.name.replace(/\.[^/.]+$/, '').slice(0, 100)
        );

        if (!result.success) {
          throw new Error(result.error || 'Failed to register image.');
        }

        uploadedCount++;
      }

      setStatusMessage(`Successfully uploaded ${uploadedCount} image${uploadedCount === 1 ? '' : 's'}.`);
      router.refresh();
    } catch (err: unknown) {
      setErrorMessage((err as Error)?.message || 'Image upload failed.');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  // Reordering: Move up / down (index 0 is cover)
  const handleMove = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const newOrder = [...images];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(targetIndex, 0, moved);

    // Optimistically update
    const updatedImages = newOrder.map((img, idx) => ({ ...img, sort_order: idx }));
    updateImagesState(updatedImages);

    startTransition(async () => {
      const res = await reorderProductImagesAction(
        productId,
        updatedImages.map((img) => img.id)
      );
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to reorder images.');
        router.refresh();
      }
    });
  };

  // Set explicitly as Cover (moves to index 0)
  const handleSetCover = (index: number) => {
    if (index === 0) return;
    const newOrder = [...images];
    const [moved] = newOrder.splice(index, 1);
    newOrder.unshift(moved);

    const updatedImages = newOrder.map((img, idx) => ({ ...img, sort_order: idx }));
    updateImagesState(updatedImages);

    startTransition(async () => {
      const res = await reorderProductImagesAction(
        productId,
        updatedImages.map((img) => img.id)
      );
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to set cover photo.');
        router.refresh();
      }
    });
  };

  // Delete Image: Removes row first, then the file
  const handleDelete = (imageId: string) => {
    if (!confirm('Are you sure you want to permanently delete this photo?')) {
      return;
    }

    const previousImages = images;
    const filtered = images.filter((img) => img.id !== imageId);
    const updatedImages = filtered.map((img, idx) => ({ ...img, sort_order: idx }));
    updateImagesState(updatedImages);

    startTransition(async () => {
      const res = await deleteProductImageAction(imageId);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to delete photo.');
        updateImagesState(previousImages);
      } else {
        router.refresh();
      }
    });
  };

  // Save Alt-Text
  const handleSaveAltText = (imageId: string) => {
    startTransition(async () => {
      const res = await updateImageAltTextAction(imageId, altTextInput);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to update alt text.');
      } else {
        const updated = images.map((img) =>
          img.id === imageId ? { ...img, alt_text: altTextInput } : img
        );
        updateImagesState(updated);
        setEditingAltId(null);
      }
    });
  };

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5 sm:p-7 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
        <div>
          <h2 className="text-base font-semibold text-stone-900">
            Product Photography ({images.length} / {maxImages})
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            The first photo is the cover. Drag or move photos to reorder. Maximum 6 photos.
          </p>
        </div>

        {/* Hidden File Picker */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp,.heic,.heif"
          onChange={handleFileSelect}
          disabled={isUploading || isPending || remainingSlots <= 0}
          className="hidden"
          id="photo-upload-input"
        />

        <label
          htmlFor="photo-upload-input"
          className={`min-h-[44px] px-4 py-2 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer select-none ${
            remainingSlots <= 0 || isUploading || isPending
              ? 'bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed'
              : 'bg-stone-900 text-white hover:bg-stone-800 active:bg-stone-950 focus:ring-2 focus:ring-stone-900'
          }`}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span>{isUploading ? 'Uploading...' : 'Add Photos'}</span>
        </label>
      </div>

      {/* Upload Feedback & Progress */}
      {isUploading && (
        <div className="p-4 rounded-lg bg-stone-50 border border-stone-200 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-stone-700">
            <span>{statusMessage}</span>
            {uploadProgress !== null && <span>{uploadProgress}%</span>}
          </div>
          <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-stone-900 h-full transition-all duration-300"
              style={{ width: `${uploadProgress ?? 30}%` }}
            />
          </div>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="p-3 text-xs rounded-md bg-red-50 border border-red-200 text-red-800 font-medium flex items-center justify-between"
        >
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-700 hover:text-red-950 font-bold ml-2 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Images Grid */}
      {images.length === 0 ? (
        <div className="py-10 border-2 border-dashed border-stone-200 rounded-xl text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-stone-100 mx-auto flex items-center justify-center text-stone-400">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-stone-700">No photos uploaded yet</p>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Upload up to 6 high-resolution curtain photos. Photos are automatically compressed to WebP and resized for mobile performance.
          </p>
          <div className="pt-2">
            <label
              htmlFor="photo-upload-input"
              className="min-h-[44px] px-4 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer border border-stone-300 transition-colors"
            >
              Select Images from Computer / Phone
            </label>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((image, index) => {
            const imageUrl = getProductImageUrl(image.storage_path) || '';
            const isCover = index === 0;

            return (
              <div
                key={image.id}
                className={`relative rounded-xl border overflow-hidden bg-stone-50 flex flex-col justify-between transition-shadow hover:shadow-xs ${
                  isCover ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-stone-200'
                }`}
              >
                {/* Image Preview Container */}
                <div className="relative aspect-4/3 bg-stone-100 overflow-hidden">
                  <img
                    src={imageUrl}
                    alt={image.alt_text || `Curtain view ${index + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />

                  {/* Cover Badge */}
                  {isCover && (
                    <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-3xs uppercase tracking-wider font-bold bg-emerald-600 text-white shadow-xs">
                      Cover Photo
                    </span>
                  )}

                  {/* Action Overlay: Move Left / Move Right / Delete */}
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-stone-900/80 backdrop-blur-xs p-1 rounded-lg">
                    {/* Move left */}
                    <button
                      type="button"
                      disabled={index === 0 || isPending}
                      onClick={() => handleMove(index, 'left')}
                      title="Move earlier"
                      className="w-8 h-8 rounded flex items-center justify-center text-white hover:bg-white/20 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    >
                      ←
                    </button>

                    {/* Move right */}
                    <button
                      type="button"
                      disabled={index === images.length - 1 || isPending}
                      onClick={() => handleMove(index, 'right')}
                      title="Move later"
                      className="w-8 h-8 rounded flex items-center justify-center text-white hover:bg-white/20 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    >
                      →
                    </button>

                    {/* Delete button */}
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDelete(image.id)}
                      title="Delete photo"
                      className="w-8 h-8 rounded flex items-center justify-center text-red-400 hover:bg-white/20 hover:text-red-300 cursor-pointer"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Footer Controls: Set as Cover & Alt-Text */}
                <div className="p-3 bg-white border-t border-stone-100 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    {!isCover && (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleSetCover(index)}
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                      >
                        Make Cover Photo
                      </button>
                    )}

                    <span className="text-2xs text-stone-400 tabular-nums ml-auto">
                      Slot {index + 1}
                    </span>
                  </div>

                  {/* Alt-Text Display / Editor */}
                  {editingAltId === image.id ? (
                    <div className="space-y-1.5 pt-1">
                      <input
                        type="text"
                        value={altTextInput}
                        onChange={(e) => setAltTextInput(e.target.value)}
                        placeholder="Descriptive alt text for accessibility..."
                        className="w-full h-8 px-2 text-xs rounded border border-stone-300 bg-white text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                        maxLength={200}
                      />
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingAltId(null)}
                          className="px-2 py-1 text-2xs text-stone-500 hover:text-stone-800"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveAltText(image.id)}
                          className="px-2.5 py-1 text-2xs font-semibold bg-stone-900 text-white rounded hover:bg-stone-800"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-xs text-stone-500 pt-1">
                      <span className="truncate max-w-[170px]" title={image.alt_text}>
                        {image.alt_text ? `Alt: "${image.alt_text}"` : 'No alt text added'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAltId(image.id);
                          setAltTextInput(image.alt_text || '');
                        }}
                        className="text-2xs font-medium text-stone-700 hover:text-stone-900 hover:underline shrink-0"
                      >
                        {image.alt_text ? 'Edit' : '+ Add Alt'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

