import { getServerSession, hasRole } from '@/lib/supabase/session';
import { ErpForbidden } from '@/components/erp/erp-forbidden';
import { ErpComingSoonBlocks } from '@/components/erp/erp-coming-soon-blocks';

const BLOCKS = [
  'Sell-Through Intelligence',
  'Inventory Health',
  'Size-Level Imbalance',
  'Fast vs Slow Movers',
];

export default async function DesignProductionPage() {
  const session = await getServerSession();
  if (!hasRole(session, ['admin'])) {
    return <ErpForbidden />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-2xl font-semibold tracking-tight">Design &amp; Production</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Connect design and production decisions to sell-through, inventory, and size mix—so teams can
          align buys and cuts with what actually moves.
        </p>
      </div>
      <ErpComingSoonBlocks blocks={BLOCKS} />
    </div>
  );
}
