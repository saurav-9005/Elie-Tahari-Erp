import { Suspense } from 'react';
import { getServerSession, hasRole } from '@/lib/supabase/session';
import { ErpForbidden } from '@/components/erp/erp-forbidden';
import { Skeleton } from '@/components/ui/skeleton';
import { LtvProductPanel } from '../_components/customer-analytics-panels';

function PanelSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-full max-w-md" />
      <Skeleton className="h-[min(400px,50vh)] w-full rounded-lg border border-border" />
      <Skeleton className="h-48 w-full rounded-lg border border-border" />
    </div>
  );
}

export default async function LtvProductPage() {
  const session = await getServerSession();
  if (!hasRole(session, ['super admin', 'admin', 'finance'])) {
    return <ErpForbidden />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-2xl font-semibold tracking-tight">LTV by First Product</h1>
        <p className="text-sm text-muted-foreground">
          Cohort LTV by the style from each customer&apos;s first order line item (last 2 years).
        </p>
      </div>

      <Suspense fallback={<PanelSkeleton />}>
        <LtvProductPanel />
      </Suspense>
    </div>
  );
}
