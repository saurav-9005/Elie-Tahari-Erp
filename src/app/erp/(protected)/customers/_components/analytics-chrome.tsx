'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { isTimeoutLike, TIMEOUT_HELP, type CohortMetrics } from '../_lib/customer-analytics';

export function TabLoadingOverlay({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-lg bg-background/85 backdrop-blur-sm"
      aria-busy="true"
      aria-live="polite"
    >
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
      <p className="text-sm text-muted-foreground">Loading data...</p>
    </div>
  );
}

export function TabErrorPanel({
  message,
  onRefresh,
}: {
  message?: string | null;
  onRefresh: () => void;
}) {
  if (!message) return null;
  const isTimeout = message === TIMEOUT_HELP || isTimeoutLike(message);
  return (
    <div
      className={cn(
        'rounded-lg border px-4 py-3 text-sm',
        isTimeout
          ? 'border-amber-500/40 bg-amber-500/10 text-foreground'
          : 'border-destructive/40 bg-destructive/10 text-destructive'
      )}
    >
      <p>{isTimeout ? TIMEOUT_HELP : message}</p>
      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onRefresh}>
        Refresh
      </Button>
    </div>
  );
}

export function CohortCard({ title, metrics }: { title: string; metrics: CohortMetrics | null }) {
  if (!metrics || (metrics.customers ?? 0) <= 0) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>No cohort rows for this bucket.</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{(metrics.customers ?? 0).toLocaleString('en-US')} customers</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">Repeat rate</p>
          <p className="text-xl font-semibold tabular-nums">{(metrics.repeat_rate_pct ?? 0).toLocaleString('en-US', { maximumFractionDigits: 1 })}%</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Avg LTV</p>
          <p className="text-xl font-semibold tabular-nums">${(metrics.avg_ltv ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Avg orders</p>
          <p className="text-xl font-semibold tabular-nums">{(metrics.avg_orders ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
        </div>
      </CardContent>
    </Card>
  );
}
