import { Suspense } from 'react';
import { getServerSession, hasRole } from '@/lib/supabase/session';
import { ErpForbidden } from '@/components/erp/erp-forbidden';
import { Skeleton } from '@/components/ui/skeleton';
import { LtvChannelPanel } from '../_components/customer-analytics-panels';

function PanelSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-full max-w-md" />
      <Skeleton className="h-[300px] w-full rounded-lg border border-border" />
      <Skeleton className="h-48 w-full rounded-lg border border-border" />
    </div>
  );
}

export default async function LtvChannelPage() {
  const session = await getServerSession();
  if (!hasRole(session, ['admin', 'finance'])) {
    return <ErpForbidden />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-2xl font-semibold tracking-tight">LTV by Channel</h1>
        <p className="text-sm text-muted-foreground">
          Average lifetime value and revenue by acquisition channel (first order, last 2 years).
        </p>
      </div>

      <Suspense fallback={<PanelSkeleton />}>
        <LtvChannelPanel />
      </Suspense>
    </div>
  );
}
