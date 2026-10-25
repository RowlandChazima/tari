'use server';

import { createClient } from '@/lib/supabase/server';
import { sanitizeAdminNextPath } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';

export interface LoginFormState {
  error?: string;
}

export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const email = formData.get('email');
  const password = formData.get('password');
  const rawNext = formData.get('next');

  const validNext = sanitizeAdminNextPath(typeof rawNext === 'string' ? rawNext : null);

  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    !email.trim() ||
    !password
  ) {
    return { error: 'Invalid login credentials' };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { error: 'Authentication service unavailable' };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error || !data?.user) {
    // Generic error message: never reveal whether the user exists or why authentication failed
    return { error: 'Invalid login credentials' };
  }

  // Verify membership in the admins table (owner-only access)
  const { data: adminRecord, error: adminError } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', data.user.id)
    .single();

  if (adminError || !adminRecord) {
    // Non-admin user signed in: sign them out immediately and show generic error
    await supabase.auth.signOut();
    return { error: 'Invalid login credentials' };
  }

  redirect(validNext);
}

