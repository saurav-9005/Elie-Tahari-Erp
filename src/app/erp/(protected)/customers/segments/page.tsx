import { Suspense } from 'react';
import { getServerSession, hasRole } from '@/lib/supabase/session';
import { ErpForbidden } from '@/components/erp/erp-forbidden';
import { Skeleton } from '@/components/ui/skeleton';
import { SegmentsPanel } from '../_components/customer-analytics-panels';

function PanelSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-full max-w-md" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg border border-border" />
        ))}
      </div>
      <Skeleton className="h-[320px] w-full rounded-lg border border-border" />
    </div>
  );
}

export default async function CustomerSegmentsPage() {
  const session = await getServerSession();
  if (!hasRole(session, ['super admin', 'admin', 'finance'])) {
    return <ErpForbidden />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-2xl font-semibold tracking-tight">Behavior Segmentation</h1>
        <p className="text-sm text-muted-foreground">
          Spend, frequency, and discount behavior groups across the last 2 years.
        </p>
      </div>

      <Suspense fallback={<PanelSkeleton />}>
        <SegmentsPanel />
      </Suspense>
    </div>
  );
}
