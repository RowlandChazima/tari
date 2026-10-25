import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Proxy for Next.js 16 (replaces deprecated middleware.ts).
 * Refreshes Supabase auth session and protects /admin routes.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // getUser() sends a request to the Supabase Auth server every time to revalidate
  // the Auth token, keeping the session active and secure.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (pathname.startsWith('/admin')) {
    const isLoginPage = pathname === '/admin/login';

    if (!user && !isLoginPage) {
      const loginUrl = new URL('/admin/login', request.url);
      const nextParam = pathname + request.nextUrl.search;
      loginUrl.searchParams.set('next', nextParam);
      return NextResponse.redirect(loginUrl);
    }

    if (user && isLoginPage) {
      return NextResponse.redirect(new URL('/admin/products', request.url));
    }
  }

  return supabaseResponse;
}

export default proxy;

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};

