import { getServerSession, hasRole } from '@/lib/supabase/session';
import { ErpForbidden } from '@/components/erp/erp-forbidden';
import { ReconciliationClient } from './reconciliation-client';

export default async function InventoryReconciliationPage() {
  const session = await getServerSession();
  if (!hasRole(session, ['admin', 'warehouse'])) {
    return <ErpForbidden />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-2xl font-semibold tracking-tight">Inventory Reconciliation</h1>
        <p className="text-sm text-muted-foreground">ATS vs Shopify inventory comparison</p>
      </div>
      <ReconciliationClient />
    </div>
  );
}

