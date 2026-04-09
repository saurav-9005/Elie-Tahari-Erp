'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/database.types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] px-4 py-12">
      <Card className="w-full max-w-md border-border/60 bg-[#141414] shadow-2xl">
        <CardHeader className="space-y-3 pb-2 text-center">
          <h1 className="font-headline text-3xl font-bold tracking-[0.2em] text-white md:text-4xl">
            ELIE TAHARI
          </h1>
          <CardDescription className="text-base text-zinc-400">Sign in to continue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pb-8 pt-2">
          {!configured ? (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-left text-sm text-zinc-200">
              <p className="font-medium text-amber-200">Supabase environment variables missing</p>
              <p className="mt-2 text-zinc-400">
                Add <code className="rounded bg-zinc-800 px-1">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
                <code className="rounded bg-zinc-800 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{' '}
                <code className="rounded bg-zinc-800 px-1">.env.local</code>, then restart the dev
                server.
              </p>
            </div>
          ) : (
            <Button
              type="button"
              size="lg"
              onClick={() => void handleSignIn()}
              className="h-12 w-full border-0 bg-gradient-to-r from-indigo-600 to-violet-600 text-base font-semibold text-white shadow-lg transition hover:from-indigo-500 hover:to-violet-500 hover:shadow-xl"
            >
              Continue with Google
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
