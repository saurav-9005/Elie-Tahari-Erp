import { Suspense } from 'react';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { START_OF_2026 } from '@/lib/erp/dashboard-constants';
import { getServerSession, hasRole } from '@/lib/supabase/session';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import GeographicIntel from '@/components/erp/intelligence/GeographicIntel';
import ProductIntel from '@/components/erp/intelligence/ProductIntel';
import CustomerIntel from '@/components/erp/intelligence/CustomerIntel';
import BehavioralIntel from '@/components/erp/intelligence/BehavioralIntel';
import {
  IntelligenceSectionSkeleton,
  IntelligenceThreeColSkeleton,
} from '@/components/erp/intelligence/intelligence-skeleton';

const sectionLabel =
  'mb-3 mt-8 text-xs font-medium uppercase tracking-widest text-gray-400';

export default async function ErpDashboardPage() {
  const session = await getServerSession();

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const startIso = start.toISOString();
  const ordersFrom = startIso >= START_OF_2026 ? startIso : START_OF_2026;

  let ordersToday: number | null = null;
  if (hasRole(session, ['admin', 'finance'])) {
    const supabase = createServiceRoleClient();
    const { count, error } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', ordersFrom);
    ordersToday = error ? null : count ?? 0;
  }

  let pendingSync: number | null = null;
  if (hasRole(session, ['admin'])) {
    const supabase = createServiceRoleClient();
    const { count, error } = await supabase
      .from('shopify_events')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    pendingSync = error ? null : count ?? 0;
  }

  let lowStock: number | null = null;
  if (hasRole(session, ['admin', 'warehouse'])) {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.from('inventory').select('id').lt('quantity', 5);
    lowStock = error ? null : data?.length ?? 0;
  }

  const showIntel = hasRole(session, ['admin', 'finance', 'viewer']);

  return (
    <div>
      <h1 className="font-headline text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Data from Supabase (webhook pipeline). Cards respect your role. Order analytics are 2026-only.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Orders today</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-headline text-3xl font-semibold">
              {ordersToday === null ? '—' : ordersToday}
            </p>
            <p className="text-xs text-muted-foreground">admin / finance · 2026+</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pending webhook events</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-headline text-3xl font-semibold">
              {pendingSync === null ? '—' : pendingSync}
            </p>
            <p className="text-xs text-muted-foreground">admin · run processor from Logs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">SKUs under 5 units</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-headline text-3xl font-semibold">
              {lowStock === null ? '—' : lowStock}
            </p>
            <p className="text-xs text-muted-foreground">admin / warehouse</p>
          </CardContent>
        </Card>
      </div>

      {showIntel && (
        <>
          <p className={sectionLabel}>Geographic intelligence</p>
          <Suspense fallback={<IntelligenceSectionSkeleton />}>
            <GeographicIntel />
          </Suspense>

          <p className={sectionLabel}>Product intelligence</p>
          <Suspense fallback={<IntelligenceSectionSkeleton />}>
            <ProductIntel />
          </Suspense>

          <p className={sectionLabel}>Customer intelligence</p>
          <Suspense fallback={<IntelligenceThreeColSkeleton />}>
            <CustomerIntel />
          </Suspense>

          <p className={sectionLabel}>Behavioral intelligence</p>
          <Suspense fallback={<IntelligenceSectionSkeleton />}>
            <BehavioralIntel />
          </Suspense>
        </>
      )}
    </div>
  );
}
