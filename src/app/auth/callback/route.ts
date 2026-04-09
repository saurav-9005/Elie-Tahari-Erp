import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { Database } from '@/lib/database.types';

/** Next dev uses --hostname 0.0.0.0; browsers should not follow 0.0.0.0 — use localhost instead. */
function redirectOrigin(requestUrl: URL): string {
  const { protocol, hostname, port } = requestUrl;
  const safeHost = hostname === '0.0.0.0' ? 'localhost' : hostname;
  return port ? `${protocol}//${safeHost}:${port}` : `${protocol}//${safeHost}`;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const base = redirectOrigin(requestUrl);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.redirect(new URL('/erp/login', base));
  }

  const code = requestUrl.searchParams.get('code');

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(url, key, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            /* ignore */
          }
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL('/erp/dashboard', base));
    }
  }

  return NextResponse.redirect(new URL('/erp/login', base));
}
