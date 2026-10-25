import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a stateless Supabase public client for reading published catalogue data.
 * Does not require cookies or session handling, allowing full Next.js static prerendering.
 *
 * Production Guard:
 * In production (NODE_ENV === 'production'), missing credentials immediately throw
 * to fail build and runtime deployments loudly rather than masking configuration errors.
 */
export function createPublicClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'FATAL: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined in production.'
      );
    }
    return null;
  }

  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  });
}
