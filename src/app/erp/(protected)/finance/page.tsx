import { getServerSession, hasRole } from '@/lib/supabase/session';
import { ErpForbidden } from '@/components/erp/erp-forbidden';
import { ErpComingSoonBlocks } from '@/components/erp/erp-coming-soon-blocks';

const BLOCKS = [
  'Revenue Quality',
  'Discount Impact',
  'Returns Impact',
  'Shipping Cost Analysis',
];

export default async function FinanceDashboardPage() {
  const session = await getServerSession();
  if (!hasRole(session, ['admin'])) {
    return <ErpForbidden />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-2xl font-semibold tracking-tight">Finance</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Understand revenue quality and the impact of discounts, returns, and shipping—so finance can
          reconcile margin drivers without waiting on ad-hoc reports.
        </p>
      </div>
      <ErpComingSoonBlocks blocks={BLOCKS} />
    </div>
  );
}
