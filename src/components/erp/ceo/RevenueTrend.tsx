'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { RevenueTrendPoint } from './ceo-types';

const CURRENT = '#7F77DD';
const PREVIOUS = '#CECBF6';

type TrendPayload = {
  current: RevenueTrendPoint[] | null;
  previous: RevenueTrendPoint[] | null;
};

function parseTrend(data: unknown): TrendPayload {
  if (!data || typeof data !== 'object') return { current: null, previous: null };
  const o = data as Record<string, unknown>;
  const cur = o.current;
  const prev = o.previous;
  return {
    current: Array.isArray(cur) ? (cur as RevenueTrendPoint[]) : null,
    previous: Array.isArray(prev) ? (prev as RevenueTrendPoint[]) : null,
  };
}

type Props = {
  trendJson: unknown;
  days: number;
  errorMessage?: string | null;
};

export function RevenueTrend({ trendJson, days, errorMessage }: Props) {
  const { current, previous } = parseTrend(trendJson);

  const chartData = useMemo(() => {
    const a = current ?? [];
    const b = previous ?? [];
    const n = Math.max(a.length, b.length);
    if (n === 0) return [];
    return Array.from({ length: n }, (_, i) => ({
      label: a[i]?.date ?? b[i]?.date ?? `—`,
      current: a[i]?.revenue ?? null,
      previous: b[i]?.revenue ?? null,
      orders: a[i]?.orders,
      aov: a[i]?.aov,
    }));
  }, [current, previous]);

  const maxPoint = useMemo(() => {
    if (!chartData.length) return null;
    let idx = 0;
    let max = -Infinity;
    chartData.forEach((row, i) => {
      const v = row.current ?? 0;
      if (v > max) {
        max = v;
        idx = i;
      }
    });
    if (max <= 0) return null;
    return { idx, label: chartData[idx].label, value: max };
  }, [chartData]);

  const periods = [
    { label: '7d', value: 7 },
    { label: '30d', value: 30 },
    { label: '90d', value: 90 },
  ];

  return (
    <Card className="bg-card">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
        <CardTitle className="text-base">Revenue trend</CardTitle>
        <div className="flex gap-1 rounded-md border border-border bg-muted/40 p-0.5">
          {periods.map((p) => (
            <Link
              key={p.value}
              href={`/erp/ceo?trend=${p.value}`}
              scroll={false}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                days === p.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </CardHeader>
      <CardContent className="h-[320px] pt-0">
        {errorMessage ? (
          <p className="text-sm text-destructive">{errorMessage}</p>
        ) : chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground">No 2026 data found for this metric</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
              <YAxis
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                tickFormatter={(v) =>
                  `$${Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
                }
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0]?.payload as {
                    label?: string;
                    current?: number | null;
                    previous?: number | null;
                    orders?: number;
                    aov?: number;
                  };
                  const cur = row.current;
                  const prev = row.previous;
                  return (
                    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
                      <p className="font-medium text-foreground">{label}</p>
                      {cur != null && (
                        <p className="text-muted-foreground">
                          Revenue:{' '}
                          <span className="font-medium text-foreground">
                            ${Number(cur).toLocaleString('en-US')}
                          </span>
                        </p>
                      )}
                      {row.orders != null && (
                        <p className="text-muted-foreground">
                          Orders:{' '}
                          <span className="font-medium text-foreground">{row.orders}</span>
                        </p>
                      )}
                      {row.aov != null && (
                        <p className="text-muted-foreground">
                          AOV:{' '}
                          <span className="font-medium text-foreground">
                            ${Number(row.aov).toLocaleString('en-US')}
                          </span>
                        </p>
                      )}
                      {prev != null && (
                        <p className="mt-1 border-t border-border pt-1 text-muted-foreground">
                          Prior period: ${Number(prev).toLocaleString('en-US')}
                        </p>
                      )}
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="previous"
                stroke={PREVIOUS}
                strokeWidth={2}
                dot={false}
                name="Prior period"
              />
              <Line
                type="monotone"
                dataKey="current"
                stroke={CURRENT}
                strokeWidth={2}
                dot={false}
                name="Current"
              />
              {maxPoint && (
                <ReferenceDot
                  x={chartData[maxPoint.idx]?.label}
                  y={maxPoint.value}
                  r={6}
                  fill={CURRENT}
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                  ifOverflow="extendDomain"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
        {maxPoint && chartData.length > 0 && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Peak day: {maxPoint.label} · ${maxPoint.value.toLocaleString('en-US')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
