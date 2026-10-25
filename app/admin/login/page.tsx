import { sanitizeAdminNextPath } from '@/lib/admin-auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { LoginForm } from './login-form';

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const supabase = await createClient();
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect('/admin/products');
    }
  }

  const resolvedParams = await searchParams;
  const safeNext = sanitizeAdminNextPath(resolvedParams.next);

  return (
    <div className="max-w-md mx-auto py-8 sm:py-16">
      <div className="bg-white rounded-xl border border-stone-200 p-6 sm:p-8 shadow-sm">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-stone-900 tracking-tight">
            Owner Sign In
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Sign in to manage product inventory and catalogue status.
          </p>
        </div>

        <LoginForm safeNext={safeNext} />
      </div>
    </div>
  );
}

