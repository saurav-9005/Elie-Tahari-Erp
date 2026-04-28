import { Suspense } from 'react';
import { getServerSession, hasRole } from '@/lib/supabase/session';
import { ErpForbidden } from '@/components/erp/erp-forbidden';
import { Skeleton } from '@/components/ui/skeleton';
import { PromoImpactPanel } from '../_components/customer-analytics-panels';

function PanelSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-full max-w-md" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-44 rounded-lg border border-border" />
        <Skeleton className="h-44 rounded-lg border border-border" />
      </div>
    </div>
  );
}

export default async function PromoImpactPage() {
  const session = await getServerSession();
  if (!hasRole(session, ['admin', 'finance'])) {
    return <ErpForbidden />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-2xl font-semibold tracking-tight">Promotion Impact</h1>
        <p className="text-sm text-muted-foreground">
          Compare repeat rate and LTV for discount-first vs full-price-first buyers (last 2 years).
        </p>
      </div>

      <Suspense fallback={<PanelSkeleton />}>
        <PromoImpactPanel />
      </Suspense>
    </div>
  );
}
