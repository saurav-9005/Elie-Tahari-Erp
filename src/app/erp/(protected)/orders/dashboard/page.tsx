import { getServerSession, hasRole } from '@/lib/supabase/session';
import { ErpForbidden } from '@/components/erp/erp-forbidden';
import { DashboardClient } from './dashboard-client';

export default async function OrdersDashboardPage() {
  const session = await getServerSession();
  if (!hasRole(session, ['super admin', 'admin'])) {
    return <ErpForbidden />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-headline text-2xl font-semibold tracking-tight">Orders Dashboard</h1>
        <p className="text-sm text-muted-foreground">Order analytics and overview</p>
      </div>
      <DashboardClient />
    </div>
  );
}
