import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates a Supabase client for client-side components.
 */
export function createClient() {
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

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

