import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/supabase/session';
import { ErpProtectedShell } from '@/components/erp/erp-protected-shell';

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
    <ErpProtectedShell userRole={session.profile.role} userEmail={session.profile.email}>
      {children}
    </ErpProtectedShell>
  );
}
