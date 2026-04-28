import { Suspense } from 'react';
import { getServerSession, hasRole } from '@/lib/supabase/session';
import { ErpForbidden } from '@/components/erp/erp-forbidden';
import { Skeleton } from '@/components/ui/skeleton';
import { ShopifyInventoryClient } from './shopify-client';

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4">
            <Skeleton className="mb-2 h-4 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
      <Skeleton className="h-10 w-full max-w-3xl" />
      <div className="space-y-2 rounded-lg border border-border">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

export default async function ShopifyInventoryPage() {
  const session = await getServerSession();
  if (!hasRole(session, ['admin', 'warehouse'])) {
    return <ErpForbidden />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-2xl font-semibold tracking-tight">Shopify Inventory</h1>
        <p className="text-sm text-muted-foreground">
          Current stock, sold and returned by style — 2026 data
        </p>
      </div>

      <Suspense fallback={<PageSkeleton />}>
        <ShopifyInventoryClient />
      </Suspense>
    </div>
  );
}
