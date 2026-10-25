'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { ProductImageUI } from '@/lib/types';

interface ProductGalleryProps {
  images: ProductImageUI[];
  productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const total = images.length;

  const handleOpen = (index: number) => {
    setActiveIdx(index);
    if (dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }
  };

  const handleClose = useCallback(() => {
    const lastIdx = activeIdx;
    if (dialogRef.current && dialogRef.current.open) {
      dialogRef.current.close();
    }
    setActiveIdx(null);
    // (4) Focus return to the triggering thumbnail button
    if (lastIdx !== null && triggerRefs.current[lastIdx]) {
      triggerRefs.current[lastIdx]?.focus();
    }
  }, [activeIdx]);

  const goToNext = useCallback(() => {
    if (activeIdx !== null && total > 0) {
      setActiveIdx((activeIdx + 1) % total);
    }
  }, [activeIdx, total]);

  const goToPrev = useCallback(() => {
    if (activeIdx !== null && total > 0) {
      setActiveIdx((activeIdx - 1 + total) % total);
    }
  }, [activeIdx, total]);

  // Arrow key navigation inside open lightbox
  useEffect(() => {
    if (activeIdx === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrev();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIdx, goToNext, goToPrev, handleClose]);

  if (!images || images.length === 0) {
    return null;
  }

  const currentImg = activeIdx !== null ? images[activeIdx] : null;

  return (
    <section className="mt-6 pt-5 border-t border-stone-200">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-bold font-display uppercase tracking-wider text-stone-800">
          Product Photography
        </h2>
        <span className="text-xs text-stone-500 font-medium tabular-nums">
          {images.length} {images.length === 1 ? 'photo' : 'photos'}
        </span>
      </div>

      {/* Gallery Strip: Mobile horizontal snap-scroll strip, tablet/desktop grid */}
      <div
        tabIndex={0}
        aria-label="Product photos scroll strip"
        className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 pt-1 sm:grid sm:grid-cols-3 md:grid-cols-6 sm:overflow-visible focus:outline-none focus:ring-1 focus:ring-amber-800 rounded-xl"
      >
        {images.map((img, idx) => (
          <button
            key={img.id}
            ref={(el) => {
              triggerRefs.current[idx] = el;
            }}
            type="button"
            onClick={() => handleOpen(idx)}
            className="group relative snap-start shrink-0 w-28 h-28 sm:w-auto sm:h-auto sm:aspect-square rounded-xl border border-stone-200 overflow-hidden bg-white shadow-2xs hover:border-stone-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 transition-all text-left cursor-pointer"
            aria-label={`View photo ${idx + 1} of ${images.length}: ${img.altText || productName}`}
          >
            {/* (6) Small image size with explicit width/height and loading="lazy" */}
            <Image
              src={img.url}
              alt={img.altText || `${productName} curtain photo ${idx + 1}`}
              width={160}
              height={160}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {idx === 0 && (
              <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-3xs font-semibold bg-stone-900/80 text-white backdrop-blur-2xs">
                Cover
              </span>
            )}
            <span className="sr-only">Click to enlarge</span>
          </button>
        ))}
      </div>

      {/* (4) Native <dialog> Lightbox */}
      <dialog
        ref={dialogRef}
        onCancel={(e) => {
          e.preventDefault();
          handleClose();
        }}
        className="fixed inset-0 m-auto p-0 max-w-4xl w-[94vw] bg-stone-950/95 text-white rounded-2xl shadow-2xl backdrop:bg-black/80 backdrop:backdrop-blur-sm open:flex open:flex-col overflow-hidden focus:outline-none z-50 border border-stone-800"
      >
        {currentImg && (
          <div
            className="flex flex-col h-full max-h-[90vh] touch-pan-y"
            style={{ touchAction: 'pan-y' }}
            onTouchStart={(e) => {
              touchStartX.current = e.touches[0].clientX;
              touchStartY.current = e.touches[0].clientY;
            }}
            onTouchEnd={(e) => {
              if (touchStartX.current === null || touchStartY.current === null) return;
              const deltaX = e.changedTouches[0].clientX - touchStartX.current;
              const deltaY = e.changedTouches[0].clientY - touchStartY.current;
              // Swipe left -> Next, Swipe right -> Prev (if horizontal intent)
              if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
                if (deltaX < 0) {
                  goToNext();
                } else {
                  goToPrev();
                }
              }
              touchStartX.current = null;
              touchStartY.current = null;
            }}
          >
            {/* Header Controls */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800/80 text-xs">
              <span className="text-stone-400 font-medium tabular-nums">
                Photo {activeIdx! + 1} of {total}
              </span>
              <button
                type="button"
                onClick={handleClose}
                className="min-h-[44px] min-w-[44px] -mr-2 px-3 py-2 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800/80 flex items-center justify-center text-sm font-semibold transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Close photo viewer (Escape)"
              >
                ✕ Close
              </button>
            </div>

            {/* Photo View with Chevrons */}
            <div className="relative flex-1 flex items-center justify-center p-3 sm:p-6 min-h-[280px] bg-black/40 overflow-hidden">
              {total > 1 && (
                <button
                  type="button"
                  onClick={goToPrev}
                  className="absolute left-2 sm:left-4 z-10 min-h-[44px] min-w-[44px] p-2 rounded-full bg-stone-900/80 hover:bg-stone-800 text-white flex items-center justify-center transition border border-stone-700/60 shadow-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-white"
                  aria-label="Previous photo (Left arrow)"
                >
                  <span className="text-lg leading-none" aria-hidden="true">
                    ‹
                  </span>
                </button>
              )}

              <img
                src={currentImg.url}
                alt={currentImg.altText || `${productName} curtain photo ${activeIdx! + 1}`}
                className="max-h-[65vh] max-w-full object-contain select-none"
              />

              {total > 1 && (
                <button
                  type="button"
                  onClick={goToNext}
                  className="absolute right-2 sm:right-4 z-10 min-h-[44px] min-w-[44px] p-2 rounded-full bg-stone-900/80 hover:bg-stone-800 text-white flex items-center justify-center transition border border-stone-700/60 shadow-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-white"
                  aria-label="Next photo (Right arrow)"
                >
                  <span className="text-lg leading-none" aria-hidden="true">
                    ›
                  </span>
                </button>
              )}
            </div>

            {/* Footer with Alt Text Caption */}
            <div className="px-4 py-3 bg-stone-900/90 border-t border-stone-800/80 text-xs">
              <p className="text-stone-200 leading-relaxed text-center sm:text-left">
                {currentImg.altText ? (
                  currentImg.altText
                ) : (
                  <span className="text-stone-400 italic">
                    {productName} (photo {activeIdx! + 1})
                  </span>
                )}
              </p>
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}

