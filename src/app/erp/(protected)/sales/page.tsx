import { getServerSession, hasRole } from '@/lib/supabase/session';
import { ErpForbidden } from '@/components/erp/erp-forbidden';
import { ErpComingSoonBlocks } from '@/components/erp/erp-coming-soon-blocks';

const BLOCKS = [
  'Revenue + Trend',
  'Product Contribution (Top SKUs)',
  'Customer Behavior',
  'New vs Returning',
];

export default async function SalesGrowthPage() {
  const session = await getServerSession();
  if (!hasRole(session, ['admin'])) {
    return <ErpForbidden />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-2xl font-semibold tracking-tight">Sales &amp; Growth</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Track revenue momentum, which products and SKUs drive results, and how customers behave—so
          sales and growth teams can act on the same numbers.
        </p>
      </div>
      <ErpComingSoonBlocks blocks={BLOCKS} />
    </div>
  );
}
