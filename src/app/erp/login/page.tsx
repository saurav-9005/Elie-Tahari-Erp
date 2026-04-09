import Link from 'next/link';
import { ErpGoogleSignIn } from '@/components/erp/erp-google-sign-in';

export default function ErpLoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const nextPath =
    searchParams.next && searchParams.next.startsWith('/') ? searchParams.next : '/erp/dashboard';

  const configured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 py-8">
      <div>
        <h1 className="font-headline text-2xl font-semibold tracking-tight">Supabase ERP sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Google OAuth via Supabase. This is separate from the main Shopify/Firebase tools in the
          sidebar.
        </p>
      </div>

      {!configured ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <p className="font-medium">Supabase environment variables missing</p>
          <p className="mt-2 text-muted-foreground">
            Add <code className="rounded bg-muted px-1">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
            <code className="rounded bg-muted px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{' '}
            <code className="rounded bg-muted px-1">.env.local</code>, then restart the dev server.
          </p>
        </div>
      ) : (
        <ErpGoogleSignIn nextPath={nextPath} />
      )}

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/" className="text-primary hover:underline">
          ← Back to main app
        </Link>
      </p>
    </div>
  );
}
