'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { DatabaseProduct, ProductStatus, getProductImageUrl } from '@/lib/types';
import { StockToggle } from './stock-toggle';

function formatKes(amount: number): string {
  return `KES ${amount.toLocaleString('en-KE')}`;
}

function StatusBadge({ status }: { status: ProductStatus }) {
  switch (status) {
    case 'published':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          Published
        </span>
      );
    case 'draft':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-stone-100 text-stone-600 border border-stone-200">
          Draft
        </span>
      );
    case 'archived':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          Archived
        </span>
      );
  }
}

type FilterStatus = 'all' | ProductStatus;

interface AdminProductsListProps {
  products: DatabaseProduct[];
}

export function AdminProductsList({ products }: AdminProductsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<FilterStatus>('all');

  // Client-side filtering by name or SKU and status pills
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return products.filter((product) => {
      const matchesStatus =
        selectedStatus === 'all' || product.status === selectedStatus;
      const matchesQuery =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query);
      return matchesStatus && matchesQuery;
    });
  }, [products, searchQuery, selectedStatus]);

  const counts = useMemo(() => {
    return {
      all: products.length,
      published: products.filter((p) => p.status === 'published').length,
      draft: products.filter((p) => p.status === 'draft').length,
      archived: products.filter((p) => p.status === 'archived').length,
    };
  }, [products]);

  return (
    <div className="space-y-4">
      {/* Search Bar & Status Filter Pills */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs">
        {/* Search input */}
        <div className="relative flex-1 min-w-0">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by curtain name or SKU..."
            enterKeyHint="search"
            className="w-full pl-9 pr-4 py-2 text-base sm:text-xs rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900 bg-stone-50/50"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs pointer-events-none">
            🔍
          </span>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-700 px-1"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status filter pills */}
        <div
          role="tablist"
          aria-label="Filter products by status"
          className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0"
        >
          {(
            [
              { key: 'all', label: 'All', count: counts.all },
              { key: 'published', label: 'Published', count: counts.published },
              { key: 'draft', label: 'Draft', count: counts.draft },
              { key: 'archived', label: 'Archived', count: counts.archived },
            ] as const
          ).map((tab) => {
            const isActive = selectedStatus === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setSelectedStatus(tab.key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-stone-900 text-white shadow-2xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70 hover:text-stone-900'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums ${
                    isActive
                      ? 'bg-stone-800 text-stone-200'
                      : 'bg-stone-200/80 text-stone-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Header if filtering */}
      {(searchQuery || selectedStatus !== 'all') && (
        <div className="flex items-center justify-between text-xs text-stone-500 px-1">
          <span>
            Showing <strong className="text-stone-800">{filteredProducts.length}</strong> of{' '}
            {products.length} curtains
          </span>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedStatus('all');
            }}
            className="text-amber-800 hover:underline font-medium"
          >
            Reset filters
          </button>
        </div>
      )}

      {/* Products List */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
          <p className="text-sm text-stone-600">
            {products.length === 0
              ? 'No products found in the catalogue.'
              : 'No products match the selected filters.'}
          </p>
          {(searchQuery || selectedStatus !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedStatus('all');
              }}
              className="mt-3 inline-flex items-center text-xs font-semibold text-stone-900 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProducts.map((product) => {
            const sortedImgs = (product.product_images || [])
              .slice()
              .sort((a, b) => a.sort_order - b.sort_order);
            const coverImg = sortedImgs[0];
            const coverUrl = getProductImageUrl(coverImg?.storage_path);

            return (
              <div
                key={product.id}
                className="bg-white rounded-xl border border-stone-200 p-4 sm:p-5 transition-shadow hover:shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Product Info & Thumbnail */}
                <div className="flex items-start gap-3.5 min-w-0">
                  {/* Thumbnail: Cover photo with explicit width/height or fabric swatch */}
                  {coverUrl ? (
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg border border-stone-200 shrink-0 overflow-hidden shadow-2xs bg-stone-100 relative">
                      <Image
                        src={coverUrl}
                        alt={coverImg?.alt_text || product.name}
                        width={64}
                        height={64}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg border border-stone-200/80 shrink-0 flex items-center justify-center relative overflow-hidden shadow-2xs"
                      style={{ backgroundColor: product.color_hex || '#e7e5e4' }}
                      aria-hidden="true"
                    >
                      <svg
                        className="w-full h-full opacity-20 text-stone-900"
                        viewBox="0 0 64 64"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M12 8 Q 16 32 12 56 M24 8 Q 28 32 24 56 M36 8 Q 40 32 36 56 M48 8 Q 52 32 48 56" />
                      </svg>
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    {/* (3) Show SKU beside the name, title on truncated names */}
                    <div className="flex flex-wrap items-center gap-2 mb-1 min-w-0">
                      <Link
                        href={`/admin/products/${product.id}`}
                        title={product.name}
                        className="text-base font-semibold text-stone-900 hover:text-stone-700 hover:underline truncate focus:outline-none focus:underline max-w-[240px] sm:max-w-md"
                      >
                        {product.name}
                      </Link>
                      <span className="text-xs font-semibold text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200/80 shrink-0 tabular-nums">
                        {product.sku}
                      </span>
                      <StatusBadge status={product.status} />
                    </div>

                    <div className="flex items-center gap-x-2 text-xs text-stone-500 font-medium">
                      <span className="text-stone-900 font-semibold tabular-nums">
                        {formatKes(product.price_kes)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Controls: Edit Link & One-Tap Stock Toggle */}
                <div className="pt-2 sm:pt-0 border-t border-stone-100 sm:border-0 shrink-0 flex flex-wrap sm:flex-nowrap items-center gap-3 sm:justify-end">
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="min-h-[44px] px-3.5 py-2 text-xs font-medium text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors inline-flex items-center justify-center border border-stone-200"
                  >
                    Edit
                  </Link>
                  <StockToggle
                    productId={product.id}
                    initialStockStatus={product.stock_status}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

