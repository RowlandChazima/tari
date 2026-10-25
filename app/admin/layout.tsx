import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logoutAction } from './actions';

export const metadata: Metadata = {
  title: 'Tari Admin',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '';
  const isLoginPage = pathname === '/admin/login';

  let user = null;

  if (supabase) {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (authUser) {
      // (5) The admin layout must check admins membership and sign out and refuse non-owners.
      const { data: adminRecord, error: adminError } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', authUser.id)
        .single();

      if (adminError || !adminRecord) {
        await supabase.auth.signOut();
        redirect('/admin/login');
      }

      user = authUser;
    } else if (!isLoginPage && process.env.NODE_ENV === 'production') {
      redirect('/admin/login');
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col font-sans">
      <header className="border-b border-stone-200 bg-white sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/products"
              className="font-display font-bold text-lg tracking-tight text-stone-900 hover:text-stone-700 transition-colors"
            >
              TARI
            </Link>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200">
              Admin
            </span>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <>
                <span className="text-xs text-stone-500 hidden sm:inline-block max-w-[200px] truncate">
                  {user.email}
                </span>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="min-h-[44px] px-3 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-stone-400 cursor-pointer"
                  >
                    Log out
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}

