'use client';

import { useState, useTransition } from 'react';
import { StockStatus } from '@/lib/types';
import { toggleStockAction } from './actions';

interface StockToggleProps {
  productId: string;
  initialStockStatus: StockStatus;
}

export function StockToggle({ productId, initialStockStatus }: StockToggleProps) {
  const [stockStatus, setStockStatus] = useState<StockStatus>(initialStockStatus);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleToggle = (target: StockStatus) => {
    if (target === stockStatus || isPending) return;

    const previous = stockStatus;
    // 1. Optimistic Update
    setStockStatus(target);
    setErrorMessage(null);

    // 2. Perform Server Action
    startTransition(async () => {
      try {
        const response = await toggleStockAction(productId, target);

        if (!response.success) {
          // Rollback on failure
          setStockStatus(previous);
          setErrorMessage(response.error || 'Failed to update stock status.');

          if (response.sessionExpired) {
            const nextPath = encodeURIComponent(
              window.location.pathname + window.location.search
            );
            window.location.href = `/admin/login?next=${nextPath}`;
          }
        }
      } catch {
        // Rollback on network / unexpected failure
        setStockStatus(previous);
        setErrorMessage('Network error. Reverted to previous status.');
      }
    });
  };

  const isInStock = stockStatus === 'in_stock';

  return (
    <div className="flex flex-col items-start sm:items-end">
      <div
        role="group"
        aria-label="Stock availability status"
        className="inline-flex p-1 bg-stone-100 rounded-lg border border-stone-200 select-none"
      >
        <button
          type="button"
          onClick={() => handleToggle('in_stock')}
          disabled={isPending}
          aria-pressed={isInStock}
          className={`min-h-[44px] min-w-[96px] px-3.5 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 disabled:cursor-not-allowed ${
            isInStock
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
          }`}
        >
          <span className="flex items-center justify-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isInStock ? 'bg-white' : 'bg-emerald-500'
              }`}
            />
            In Stock
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleToggle('out_of_stock')}
          disabled={isPending}
          aria-pressed={!isInStock}
          className={`min-h-[44px] min-w-[96px] px-3.5 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 disabled:cursor-not-allowed ${
            !isInStock
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
          }`}
        >
          <span className="flex items-center justify-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                !isInStock ? 'bg-white' : 'bg-amber-500'
              }`}
            />
            Out of Stock
          </span>
        </button>
      </div>

      {errorMessage && (
        <p
          role="alert"
          className="text-xs text-red-600 mt-1.5 max-w-[220px] text-left sm:text-right"
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
}

