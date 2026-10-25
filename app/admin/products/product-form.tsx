'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DatabaseProduct, DatabaseProductImage, LightTransmissionLevel, ProductStatus } from '@/lib/types';
import { generateSlug } from '@/lib/slug';
import { ImageManager } from './image-manager';
import { SlugRenamer } from './slug-renamer';
import {
  createProductAction,
  updateProductAction,
  updateProductStatusAction,
  ActionResponse,
} from './actions';

interface ProductFormProps {
  initialProduct?: DatabaseProduct;
  initialImages?: DatabaseProductImage[];
  isNew?: boolean;
}

const LIGHT_TRANSMISSION_OPTIONS: { value: LightTransmissionLevel; label: string }[] = [
  { value: 'blackout', label: 'Blackout' },
  { value: 'dimout', label: 'Dimout' },
  { value: 'semi_sheer', label: 'Semi-Sheer' },
  { value: 'sheer', label: 'Sheer' },
];

export function ProductForm({
  initialProduct,
  initialImages = [],
  isNew = false,
}: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form Fields State
  const [name, setName] = useState(initialProduct?.name || '');
  const [sku, setSku] = useState(initialProduct?.sku || '');
  const [priceKes, setPriceKes] = useState(initialProduct?.price_kes?.toString() || '');
  const [widthCm, setWidthCm] = useState(initialProduct?.width_cm?.toString() || '260');
  const [dropCm, setDropCm] = useState(initialProduct?.drop_cm?.toString() || '240');
  const [headerStyle, setHeaderStyle] = useState(initialProduct?.header_style || 'eyelet');
  const [materialName, setMaterialName] = useState(initialProduct?.material_name || '');
  const [colorName, setColorName] = useState(initialProduct?.color_name || '');
  const [colorHex, setColorHex] = useState(initialProduct?.color_hex || '#c29b72');
  const [lightTransmission, setLightTransmission] = useState<LightTransmissionLevel>(
    initialProduct?.light_transmission || 'dimout'
  );
  const [description, setDescription] = useState(initialProduct?.description || '');

  // Images Count State for Publishing Validation
  const [imagesCount, setImagesCount] = useState<number>(initialImages.length);

  // Status State
  const [currentStatus, setCurrentStatus] = useState<ProductStatus>(
    initialProduct?.status || 'draft'
  );

  // Error & Feedback State
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Confirmation Dialog State for Status Transitions
  const [pendingStatusAction, setPendingStatusAction] = useState<{
    targetStatus: ProductStatus;
    title: string;
    message: string;
    confirmButtonText: string;
    confirmButtonVariant: 'primary' | 'destructive' | 'neutral';
  } | null>(null);

  // Slug derivation
  const previewSlug = isNew ? generateSlug(name) : initialProduct?.slug || '';

  // Hex color synchronization handler
  const handleHexChange = (newHex: string) => {
    let formatted = newHex.trim();
    if (!formatted.startsWith('#') && formatted.length > 0) {
      formatted = '#' + formatted;
    }
    setColorHex(formatted);
  };

  // Submit Handler for Create / Update
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setGeneralError(null);
    setSuccessMessage(null);
    setFieldErrors({});

    const formData = new FormData();
    formData.append('name', name);
    formData.append('sku', sku);
    formData.append('price_kes', priceKes);
    formData.append('width_cm', widthCm);
    formData.append('drop_cm', dropCm);
    formData.append('header_style', headerStyle);
    formData.append('material_name', materialName);
    formData.append('color_name', colorName);
    formData.append('color_hex', colorHex);
    formData.append('light_transmission', lightTransmission);
    formData.append('description', description);

    startTransition(async () => {
      try {
        let res: ActionResponse<{ id: string; slug: string }>;

        if (isNew) {
          res = await createProductAction(formData);
        } else {
          if (!initialProduct?.id) return;
          res = await updateProductAction(initialProduct.id, formData);
        }

        if (!res.success) {
          if (res.sessionExpired) {
            router.push('/admin/login?next=/admin/products');
            return;
          }
          setGeneralError(res.error || 'Failed to save product.');
          if (res.fieldErrors) {
            setFieldErrors(res.fieldErrors);
          }
          return;
        }

        setSuccessMessage(isNew ? 'Product created as draft.' : 'Product details saved successfully.');

        if (isNew && res.data?.id) {
          router.push(`/admin/products/${res.data.id}`);
        } else {
          router.refresh();
        }
      } catch {
        setGeneralError('A network error occurred. Please try again.');
      }
    });
  };

  // Status Transition Action with Confirmation
  const handleStatusTransition = (targetStatus: ProductStatus) => {
    if (!initialProduct?.id || isPending) return;

    startTransition(async () => {
      try {
        const res = await updateProductStatusAction(initialProduct.id, targetStatus);
        if (!res.success) {
          if (res.sessionExpired) {
            router.push('/admin/login?next=/admin/products');
            return;
          }
          setGeneralError(res.error || 'Failed to change product status.');
          setPendingStatusAction(null);
          return;
        }

        setCurrentStatus(targetStatus);
        setPendingStatusAction(null);
        setSuccessMessage(`Product status updated to ${targetStatus}.`);
        router.refresh();
      } catch {
        setGeneralError('Network error while changing status.');
        setPendingStatusAction(null);
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Top Banner & Breadcrumb Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/products"
            className="text-xs font-semibold text-stone-500 hover:text-stone-900 inline-flex items-center gap-1.5 mb-2 focus:outline-none focus:underline"
          >
            ← Back to Inventory
          </Link>
          <h1 className="font-display text-2xl font-bold text-stone-900 tracking-tight">
            {isNew ? 'Add New Curtain' : `Edit: ${name || 'Product'}`}
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">
            {isNew
              ? 'New products are initially saved as draft.'
              : 'Update product specifications and catalogue availability.'}
          </p>
        </div>

        {/* Status indicator on edit mode */}
        {!isNew && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500">Status:</span>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                currentStatus === 'published'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : currentStatus === 'archived'
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : 'bg-stone-200 text-stone-700 border border-stone-300'
              }`}
            >
              {currentStatus}
            </span>
          </div>
        )}
      </div>

      {/* General Alerts */}
      {generalError && (
        <div
          role="alert"
          className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm font-medium flex items-center justify-between"
        >
          <span>{generalError}</span>
          <button
            type="button"
            onClick={() => setGeneralError(null)}
            className="text-red-600 hover:text-red-900 text-xs font-bold px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center justify-between"
        >
          <span>{successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-900 text-xs font-bold px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Product Edit Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-stone-200 p-5 sm:p-7 shadow-xs space-y-6">
          <h2 className="text-base font-semibold text-stone-900 border-b border-stone-100 pb-3">
            Core Specifications
          </h2>

          {/* Name & Slug */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-stone-800 mb-1.5"
              >
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
                placeholder="e.g. Warm Taupe Heavy Drape"
                className={`w-full min-h-[44px] px-3.5 rounded-lg border text-sm text-stone-900 bg-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-stone-900 transition-colors disabled:opacity-50 ${
                  fieldErrors.name ? 'border-red-500 bg-red-50/20' : 'border-stone-300'
                }`}
              />
              {fieldErrors.name && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.name}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="slug"
                  className="block text-sm font-medium text-stone-800"
                >
                  URL Slug
                </label>
                <span className="text-2xs uppercase tracking-wider font-semibold text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200">
                  {isNew ? 'Auto-derived' : 'Locked'}
                </span>
              </div>
              <input
                id="slug"
                name="slug"
                type="text"
                readOnly
                disabled
                value={previewSlug}
                className="w-full min-h-[44px] px-3.5 rounded-lg border border-stone-200 text-sm text-stone-600 bg-stone-50 select-all font-mono text-xs"
              />
              <p className="text-xs text-stone-500 mt-1">
                {isNew
                  ? 'Slug is generated from the product name and locked after first save.'
                  : 'Slug is locked after creation. Slug changes and 301 redirects are managed in step 2d.'}
              </p>
            </div>
          </div>

          {/* SKU & Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label
                htmlFor="sku"
                className="block text-sm font-medium text-stone-800 mb-1.5"
              >
                SKU (Stock Keeping Unit) <span className="text-red-500">*</span>
              </label>
              <input
                id="sku"
                name="sku"
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                disabled={isPending}
                placeholder="e.g. TAR-WTHD-01"
                className={`w-full min-h-[44px] px-3.5 rounded-lg border text-sm text-stone-900 bg-white placeholder-stone-400 font-mono focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-stone-900 transition-colors disabled:opacity-50 ${
                  fieldErrors.sku ? 'border-red-500 bg-red-50/20' : 'border-stone-300'
                }`}
              />
              {fieldErrors.sku ? (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.sku}</p>
              ) : (
                <p className="text-xs text-stone-500 mt-1">Unique store identifier.</p>
              )}
            </div>

            <div>
              <label
                htmlFor="price_kes"
                className="block text-sm font-medium text-stone-800 mb-1.5"
              >
                Price (KES) <span className="text-red-500">*</span>
              </label>
              <input
                id="price_kes"
                name="price_kes"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                required
                value={priceKes}
                onChange={(e) => setPriceKes(e.target.value)}
                disabled={isPending}
                placeholder="e.g. 4800"
                className={`w-full min-h-[44px] px-3.5 rounded-lg border text-sm text-stone-900 bg-white placeholder-stone-400 tabular-nums focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-stone-900 transition-colors disabled:opacity-50 ${
                  fieldErrors.price_kes ? 'border-red-500 bg-red-50/20' : 'border-stone-300'
                }`}
              />
              {fieldErrors.price_kes && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.price_kes}</p>
              )}
            </div>
          </div>

          {/* Dimensions & Header Style */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label
                htmlFor="width_cm"
                className="block text-sm font-medium text-stone-800 mb-1.5"
              >
                Width (cm) <span className="text-red-500">*</span>
              </label>
              <input
                id="width_cm"
                name="width_cm"
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                required
                value={widthCm}
                onChange={(e) => setWidthCm(e.target.value)}
                disabled={isPending}
                placeholder="260"
                className={`w-full min-h-[44px] px-3.5 rounded-lg border text-sm text-stone-900 bg-white placeholder-stone-400 tabular-nums focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-stone-900 transition-colors disabled:opacity-50 ${
                  fieldErrors.width_cm ? 'border-red-500 bg-red-50/20' : 'border-stone-300'
                }`}
              />
              {fieldErrors.width_cm && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.width_cm}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="drop_cm"
                className="block text-sm font-medium text-stone-800 mb-1.5"
              >
                Drop / Height (cm) <span className="text-red-500">*</span>
              </label>
              <input
                id="drop_cm"
                name="drop_cm"
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                required
                value={dropCm}
                onChange={(e) => setDropCm(e.target.value)}
                disabled={isPending}
                placeholder="240"
                className={`w-full min-h-[44px] px-3.5 rounded-lg border text-sm text-stone-900 bg-white placeholder-stone-400 tabular-nums focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-stone-900 transition-colors disabled:opacity-50 ${
                  fieldErrors.drop_cm ? 'border-red-500 bg-red-50/20' : 'border-stone-300'
                }`}
              />
              {fieldErrors.drop_cm && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.drop_cm}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="header_style"
                className="block text-sm font-medium text-stone-800 mb-1.5"
              >
                Header Style <span className="text-red-500">*</span>
              </label>
              <select
                id="header_style"
                name="header_style"
                value={headerStyle}
                onChange={(e) => setHeaderStyle(e.target.value)}
                disabled={isPending}
                className="w-full min-h-[44px] px-3.5 rounded-lg border border-stone-300 text-sm text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-stone-900 transition-colors disabled:opacity-50"
              >
                <option value="eyelet">Eyelet (Ring top)</option>
                <option value="pencil-pleat">Pencil Pleat</option>
              </select>
              {fieldErrors.header_style && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.header_style}</p>
              )}
            </div>
          </div>
        </div>

        {/* Fabric & Appearance */}
        <div className="bg-white rounded-xl border border-stone-200 p-5 sm:p-7 shadow-xs space-y-6">
          <h2 className="text-base font-semibold text-stone-900 border-b border-stone-100 pb-3">
            Fabric & Visuals
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label
                htmlFor="material_name"
                className="block text-sm font-medium text-stone-800 mb-1.5"
              >
                Material & Weave <span className="text-red-500">*</span>
              </label>
              <input
                id="material_name"
                name="material_name"
                type="text"
                required
                value={materialName}
                onChange={(e) => setMaterialName(e.target.value)}
                disabled={isPending}
                placeholder="e.g. Heavy Textured Linen-Cotton Slub"
                className={`w-full min-h-[44px] px-3.5 rounded-lg border text-sm text-stone-900 bg-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-stone-900 transition-colors disabled:opacity-50 ${
                  fieldErrors.material_name ? 'border-red-500 bg-red-50/20' : 'border-stone-300'
                }`}
              />
              {fieldErrors.material_name && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.material_name}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="light_transmission"
                className="block text-sm font-medium text-stone-800 mb-1.5"
              >
                Light Transmission <span className="text-red-500">*</span>
              </label>
              {/* (1) Light transmission as a dropdown of the four category labels only */}
              <select
                id="light_transmission"
                name="light_transmission"
                value={lightTransmission}
                onChange={(e) => setLightTransmission(e.target.value as LightTransmissionLevel)}
                disabled={isPending}
                className="w-full min-h-[44px] px-3.5 rounded-lg border border-stone-300 text-sm text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-stone-900 transition-colors disabled:opacity-50"
              >
                {LIGHT_TRANSMISSION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {fieldErrors.light_transmission && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.light_transmission}</p>
              )}
            </div>
          </div>

          {/* Color Name & Hex Picker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label
                htmlFor="color_name"
                className="block text-sm font-medium text-stone-800 mb-1.5"
              >
                Color Name <span className="text-red-500">*</span>
              </label>
              <input
                id="color_name"
                name="color_name"
                type="text"
                required
                value={colorName}
                onChange={(e) => setColorName(e.target.value)}
                disabled={isPending}
                placeholder="e.g. Savannah Ochre"
                className={`w-full min-h-[44px] px-3.5 rounded-lg border text-sm text-stone-900 bg-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-stone-900 transition-colors disabled:opacity-50 ${
                  fieldErrors.color_name ? 'border-red-500 bg-red-50/20' : 'border-stone-300'
                }`}
              />
              {fieldErrors.color_name && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.color_name}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="color_hex"
                className="block text-sm font-medium text-stone-800 mb-1.5"
              >
                Color Hex Code <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-3">
                {/* Visual Native Colour Picker */}
                <div className="relative shrink-0">
                  <input
                    id="color_picker"
                    type="color"
                    value={colorHex.startsWith('#') && colorHex.length === 7 ? colorHex : '#c29b72'}
                    onChange={(e) => handleHexChange(e.target.value)}
                    disabled={isPending}
                    aria-label="Color visual picker"
                    className="w-11 h-11 rounded-lg border border-stone-300 cursor-pointer p-0.5 bg-white disabled:cursor-not-allowed"
                  />
                </div>

                {/* Hex Text Input */}
                <div className="flex-1">
                  <input
                    id="color_hex"
                    name="color_hex"
                    type="text"
                    required
                    maxLength={7}
                    pattern="^#[0-9a-fA-F]{6}$"
                    value={colorHex}
                    onChange={(e) => handleHexChange(e.target.value)}
                    disabled={isPending}
                    placeholder="#c29b72"
                    className={`w-full min-h-[44px] px-3.5 rounded-lg border text-sm text-stone-900 font-mono bg-white uppercase placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-stone-900 transition-colors disabled:opacity-50 ${
                      fieldErrors.color_hex ? 'border-red-500 bg-red-50/20' : 'border-stone-300'
                    }`}
                  />
                </div>

                {/* Live Swatch Preview */}
                <div
                  className="w-11 h-11 rounded-lg border border-stone-300/80 shadow-2xs shrink-0"
                  style={{ backgroundColor: colorHex }}
                  title={`Color swatch: ${colorHex}`}
                  aria-hidden="true"
                />
              </div>
              {fieldErrors.color_hex && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.color_hex}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-stone-800 mb-1.5"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isPending}
              placeholder="Detailed description of the curtain panel..."
              className="w-full p-3.5 rounded-lg border border-stone-300 text-sm text-stone-900 bg-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-stone-900 transition-colors disabled:opacity-50"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <Link
            href="/admin/products"
            className="min-h-[44px] px-5 py-2.5 rounded-lg border border-stone-300 text-stone-700 font-medium text-sm hover:bg-stone-100 transition-colors text-center inline-flex items-center justify-center"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={isPending}
            className="min-h-[44px] px-6 py-2.5 rounded-lg bg-stone-900 text-white font-medium text-sm hover:bg-stone-800 active:bg-stone-950 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-900 transition-colors disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            {isPending
              ? 'Saving...'
              : isNew
              ? 'Save as Draft'
              : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* (2) URL Slug & Permanent 301 Redirection Management (Available in Edit Mode) */}
      {!isNew && initialProduct?.id && (
        <SlugRenamer
          productId={initialProduct.id}
          currentSlug={initialProduct.slug}
        />
      )}

      {/* (2) Photography Management (Available in Edit Mode) */}
      {!isNew && initialProduct?.id && (
        <ImageManager
          productId={initialProduct.id}
          initialImages={initialImages}
          onImagesChange={(imgs) => setImagesCount(imgs.length)}
        />
      )}

      {/* (2) Status Transition Actions with Explicit Confirmation */}
      {!isNew && initialProduct?.id && (
        <div className="bg-white rounded-xl border border-stone-200 p-5 sm:p-7 shadow-xs space-y-4">
          <div className="border-b border-stone-100 pb-3">
            <h2 className="text-base font-semibold text-stone-900">
              Publication & Catalogue Status
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Change the public visibility of this curtain panel in the Tari catalogue.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            {currentStatus === 'draft' && (
              <div>
                <button
                  type="button"
                  disabled={isPending || imagesCount === 0}
                  onClick={() =>
                    setPendingStatusAction({
                      targetStatus: 'published',
                      title: 'Publish Product to Catalogue?',
                      message:
                        'This product will immediately appear in the public catalogue and customer searches.',
                      confirmButtonText: 'Yes, Publish Product',
                      confirmButtonVariant: 'primary',
                    })
                  }
                  className="min-h-[44px] px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 active:bg-emerald-800 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Publish to Catalogue
                </button>
                {imagesCount === 0 && (
                  <p className="text-xs text-amber-700 font-medium mt-1.5 flex items-center gap-1">
                    <span>⚠</span> Publishing requires at least one curtain photo.
                  </p>
                )}
              </div>
            )}

            {currentStatus === 'published' && (
              <>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    setPendingStatusAction({
                      targetStatus: 'draft',
                      title: 'Unpublish Product to Draft?',
                      message:
                        'This product will be removed from the public catalogue. Direct links will no longer be visible to visitors.',
                      confirmButtonText: 'Yes, Revert to Draft',
                      confirmButtonVariant: 'neutral',
                    })
                  }
                  className="min-h-[44px] px-4 py-2 rounded-lg border border-stone-300 text-stone-700 text-xs font-semibold hover:bg-stone-100 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Unpublish to Draft
                </button>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    setPendingStatusAction({
                      targetStatus: 'archived',
                      title: 'Archive This Product?',
                      message:
                        'Archiving removes the curtain from the catalogue. Existing bookmarks or links will display a "no longer available" notice.',
                      confirmButtonText: 'Yes, Archive Product',
                      confirmButtonVariant: 'destructive',
                    })
                  }
                  className="min-h-[44px] px-4 py-2 rounded-lg bg-amber-50 text-amber-800 border border-amber-300 text-xs font-semibold hover:bg-amber-100 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Archive Product
                </button>
              </>
            )}

            {currentStatus === 'archived' && (
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  setPendingStatusAction({
                    targetStatus: 'draft',
                    title: 'Restore Product to Draft?',
                    message:
                      'This product will be moved back to draft status so you can review or re-publish it.',
                    confirmButtonText: 'Yes, Restore to Draft',
                    confirmButtonVariant: 'neutral',
                  })
                }
                className="min-h-[44px] px-4 py-2 rounded-lg border border-stone-300 text-stone-700 text-xs font-semibold hover:bg-stone-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                Restore to Draft
              </button>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal Dialog */}
      {pendingStatusAction && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs"
        >
          <div className="bg-white rounded-xl border border-stone-200 p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="font-display text-lg font-bold text-stone-900">
              {pendingStatusAction.title}
            </h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              {pendingStatusAction.message}
            </p>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setPendingStatusAction(null)}
                className="min-h-[44px] px-4 py-2 rounded-lg border border-stone-300 text-stone-700 text-xs font-semibold hover:bg-stone-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleStatusTransition(pendingStatusAction.targetStatus)}
                className={`min-h-[44px] px-4 py-2 rounded-lg text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                  pendingStatusAction.confirmButtonVariant === 'destructive'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : pendingStatusAction.confirmButtonVariant === 'primary'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-stone-900 hover:bg-stone-800'
                }`}
              >
                {isPending ? 'Updating...' : pendingStatusAction.confirmButtonText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

