import { Skeleton } from '@/components/ui/skeleton';

export default function InventoryReportLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Loading inventory report — this may take up to 60 seconds...
        </p>
        <Skeleton className="h-4 w-full max-w-xl" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-24" />
        </div>
        <Skeleton className="h-[420px] w-full" />
      </div>
    </div>
  );
}
