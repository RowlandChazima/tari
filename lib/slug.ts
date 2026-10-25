import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Derives a sanitized, URL-safe slug from a string.
 * Strictly adheres to the schema check: ^[a-z0-9]+(?:-[a-z0-9]+)*$
 */
export function generateSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9]+/g, '-') // convert spaces & punctuation to hyphens
    .replace(/^-+|-+$/g, ''); // trim leading and trailing hyphens

  return slug || 'curtain';
}

/**
 * Checks for collisions in both `products` and `slug_history`.
 * If collision is found, suffixes `-2`, `-3`, etc., until a unique slug is guaranteed.
 */
export async function getUniqueSlug(
  supabase: SupabaseClient,
  baseSlug: string
): Promise<string> {
  let candidate = baseSlug;
  let counter = 1;

  while (true) {
    const { data: existingProduct, error: prodErr } = await supabase
      .from('products')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();

    if (prodErr) throw prodErr;

    const { data: existingHistory, error: histErr } = await supabase
      .from('slug_history')
      .select('id')
      .eq('old_slug', candidate)
      .maybeSingle();

    if (histErr) throw histErr;

    if (!existingProduct && !existingHistory) {
      return candidate;
    }

    counter += 1;
    candidate = `${baseSlug}-${counter}`;
  }
}

