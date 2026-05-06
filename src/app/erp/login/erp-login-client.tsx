'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/database.types';

const VIDEO_SRC =
  'https://cdn.shopify.com/videos/c/o/v/5b0290163cd7430d9e819daecaf224c3.mp4';

function createSupabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createBrowserClient<Database>(url, key);
}

export function ErpLoginClient() {
  const router = useRouter();
  const [nextPath, setNextPath] = useState('/erp/dashboard');

  const configured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  // Read ?next= from the URL on the client (avoid useSearchParams — it can suspend forever behind Suspense).
  useEffect(() => {
    const n = new URLSearchParams(window.location.search).get('next');
    if (n && n.startsWith('/') && !n.startsWith('//')) {
      setNextPath(n);
    }
  }, []);

  // If already signed in, go to dashboard (non-blocking — form stays visible briefly if redirect is slow).
  useEffect(() => {
    const supabase = createSupabaseBrowser();
    if (!supabase) return;

    void supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        if (user) {
          router.replace('/erp/dashboard');
        }
      })
      .catch(() => {
        /* ignore — show login form */
      });
  }, [router]);

  async function handleSignIn() {
    const supabase = createSupabaseBrowser();
    if (!supabase) return;

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    });

    if (error) {
      console.error(error);
      return;
    }

    if (data?.url) {
      window.location.assign(data.url);
    }
  }

  return (
    <>
      <video
        className="fixed left-0 top-0 z-0 h-full w-full object-cover"
        style={{ top: 0, left: 0, width: '100%', height: '100%' }}
        autoPlay
        muted
        loop
        playsInline
        src={VIDEO_SRC}
        aria-hidden
      />
      <div
        className="fixed inset-0 z-[1]"
        style={{ background: 'rgba(0,0,0,0.55)' }}
        aria-hidden
      />

      <div className="relative z-[2] flex min-h-screen items-center justify-center px-4 py-12">
        <div
          className="w-full text-white"
          style={{
            position: 'relative',
            zIndex: 2,
            maxWidth: 400,
            width: '100%',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16,
            padding: 40,
          }}
        >
          <div className="mb-8 text-center">
            <Image
              src="/logo.png"
              alt="Elie Tahari"
              width={500}
              height={80}
              className="mx-auto object-contain"
              priority
            />
            <p className="mt-2 text-sm text-white/60">Enterprise Resource Planning</p>
          </div>

          {!configured ? (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-left text-sm text-white/90">
              <p className="font-medium text-amber-200">Supabase environment variables missing</p>
              <p className="mt-2 text-white/70">
                Add <code className="rounded bg-white/10 px-1">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
                <code className="rounded bg-white/10 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{' '}
                <code className="rounded bg-white/10 px-1">.env.local</code>, then restart the dev
                server.
              </p>
            </div>
          ) : (
            <div className="space-y-6 text-white">
              <button
                type="button"
                onClick={() => void handleSignIn()}
                className="w-full rounded-lg border border-white/30 bg-transparent py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                Continue with Google
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
