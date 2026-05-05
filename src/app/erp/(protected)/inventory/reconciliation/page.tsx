import { getServerSession, hasRole } from '@/lib/supabase/session';
import { ErpForbidden } from '@/components/erp/erp-forbidden';
import { ReconciliationClient } from './reconciliation-client';

export default async function InventoryReconciliationPage() {
  const session = await getServerSession();
  if (!hasRole(session, ['super admin', 'admin', 'warehouse'])) {
    return <ErpForbidden />;
  }

  return (
    <div className="-mx-4 space-y-6 bg-[#F5F5F7] px-4 pb-10 pt-1 md:-mx-6 md:px-6 md:pb-12 dark:mx-0 dark:bg-transparent dark:px-0 dark:pb-0 dark:pt-0">
      <div>
        <h1 className="font-headline text-[28px] font-bold leading-tight tracking-tight text-[#1D1D1F] dark:text-white dark:text-2xl dark:font-semibold">
          Inventory Reconciliation
        </h1>
        <p className="mt-1 text-sm text-[#6E6E73] dark:text-muted-foreground">CLS vs Shopify inventory comparison</p>
      </div>
      <ReconciliationClient />
    </div>
  );
}

