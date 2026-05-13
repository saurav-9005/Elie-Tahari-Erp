import { Suspense } from 'react';
import { getServerSession, hasRole } from '@/lib/supabase/session';
import { ErpForbidden } from '@/components/erp/erp-forbidden';
import { Skeleton } from '@/components/ui/skeleton';
import { DonationClient } from './donation-client';

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div
        className="rounded-lg border border-border"
        style={{ overflowX: 'auto', overflowY: 'auto', height: '600px' }}
      >
        <div className="space-y-2 p-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-none" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function DonationInventoryPage() {
  const session = await getServerSession();
  if (!hasRole(session, ['super admin', 'admin', 'warehouse'])) {
    return <ErpForbidden />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-2xl font-semibold tracking-tight">Donation Inventory</h1>
        <p className="text-sm text-muted-foreground">Inventory transfer and donation records</p>
      </div>

      <Suspense fallback={<PageSkeleton />}>
        <DonationClient />
      </Suspense>
    </div>
  );
}
