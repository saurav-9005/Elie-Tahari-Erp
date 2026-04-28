import { createServiceRoleClient } from '@/lib/supabase/admin';
import { getServerSession, hasRole } from '@/lib/supabase/session';
import { ErpForbidden } from '@/components/erp/erp-forbidden';
import { NextMonthDeliveriesSection } from './next-month-deliveries-section';
import { StyleReconciliationSection } from './style-reconciliation-section';

export default async function InventoryDashboardPage() {
  const session = await getServerSession();
  if (!hasRole(session, ['admin', 'warehouse'])) {
    return <ErpForbidden />;
  }

  return (
    <div className="space-y-6">
      <NextMonthDeliveriesSection />
      <StyleReconciliationSection />
    </div>
  );
}
