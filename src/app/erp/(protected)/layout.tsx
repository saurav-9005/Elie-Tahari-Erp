import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession, hasRole } from '@/lib/supabase/session';
import { ErpSignOutButton } from '@/components/erp/erp-sign-out-button';

const navLinkClass =
  'block rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground';

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

  const isAdmin = hasRole(session, ['admin']);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Supabase ERP</span> · Role{' '}
          <span className="font-medium text-foreground">{session.profile.role}</span> ·{' '}
          {session.profile.email}
        </div>
        <ErpSignOutButton />
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
        <aside className="shrink-0 lg:w-56">
          <nav className="space-y-6" aria-label="ERP">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Operations
              </p>
              <ul className="flex flex-col gap-0.5">
                <li>
                  <Link href="/erp/dashboard" className={navLinkClass}>
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/erp/orders" className={navLinkClass}>
                    Orders
                  </Link>
                </li>
                <li>
                  <Link href="/erp/inventory" className={navLinkClass}>
                    Inventory
                  </Link>
                </li>
                <li>
                  <Link href="/erp/customers" className={navLinkClass}>
                    Customers
                  </Link>
                </li>
              </ul>
            </div>

            {isAdmin && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Supabase ERP
                </p>
                <ul className="flex flex-col gap-0.5">
                  <li>
                    <Link href="/erp/ceo" className={navLinkClass}>
                      Control Tower
                    </Link>
                  </li>
                  <li>
                    <Link href="/erp/reports/inventory" className={navLinkClass}>
                      Inventory Report
                    </Link>
                  </li>
                  <li>
                    <Link href="/erp/sales" className={navLinkClass}>
                      Sales &amp; Growth
                    </Link>
                  </li>
                  <li>
                    <Link href="/erp/design" className={navLinkClass}>
                      Design &amp; Production
                    </Link>
                  </li>
                  <li>
                    <Link href="/erp/finance" className={navLinkClass}>
                      Finance
                    </Link>
                  </li>
                </ul>
              </div>
            )}

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Settings
              </p>
              <ul className="flex flex-col gap-0.5">
                <li>
                  <Link href="/erp/settings/users" className={navLinkClass}>
                    Users
                  </Link>
                </li>
                <li>
                  <Link href="/erp/settings/logs" className={navLinkClass}>
                    Logs
                  </Link>
                </li>
              </ul>
            </div>
          </nav>
        </aside>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
