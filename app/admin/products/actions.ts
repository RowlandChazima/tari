'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { LightTransmissionLevel, ProductStatus, StockStatus } from '@/lib/types';
import { generateSlug, getUniqueSlug } from '@/lib/slug';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string>;
  sessionExpired?: boolean;
}

export interface ToggleStockResponse {
  success: boolean;
  stockStatus?: StockStatus;
  error?: string;
  sessionExpired?: boolean;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;
const SKU_REGEX = /^[A-Za-z0-9_-]{2,50}$/;

const VALID_LIGHT_TRANSMISSIONS: LightTransmissionLevel[] = [
  'blackout',
  'dimout',
  'semi_sheer',
  'sheer',
];

interface ValidatedProductFields {
  name: string;
  sku: string;
  price_kes: number;
  width_cm: number;
  drop_cm: number;
  header_style: string;
  material_name: string;
  color_name: string;
  color_hex: string;
  light_transmission: LightTransmissionLevel;
  description: string;
}

/**
 * Strict server-side validation for product fields.
 */
function validateProductFields(formData: FormData): {
  values?: ValidatedProductFields;
  fieldErrors?: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  const name = (formData.get('name') as string)?.trim() || '';
  if (!name || name.length < 2) {
    errors.name = 'Product name must be at least 2 characters.';
  } else if (name.length > 150) {
    errors.name = 'Product name must not exceed 150 characters.';
  }

  const sku = (formData.get('sku') as string)?.trim().toUpperCase() || '';
  if (!sku) {
    errors.sku = 'SKU is required.';
  } else if (!SKU_REGEX.test(sku)) {
    errors.sku = 'SKU must be 2-50 alphanumeric characters or hyphens/underscores.';
  }

  const rawPrice = formData.get('price_kes') as string;
  const price_kes = Number.parseInt(rawPrice, 10);
  if (Number.isNaN(price_kes) || price_kes < 0) {
    errors.price_kes = 'Price must be a valid non-negative integer in KES.';
  }

  const rawWidth = formData.get('width_cm') as string;
  const width_cm = Number.parseInt(rawWidth, 10);
  if (Number.isNaN(width_cm) || width_cm <= 0 || width_cm > 1000) {
    errors.width_cm = 'Width must be a positive integer between 1 and 1000 cm.';
  }

  const rawDrop = formData.get('drop_cm') as string;
  const drop_cm = Number.parseInt(rawDrop, 10);
  if (Number.isNaN(drop_cm) || drop_cm <= 0 || drop_cm > 1000) {
    errors.drop_cm = 'Drop must be a positive integer between 1 and 1000 cm.';
  }

  const header_style = (formData.get('header_style') as string)?.trim() || 'eyelet';
  if (!header_style) {
    errors.header_style = 'Header style is required.';
  }

  const material_name = (formData.get('material_name') as string)?.trim() || '';
  if (!material_name || material_name.length < 2) {
    errors.material_name = 'Material & weave description is required.';
  }

  const color_name = (formData.get('color_name') as string)?.trim() || '';
  if (!color_name || color_name.length < 2) {
    errors.color_name = 'Color name is required.';
  }

  const color_hex = (formData.get('color_hex') as string)?.trim().toLowerCase() || '';
  if (!color_hex || !HEX_COLOR_REGEX.test(color_hex)) {
    errors.color_hex = 'A valid 6-character hex color code (e.g. #c29b72) is required.';
  }

  const light_transmission = formData.get('light_transmission') as LightTransmissionLevel;
  if (!VALID_LIGHT_TRANSMISSIONS.includes(light_transmission)) {
    errors.light_transmission = 'Select a valid light transmission category.';
  }

  const description = (formData.get('description') as string)?.trim() || '';

  if (Object.keys(errors).length > 0) {
    return { fieldErrors: errors };
  }

  return {
    values: {
      name,
      sku,
      price_kes,
      width_cm,
      drop_cm,
      header_style,
      material_name,
      color_name,
      color_hex,
      light_transmission,
      description,
    },
  };
}

/**
 * Handle Postgres 23505 unique constraint violation with friendly messages.
 */
function handleUniqueViolation(error: { code?: string; message?: string; details?: string }): string {
  const msg = `${error.message || ''} ${error.details || ''}`.toLowerCase();
  if (msg.includes('sku') || msg.includes('products_sku_key')) {
    return 'A product with this SKU already exists. Please choose a unique SKU.';
  }
  if (msg.includes('slug') || msg.includes('products_slug_key')) {
    return 'A product with this URL slug already exists. Please modify the product name.';
  }
  return 'A record with duplicate unique values (SKU or slug) already exists.';
}

/**
 * Authenticate current user via getUser() and verify membership in admins table.
 */
async function authenticateAdmin() {
  const supabase = await createClient();
  if (!supabase) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Database client unavailable');
    }
    return { supabase: null, user: null };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { supabase, user: null, sessionExpired: true };
  }

  const { data: adminRecord, error: adminError } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .single();

  if (adminError || !adminRecord) {
    return { supabase, user, unauthorized: true };
  }

  return { supabase, user };
}

/**
 * Helper to revalidate all affected product routes using the 'page' type.
 */
function revalidateProductPaths(slug?: string, productId?: string) {
  revalidatePath('/', 'page');
  revalidatePath('/curtains/[slug]', 'page');
  if (slug) {
    revalidatePath(`/curtains/${slug}`, 'page');
  }
  revalidatePath('/admin/products', 'page');
  if (productId) {
    revalidatePath(`/admin/products/${productId}`, 'page');
  }
}

/**
 * (1) Create Product Action
 * Saves new product with status 'draft'.
 * Slug is generated from name and collision-checked by suffixing.
 */
export async function createProductAction(
  formData: FormData
): Promise<ActionResponse<{ id: string; slug: string }>> {
  // 1. Authenticate and check admin
  const auth = await authenticateAdmin();
  if (auth.sessionExpired) {
    return { success: false, error: 'Your session has expired. Please sign in again.', sessionExpired: true };
  }
  if (auth.unauthorized) {
    return { success: false, error: 'Unauthorized: Only verified admins can create products.' };
  }

  // 2. Strict field validation
  const validation = validateProductFields(formData);
  if (validation.fieldErrors || !validation.values) {
    return { success: false, error: 'Please correct the highlighted errors.', fieldErrors: validation.fieldErrors };
  }

  const values = validation.values;

  // Development mock fallback if offline
  if (!auth.supabase) {
    const mockId = `mock-${Date.now()}`;
    const mockSlug = generateSlug(values.name);
    return { success: true, data: { id: mockId, slug: mockSlug } };
  }

  // 3. Generate unique slug with collision suffixing
  let uniqueSlug: string;
  try {
    const baseSlug = generateSlug(values.name);
    uniqueSlug = await getUniqueSlug(auth.supabase, baseSlug);
  } catch (err: unknown) {
    return { success: false, error: (err as Error)?.message || 'Failed to generate unique slug.' };
  }

  // 4. Insert row with status 'draft'
  const { data, error } = await auth.supabase
    .from('products')
    .insert({
      slug: uniqueSlug,
      sku: values.sku,
      name: values.name,
      description: values.description,
      price_kes: values.price_kes,
      width_cm: values.width_cm,
      drop_cm: values.drop_cm,
      header_style: values.header_style,
      material_name: values.material_name,
      color_name: values.color_name,
      color_hex: values.color_hex,
      light_transmission: values.light_transmission,
      status: 'draft', // Always draft on first save
      stock_status: 'in_stock',
    })
    .select('id, slug, status');

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: handleUniqueViolation(error) };
    }
    return { success: false, error: error.message || 'Database error creating product.' };
  }

  // 5. Verify exactly one row changed
  if (!data || data.length !== 1) {
    return { success: false, error: 'Creation failed: unexpected database result.' };
  }

  const created = data[0];

  // 6. Revalidate cache
  revalidateProductPaths(created.slug, created.id);

  return { success: true, data: { id: created.id, slug: created.slug } };
}

/**
 * (2) Update Product Action
 * Slug is locked and cannot be changed here (slug changes are step 2d).
 */
export async function updateProductAction(
  productId: string,
  formData: FormData
): Promise<ActionResponse<{ id: string; slug: string }>> {
  if (!productId || !UUID_REGEX.test(productId)) {
    return { success: false, error: 'Invalid product ID.' };
  }

  // 1. Authenticate and check admin
  const auth = await authenticateAdmin();
  if (auth.sessionExpired) {
    return { success: false, error: 'Your session has expired. Please sign in again.', sessionExpired: true };
  }
  if (auth.unauthorized) {
    return { success: false, error: 'Unauthorized: Only verified admins can edit products.' };
  }

  // 2. Strict field validation
  const validation = validateProductFields(formData);
  if (validation.fieldErrors || !validation.values) {
    return { success: false, error: 'Please correct the highlighted errors.', fieldErrors: validation.fieldErrors };
  }

  const values = validation.values;

  // Development mock fallback if offline
  if (!auth.supabase) {
    return { success: true, data: { id: productId, slug: generateSlug(values.name) } };
  }

  // 3. Update product (Slug is strictly NOT updated)
  const { data, error } = await auth.supabase
    .from('products')
    .update({
      sku: values.sku,
      name: values.name,
      description: values.description,
      price_kes: values.price_kes,
      width_cm: values.width_cm,
      drop_cm: values.drop_cm,
      header_style: values.header_style,
      material_name: values.material_name,
      color_name: values.color_name,
      color_hex: values.color_hex,
      light_transmission: values.light_transmission,
    })
    .eq('id', productId)
    .select('id, slug, status');

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: handleUniqueViolation(error) };
    }
    return { success: false, error: error.message || 'Database error updating product.' };
  }

  // 4. Verify exactly one row changed
  if (!data || data.length !== 1) {
    return { success: false, error: 'Update failed: Product not found or no rows changed.' };
  }

  const updated = data[0];

  // 5. Revalidate cache
  revalidateProductPaths(updated.slug, updated.id);

  return { success: true, data: { id: updated.id, slug: updated.slug } };
}

/**
 * (3) Explicit Product Status Transition Action
 * Explicit action with confirmation for publish, unpublish, and archive.
 */
export async function updateProductStatusAction(
  productId: string,
  targetStatus: ProductStatus
): Promise<ActionResponse<{ id: string; status: ProductStatus }>> {
  if (!productId || !UUID_REGEX.test(productId)) {
    return { success: false, error: 'Invalid product ID.' };
  }

  if (targetStatus !== 'draft' && targetStatus !== 'published' && targetStatus !== 'archived') {
    return { success: false, error: 'Invalid product status.' };
  }

  // 1. Authenticate and check admin
  const auth = await authenticateAdmin();
  if (auth.sessionExpired) {
    return { success: false, error: 'Your session has expired. Please sign in again.', sessionExpired: true };
  }
  if (auth.unauthorized) {
    return { success: false, error: 'Unauthorized: Only verified admins can change product status.' };
  }

  // (8) Publishing requires at least one image.
  if (targetStatus === 'published' && auth.supabase) {
    const { count, error: countError } = await auth.supabase
      .from('product_images')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', productId);

    if (countError) {
      return { success: false, error: 'Database error checking product images.' };
    }

    if (count === null || count === 0) {
      return {
        success: false,
        error: 'Cannot publish curtain without at least one product image. Please upload a cover photo first.',
      };
    }
  }

  // Development mock fallback if offline
  if (!auth.supabase) {
    return { success: true, data: { id: productId, status: targetStatus } };
  }

  // 2. Update status
  const { data, error } = await auth.supabase
    .from('products')
    .update({ status: targetStatus })
    .eq('id', productId)
    .select('id, slug, status');

  if (error) {
    return { success: false, error: error.message || 'Database error updating product status.' };
  }

  // 3. Verify exactly one row changed
  if (!data || data.length !== 1) {
    return { success: false, error: 'Status update failed: Product not found or no rows changed.' };
  }

  const updated = data[0];

  // 4. Revalidate cache
  revalidateProductPaths(updated.slug, updated.id);

  return { success: true, data: { id: updated.id, status: updated.status as ProductStatus } };
}

/**
 * (4) One-Tap Stock Toggle Action
 */
export async function toggleStockAction(
  productId: string,
  targetStatus: StockStatus
): Promise<ToggleStockResponse> {
  if (!productId || !UUID_REGEX.test(productId)) {
    return { success: false, error: 'Invalid product ID format' };
  }

  if (targetStatus !== 'in_stock' && targetStatus !== 'out_of_stock') {
    return { success: false, error: 'Invalid stock status value' };
  }

  const auth = await authenticateAdmin();
  if (auth.sessionExpired) {
    return { success: false, error: 'Your session has expired. Please sign in again.', sessionExpired: true };
  }
  if (auth.unauthorized) {
    return { success: false, error: 'Unauthorized: Only verified admin owners can modify stock.' };
  }

  if (!auth.supabase) {
    return { success: true, stockStatus: targetStatus };
  }

  const { data: updatedRows, error: updateError } = await auth.supabase
    .from('products')
    .update({ stock_status: targetStatus })
    .eq('id', productId)
    .select('id, slug, stock_status');

  if (updateError) {
    return { success: false, error: updateError.message || 'Failed to update stock status in database.' };
  }

  if (!updatedRows || updatedRows.length !== 1) {
    return { success: false, error: 'Product update failed: exactly one row was expected to change.' };
  }

  const updatedProduct = updatedRows[0];

  revalidateProductPaths(updatedProduct.slug, updatedProduct.id);

  return {
    success: true,
    stockStatus: updatedProduct.stock_status as StockStatus,
  };
}

/**
 * (5) Register Uploaded Image Action
 * Validates path prefix, extension, storage existence, enforces 6-image cap,
 * inserts row in product_images, and deletes the uploaded file if DB insertion fails.
 */
export async function registerUploadedImageAction(
  productId: string,
  storagePath: string,
  altText?: string
): Promise<ActionResponse<any>> {
  if (!productId || !UUID_REGEX.test(productId)) {
    return { success: false, error: 'Invalid product ID format.' };
  }

  // Validate path prefix and extension
  const expectedPrefix = `products/${productId}/`;
  if (
    !storagePath.startsWith(expectedPrefix) ||
    !storagePath.endsWith('.webp') ||
    storagePath.includes('..')
  ) {
    return { success: false, error: 'Invalid storage path or file extension.' };
  }

  // 1. Authenticate and check admin
  const auth = await authenticateAdmin();
  if (auth.sessionExpired) {
    return { success: false, error: 'Your session has expired. Please sign in again.', sessionExpired: true };
  }
  if (auth.unauthorized) {
    return { success: false, error: 'Unauthorized: Only verified admins can register images.' };
  }

  if (!auth.supabase) {
    return {
      success: true,
      data: {
        id: `mock-img-${Date.now()}`,
        product_id: productId,
        storage_path: storagePath,
        alt_text: altText || '',
        sort_order: 0,
      },
    };
  }

  // 2. Validate object in Supabase Storage, inspect size cap, and verify WebP signature (RIFF...WEBP)
  const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB bucket cap
  const { data: fileBlob, error: downloadError } = await auth.supabase.storage
    .from('product-media')
    .download(storagePath);

  if (downloadError || !fileBlob) {
    await auth.supabase.storage.from('product-media').remove([storagePath]);
    return { success: false, error: 'Uploaded image file was not found or could not be read from storage.' };
  }

  // Compare stored size against the cap
  if (fileBlob.size > MAX_FILE_SIZE_BYTES) {
    await auth.supabase.storage.from('product-media').remove([storagePath]);
    return {
      success: false,
      error: `File size exceeds the 5MB storage limit (${(fileBlob.size / (1024 * 1024)).toFixed(2)}MB).`,
    };
  }

  if (fileBlob.size < 12) {
    await auth.supabase.storage.from('product-media').remove([storagePath]);
    return { success: false, error: 'Corrupt file: Image is smaller than 12 bytes.' };
  }

  // Read first 12 bytes and verify WebP signature (RIFF....WEBP)
  const headerBuffer = Buffer.from(await fileBlob.slice(0, 12).arrayBuffer());
  const riffHeader = headerBuffer.toString('ascii', 0, 4);
  const webpHeader = headerBuffer.toString('ascii', 8, 12);

  if (riffHeader !== 'RIFF' || webpHeader !== 'WEBP') {
    await auth.supabase.storage.from('product-media').remove([storagePath]);
    return {
      success: false,
      error: 'Invalid file format: Stored object does not have a valid WebP signature (RIFF...WEBP).',
    };
  }

  // 3. Enforce the 6-image cap
  const { count, error: countError } = await auth.supabase
    .from('product_images')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', productId);

  if (countError) {
    await auth.supabase.storage.from('product-media').remove([storagePath]);
    return { success: false, error: 'Database error checking existing images.' };
  }

  if (count !== null && count >= 6) {
    // Exceeds cap: delete the uploaded file
    await auth.supabase.storage.from('product-media').remove([storagePath]);
    return { success: false, error: 'Maximum of 6 images allowed per curtain panel.' };
  }

  // 4. Determine next sort_order
  const nextSortOrder = count ?? 0;

  // 5. Insert row into product_images
  const { data, error: insertError } = await auth.supabase
    .from('product_images')
    .insert({
      product_id: productId,
      storage_path: storagePath,
      alt_text: (altText || '').trim().slice(0, 200),
      sort_order: nextSortOrder,
    })
    .select();

  // If the insert fails, delete the uploaded file!
  if (insertError) {
    await auth.supabase.storage.from('product-media').remove([storagePath]);
    if (insertError.code === '23505') {
      return { success: false, error: 'This image has already been registered.' };
    }
    return { success: false, error: insertError.message || 'Failed to save image record.' };
  }

  if (!data || data.length !== 1) {
    await auth.supabase.storage.from('product-media').remove([storagePath]);
    return { success: false, error: 'Unexpected database response registering image.' };
  }

  const createdImage = data[0];

  // 6. Revalidate cache
  const { data: prod } = await auth.supabase
    .from('products')
    .select('slug')
    .eq('id', productId)
    .single();
  revalidateProductPaths(prod?.slug, productId);

  return { success: true, data: createdImage };
}

/**
 * (6) Delete Image Action:
 * Removes the row first, then deletes the file from Storage.
 */
export async function deleteProductImageAction(
  imageId: string
): Promise<ActionResponse<{ id: string }>> {
  if (!imageId || !UUID_REGEX.test(imageId)) {
    return { success: false, error: 'Invalid image ID.' };
  }

  const auth = await authenticateAdmin();
  if (auth.sessionExpired) {
    return { success: false, error: 'Your session has expired. Please sign in again.', sessionExpired: true };
  }
  if (auth.unauthorized) {
    return { success: false, error: 'Unauthorized: Only verified admins can delete images.' };
  }

  if (!auth.supabase) {
    return { success: true, data: { id: imageId } };
  }

  // 1. Fetch image info
  const { data: imgRow, error: fetchError } = await auth.supabase
    .from('product_images')
    .select('id, product_id, storage_path, sort_order')
    .eq('id', imageId)
    .single();

  if (fetchError || !imgRow) {
    return { success: false, error: 'Image not found.' };
  }

  // 2. Remove the row FIRST
  const { data: deletedRows, error: deleteError } = await auth.supabase
    .from('product_images')
    .delete()
    .eq('id', imageId)
    .select('id');

  if (deleteError || !deletedRows || deletedRows.length !== 1) {
    return { success: false, error: 'Failed to delete image record from database.' };
  }

  // 3. Re-normalize sort_orders for remaining images
  const { data: remainingImages } = await auth.supabase
    .from('product_images')
    .select('id')
    .eq('product_id', imgRow.product_id)
    .order('sort_order', { ascending: true });

  if (remainingImages && remainingImages.length > 0) {
    for (let i = 0; i < remainingImages.length; i++) {
      await auth.supabase
        .from('product_images')
        .update({ sort_order: i })
        .eq('id', remainingImages[i].id);
    }
  }

  // 4. THEN delete the file from storage
  await auth.supabase.storage.from('product-media').remove([imgRow.storage_path]);

  // 5. Revalidate cache
  const { data: prod } = await auth.supabase
    .from('products')
    .select('slug')
    .eq('id', imgRow.product_id)
    .single();
  revalidateProductPaths(prod?.slug, imgRow.product_id);

  return { success: true, data: { id: imageId } };
}

/**
 * (7) Reorder Product Images Action
 * Sets sort_order: index 0 becomes the cover image.
 */
export async function reorderProductImagesAction(
  productId: string,
  orderedImageIds: string[]
): Promise<ActionResponse<{ count: number }>> {
  if (!productId || !UUID_REGEX.test(productId)) {
    return { success: false, error: 'Invalid product ID.' };
  }

  const auth = await authenticateAdmin();
  if (auth.sessionExpired) {
    return { success: false, error: 'Your session has expired. Please sign in again.', sessionExpired: true };
  }
  if (auth.unauthorized) {
    return { success: false, error: 'Unauthorized: Only verified admins can reorder images.' };
  }

  if (!auth.supabase) {
    return { success: true, data: { count: orderedImageIds.length } };
  }

  // Update sort_order for each image in the specified sequence
  for (let index = 0; index < orderedImageIds.length; index++) {
    const id = orderedImageIds[index];
    if (!UUID_REGEX.test(id)) continue;

    await auth.supabase
      .from('product_images')
      .update({ sort_order: index })
      .eq('id', id)
      .eq('product_id', productId);
  }

  // Revalidate cache
  const { data: prod } = await auth.supabase
    .from('products')
    .select('slug')
    .eq('id', productId)
    .single();
  revalidateProductPaths(prod?.slug, productId);

  return { success: true, data: { count: orderedImageIds.length } };
}

/**
 * (8) Update Image Alt-Text Action
 */
export async function updateImageAltTextAction(
  imageId: string,
  altText: string
): Promise<ActionResponse<{ id: string; altText: string }>> {
  if (!imageId || !UUID_REGEX.test(imageId)) {
    return { success: false, error: 'Invalid image ID.' };
  }

  const auth = await authenticateAdmin();
  if (auth.sessionExpired) {
    return { success: false, error: 'Your session has expired. Please sign in again.', sessionExpired: true };
  }
  if (auth.unauthorized) {
    return { success: false, error: 'Unauthorized: Only verified admins can update image details.' };
  }

  if (!auth.supabase) {
    return { success: true, data: { id: imageId, altText } };
  }

  const cleanAlt = altText.trim().slice(0, 250);

  const { data, error } = await auth.supabase
    .from('product_images')
    .update({ alt_text: cleanAlt })
    .eq('id', imageId)
    .select('id, product_id');

  if (error || !data || data.length !== 1) {
    return { success: false, error: 'Failed to update alt text.' };
  }

  const { data: prod } = await auth.supabase
    .from('products')
    .select('slug')
    .eq('id', data[0].product_id)
    .single();
  revalidateProductPaths(prod?.slug, data[0].product_id);

  return { success: true, data: { id: imageId, altText: cleanAlt } };
}

/**
 * (9) Manual Orphan Files Cleanup Action
 * Admin-only: Removes storage files unreferenced by public.product_images
 * that are strictly older than 24 hours (preserving in-flight uploads).
 */
export async function cleanupOrphanFilesAction(): Promise<
  ActionResponse<{ deletedCount: number; deletedPaths: string[] }>
> {
  const auth = await authenticateAdmin();
  if (auth.sessionExpired) {
    return { success: false, error: 'Your session has expired. Please sign in again.', sessionExpired: true };
  }
  if (auth.unauthorized) {
    return { success: false, error: 'Unauthorized: Only verified admins can run maintenance.' };
  }

  if (!auth.supabase) {
    return { success: true, data: { deletedCount: 0, deletedPaths: [] } };
  }

  // 1. List folders under products/
  const { data: productFolders, error: folderErr } = await auth.supabase.storage
    .from('product-media')
    .list('products', { limit: 1000 });

  if (folderErr) {
    return { success: false, error: folderErr.message || 'Failed to inspect storage folder.' };
  }

  const allStorageFiles: { path: string; createdAt: Date }[] = [];

  for (const folder of productFolders || []) {
    if (!folder.name.endsWith('.webp')) {
      const { data: filesInFolder } = await auth.supabase.storage
        .from('product-media')
        .list(`products/${folder.name}`, { limit: 100 });

      for (const file of filesInFolder || []) {
        if (file.name) {
          allStorageFiles.push({
            path: `products/${folder.name}/${file.name}`,
            createdAt: new Date(file.created_at || Date.now()),
          });
        }
      }
    } else {
      allStorageFiles.push({
        path: `products/${folder.name}`,
        createdAt: new Date(folder.created_at || Date.now()),
      });
    }
  }

  // 2. Fetch all registered storage_paths
  const { data: dbImages, error: dbErr } = await auth.supabase
    .from('product_images')
    .select('storage_path');

  if (dbErr) {
    return { success: false, error: 'Failed to query database image records.' };
  }

  const registeredPaths = new Set((dbImages || []).map((img) => img.storage_path));
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

  // 3. Filter unreferenced files older than 24 hours
  const orphanPaths = allStorageFiles
    .filter((f) => !registeredPaths.has(f.path) && f.createdAt.getTime() < oneDayAgo)
    .map((f) => f.path);

  // 4. Remove orphan files
  if (orphanPaths.length > 0) {
    const { error: removeErr } = await auth.supabase.storage
      .from('product-media')
      .remove(orphanPaths);

    if (removeErr) {
      return { success: false, error: 'Failed to delete orphan files from storage.' };
    }
  }

  return {
    success: true,
    data: {
      deletedCount: orphanPaths.length,
      deletedPaths: orphanPaths,
    },
  };
}

/**
 * (10) Rename Product Slug Action
 * Invokes the atomic RPC rename_product_slug(product_id, new_slug).
 * Validates slug format, preserves 301 history, and handles A -> B -> A cyclical renames.
 */
export async function renameProductSlugAction(
  productId: string,
  newSlug: string
): Promise<ActionResponse<{ id: string; slug: string }>> {
  if (!productId || !UUID_REGEX.test(productId)) {
    return { success: false, error: 'Invalid product ID.' };
  }

  const cleanSlug = newSlug.trim().toLowerCase();
  const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!cleanSlug || !SLUG_REGEX.test(cleanSlug)) {
    return {
      success: false,
      error: 'Invalid slug format. Use lowercase letters, numbers, and single hyphens without leading or trailing dashes.',
    };
  }

  const auth = await authenticateAdmin();
  if (auth.sessionExpired) {
    return { success: false, error: 'Your session has expired. Please sign in again.', sessionExpired: true };
  }
  if (auth.unauthorized) {
    return { success: false, error: 'Unauthorized: Only verified admins can rename product slugs.' };
  }

  // Development mock fallback if offline
  if (!auth.supabase) {
    return { success: true, data: { id: productId, slug: cleanSlug } };
  }

  const { data, error } = await auth.supabase.rpc('rename_product_slug', {
    p_product_id: productId,
    p_new_slug: cleanSlug,
  });

  if (error) {
    if (error.code === '23505' || error.message.includes('already')) {
      return {
        success: false,
        error: `The URL slug "${cleanSlug}" is already in use by another product or exists in redirect history.`,
      };
    }
    if (error.code === '42501') {
      return { success: false, error: 'Unauthorized: Owner admin access required.' };
    }
    return { success: false, error: error.message || 'Failed to rename product slug.' };
  }

  // Revalidate cache for the catalogue, the new slug page, and the admin list
  revalidateProductPaths(cleanSlug, productId);

  return { success: true, data: { id: productId, slug: cleanSlug } };
}
