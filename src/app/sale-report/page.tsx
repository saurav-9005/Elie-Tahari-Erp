'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';

export default function SaleReportPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
    return (
      <div className="flex h-[calc(100vh-theme(spacing.14))] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h1 className="font-headline text-3xl font-semibold tracking-tight">
          Sale Report
        </h1>
        <p className="text-muted-foreground">
          Live sales data from Metabase.
        </p>
      </div>
      <div className="flex-1 rounded-lg border overflow-hidden">
        <iframe
          src="https://et-metabase.clients-suntek.com/public/dashboard/d9d9209d-3744-49b9-b579-1ca70fad15e9"
          className="h-full w-full"
        />
      </div>
    </div>
  );
}
