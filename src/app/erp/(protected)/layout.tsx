import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/supabase/session';
import { ErpSignOutButton } from '@/components/erp/erp-sign-out-button';
import { ErpSidebarNav } from '@/components/erp/erp-sidebar-nav';
import { Logo } from '@/components/logo';

export default async function ErpProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const configured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!configured) {
    return (
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
        Configure Supabase public URL and anon key to use this area.
      </div>
    );
  }

  const session = await getServerSession();
  if (!session) {
    redirect('/erp/login');
  }

  if (!session.profile) {
    return (
      <div className="space-y-4 rounded-lg border p-4 text-sm">
        <p className="text-muted-foreground">
          You are signed in, but no <code className="rounded bg-muted px-1">profiles</code> row was
          found. Run the SQL migration in Supabase (including the{' '}
          <code className="rounded bg-muted px-1">handle_new_user</code> trigger), then sign out and
          sign in again.
        </p>
        <ErpSignOutButton />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          Role <span className="font-medium text-foreground">{session.profile.role}</span> ·{' '}
          {session.profile.email}
        </div>
        <ErpSignOutButton />
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
        <aside className="shrink-0 lg:w-56">
          <div className="mb-6">
            <Link href="/erp/dashboard" className="inline-block">
              <Logo className="max-h-10 w-auto" />
            </Link>
          </div>
          <ErpSidebarNav />
        </aside>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
