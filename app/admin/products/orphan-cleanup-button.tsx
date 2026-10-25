'use client';

import { useState, useTransition } from 'react';
import { cleanupOrphanFilesAction } from './actions';

export function OrphanCleanupButton() {
  const [isPending, startTransition] = useTransition();
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const handleCleanup = () => {
    if (
      !confirm(
        'Run storage maintenance? This will permanently delete unreferenced storage files older than 24 hours.'
      )
    ) {
      return;
    }

    setResultMessage(null);
    startTransition(async () => {
      try {
        const res = await cleanupOrphanFilesAction();
        if (!res.success) {
          setResultMessage(res.error || 'Cleanup failed.');
        } else {
          setResultMessage(
            res.data?.deletedCount === 0
              ? 'No orphan files older than 24h found.'
              : `Cleaned up ${res.data?.deletedCount} orphan file(s).`
          );
        }
      } catch {
        setResultMessage('Error during storage maintenance.');
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={handleCleanup}
        className="min-h-[44px] px-3.5 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg border border-stone-200 transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
      >
        <svg
          className="w-3.5 h-3.5 text-stone-500"
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
        <span>{isPending ? 'Checking storage...' : 'Clean up orphan files'}</span>
      </button>
      {resultMessage && (
        <span className="text-xs text-stone-500 animate-fade-in">
          {resultMessage}
        </span>
      )}
    </div>
  );
}

