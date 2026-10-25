'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { generateSlug } from '@/lib/slug';
import { renameProductSlugAction } from './actions';

interface SlugRenamerProps {
  productId: string;
  currentSlug: string;
  onSlugChanged?: (newSlug: string) => void;
}

export function SlugRenamer({
  productId,
  currentSlug,
  onSlugChanged,
}: SlugRenamerProps) {
  const router = useRouter();
  const [activeSlug, setActiveSlug] = useState(currentSlug);
  const [isEditing, setIsEditing] = useState(false);
  const [newSlugInput, setNewSlugInput] = useState(currentSlug);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const previewSlug = generateSlug(newSlugInput);
  const isUnchanged = previewSlug === activeSlug;

  const handleStartEditing = () => {
    setNewSlugInput(activeSlug);
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setErrorMessage(null);
    setShowConfirmModal(false);
  };

  const handleConfirmRename = () => {
    if (isUnchanged || !previewSlug) return;
    setShowConfirmModal(false);
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const res = await renameProductSlugAction(productId, previewSlug);
        if (!res.success) {
          setErrorMessage(res.error || 'Failed to rename URL slug.');
          return;
        }

        setActiveSlug(previewSlug);
        setIsEditing(false);
        setSuccessMessage(`URL slug successfully updated to "/curtains/${previewSlug}".`);
        if (onSlugChanged) {
          onSlugChanged(previewSlug);
        }
        router.refresh();
      } catch {
        setErrorMessage('A network error occurred while renaming the slug.');
      }
    });
  };

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5 sm:p-7 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
        <div>
          <h2 className="text-base font-semibold text-stone-900">
            Product URL & Permanent Redirection
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Public web address for this curtain in the Tari catalogue.
          </p>
        </div>

        {!isEditing && (
          <button
            type="button"
            onClick={handleStartEditing}
            className="min-h-[44px] px-3.5 py-2 text-xs font-semibold text-stone-700 hover:text-stone-950 hover:bg-stone-100 rounded-lg border border-stone-200 transition-colors cursor-pointer self-start sm:self-auto"
          >
            Change URL Slug
          </button>
        )}
      </div>

      {successMessage && (
        <div
          role="status"
          className="p-3 text-xs rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium"
        >
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="p-3 text-xs rounded-md bg-red-50 border border-red-200 text-red-800 font-medium"
        >
          {errorMessage}
        </div>
      )}

      {!isEditing ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-stone-600 font-mono bg-stone-50 p-3 rounded-lg border border-stone-200">
            <span className="text-stone-400 select-none">/curtains/</span>
            <span className="font-semibold text-stone-900">{activeSlug}</span>
            <a
              href={`/curtains/${activeSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-stone-500 hover:text-stone-900 text-2xs uppercase tracking-wider font-sans font-semibold underline"
            >
              Open Page ↗
            </a>
          </div>
          <p className="text-2xs text-stone-500">
            Slug changes automatically preserve old URLs via 301 permanent redirects.
          </p>
        </div>
      ) : (
        <div className="space-y-4 pt-1">
          <div>
            <label
              htmlFor="new_slug"
              className="block text-xs font-semibold text-stone-700 mb-1"
            >
              New URL Slug
            </label>
            <div className="flex items-center rounded-lg border border-stone-300 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-stone-900 focus-within:border-stone-900">
              <span className="px-3 text-xs text-stone-400 bg-stone-50 border-r border-stone-200 font-mono select-none py-3">
                /curtains/
              </span>
              <input
                id="new_slug"
                type="text"
                value={newSlugInput}
                onChange={(e) => setNewSlugInput(e.target.value)}
                disabled={isPending}
                placeholder="new-curtain-slug"
                className="w-full min-h-[44px] px-3 text-xs font-mono text-stone-900 focus:outline-none"
              />
            </div>
            <p className="text-2xs text-stone-500 mt-1">
              Preview: <code className="text-stone-800 font-semibold">/curtains/{previewSlug}</code>
            </p>
          </div>

          {/* (2) Warn that old links will keep working */}
          <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-lg text-xs text-amber-900 leading-relaxed space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <span>ℹ</span> Old Links Will Keep Working
            </p>
            <p className="text-2xs text-amber-800">
              Renaming from <code className="font-semibold">/curtains/{activeSlug}</code> to{' '}
              <code className="font-semibold">/curtains/{previewSlug}</code> will automatically create
              a 301 permanent redirect. Any existing customer bookmarks or WhatsApp shares will resolve
              directly to the new address.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              disabled={isPending}
              onClick={handleCancelEditing}
              className="min-h-[44px] px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg border border-stone-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isPending || isUnchanged || !previewSlug}
              onClick={() => setShowConfirmModal(true)}
              className="min-h-[44px] px-4 py-2 text-xs font-semibold bg-stone-900 text-white hover:bg-stone-800 rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Update URL Slug
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs"
        >
          <div className="bg-white rounded-xl border border-stone-200 p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="font-display text-lg font-bold text-stone-900">
              Confirm URL Slug Change
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Are you sure you want to change this curtain&apos;s address to:
            </p>
            <div className="p-2.5 bg-stone-100 rounded-md font-mono text-xs text-stone-900 break-all">
              /curtains/{previewSlug}
            </div>
            <p className="text-2xs text-stone-500">
              The old URL (<code className="text-stone-700">/curtains/{activeSlug}</code>) will
              permanently redirect to this new address.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setShowConfirmModal(false)}
                className="min-h-[44px] px-4 py-2 rounded-lg border border-stone-300 text-stone-700 text-xs font-semibold hover:bg-stone-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleConfirmRename}
                className="min-h-[44px] px-4 py-2 rounded-lg bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 cursor-pointer"
              >
                {isPending ? 'Updating...' : 'Yes, Change Slug'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

