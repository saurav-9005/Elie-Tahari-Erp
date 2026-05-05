'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const CHUNK = 1000;

const LOCATIONS = [
  'Creative Logistic Services',
  'ELIE TAHARI',
  'National Harbor',
  'Pembroke Gardens',
  'Santa Monica Place',
  'Studio Milburn',
] as const;

type RawRow = {
  location_name: string | null;
  quantity: number | null;
};

function asNum(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function emptyTotalsFor(locations: readonly string[]): Record<string, number> {
  return Object.fromEntries(locations.map((l) => [l, 0]));
}

export function StoreLocationMetrics({ locations: locationsProp }: { locations?: string[] }) {
  const locationsKey =
    locationsProp === undefined ? '__all__' : locationsProp.join('|');

  const activeLocations = useMemo(() => {
    if (locationsProp === undefined) return [...LOCATIONS];
    return [...locationsProp];
  }, [locationsKey]);

  const [totals, setTotals] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTotals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const list = activeLocations;
      const sums = emptyTotalsFor(list);
      let from = 0;
      for (;;) {
        const { data, error: qErr } = await supabase
          .from('inventory_levels' as never)
          .select('location_name, quantity')
          .in('location_name', list)
          .gte('quantity', 1)
          .range(from, from + CHUNK - 1);
        if (qErr) throw new Error(qErr.message);
        const batch = (data ?? []) as RawRow[];
        const allowed = new Set(list);
        for (const r of batch) {
          const loc = String(r.location_name ?? '');
          if (!allowed.has(loc)) continue;
          sums[loc] = (sums[loc] ?? 0) + asNum(r.quantity);
        }
        if (batch.length < CHUNK) break;
        from += CHUNK;
      }
      setTotals(sums);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load store location totals');
      setTotals(null);
    } finally {
      setLoading(false);
    }
  }, [activeLocations]);

  useEffect(() => {
    void fetchTotals();
  }, [fetchTotals]);

  const cardFlex = { flex: '1 1 calc(33% - 16px)' } as const;
  const rowStyle = { display: 'flex', flexWrap: 'wrap' as const, gap: '16px' };

  if (loading) {
    return (
      <div style={rowStyle}>
        {activeLocations.map((loc) => (
          <Card key={loc} className="border-border bg-card" style={cardFlex}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-3 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const values = totals ?? emptyTotalsFor(activeLocations);

  const locations = [...activeLocations].map((location) => ({
    location,
    total_qty: values[location] ?? 0,
  }));
  locations.sort((a, b) => b.total_qty - a.total_qty);

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div style={rowStyle}>
        {locations.map(({ location, total_qty }) => (
          <Card key={location} className="border-border bg-card" style={cardFlex}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{location}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tabular-nums">
                {total_qty.toLocaleString('en-US')}
              </div>
              <p className="text-xs text-muted-foreground">Total units in stock</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
