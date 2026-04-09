'use client';

import { useRouter } from 'next/navigation';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ParetoRow } from './ceo-types';

const BAR = '#7F77DD';
const CUM = '#CECBF6';

type Props = {
  rows: ParetoRow[];
  emptyMessage?: string;
};

export function ProductHealthParetoChart({ rows, emptyMessage }: Props) {
  const router = useRouter();
  const top = rows.slice(0, 10);

  const skuCountFor80 = (() => {
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].cumulative_pct >= 80) return i + 1;
    }
    return rows.length;
  })();

  const chartData = top.map((r) => ({
    ...r,
    short: r.product.length > 18 ? `${r.product.slice(0, 16)}…` : r.product,
  }));

  return (
    <Card className="bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Revenue concentration</CardTitle>
        <p className="text-xs text-muted-foreground">
          Top {skuCountFor80} SKU{skuCountFor80 === 1 ? '' : 's'} ≈ 80% of 2026 revenue (line
          items)
        </p>
      </CardHeader>
      <CardContent className="h-[280px]">
        {emptyMessage || chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {emptyMessage ?? 'No 2026 data found for this metric'}
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="short"
                interval={0}
                angle={-35}
                textAnchor="end"
                height={70}
                tick={{ fontSize: 10 }}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `$${Number(v).toLocaleString('en-US', { notation: 'compact' })}`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11 }}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as ParetoRow;
                  return (
                    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
                      <p className="font-medium text-foreground">{p.product}</p>
                      <p className="text-muted-foreground">
                        Revenue: ${Number(p.revenue).toLocaleString('en-US')}
                      </p>
                      <p className="text-muted-foreground">
                        Share: {p.pct_of_revenue}% · Cumulative {p.cumulative_pct}%
                      </p>
                    </div>
                  );
                }}
              />
              <Bar
                yAxisId="left"
                dataKey="revenue"
                fill={BAR}
                radius={[4, 4, 0, 0]}
                cursor="pointer"
                onClick={(_, index) => {
                  const row = chartData[index as number];
                  if (row?.product) {
                    router.push(`/erp/inventory?q=${encodeURIComponent(row.product)}`);
                  }
                }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumulative_pct"
                stroke={CUM}
                strokeWidth={2}
                dot={false}
                name="Cumulative %"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
