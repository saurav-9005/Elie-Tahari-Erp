import { Suspense } from 'react';
import { getServerSession, hasRole } from '@/lib/supabase/session';
import { ErpForbidden } from '@/components/erp/erp-forbidden';
import { Skeleton } from '@/components/ui/skeleton';
import { WmsClient } from './wms-client';

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4">
            <Skeleton className="mb-2 h-4 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
      <Skeleton className="h-10 w-full max-w-4xl" />
      <div className="space-y-2 rounded-lg border border-border p-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

export default async function WmsPage() {
  const session = await getServerSession();
  if (!hasRole(session, ['super admin', 'admin', 'warehouse'])) {
    return <ErpForbidden />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-2xl font-semibold tracking-tight">WMS — Warehouse Management</h1>
        <p className="text-sm text-muted-foreground">Receiving report — factory deliveries</p>
      </div>

      <Suspense fallback={<PageSkeleton />}>
        <WmsClient />
      </Suspense>
    </div>
  );
}
