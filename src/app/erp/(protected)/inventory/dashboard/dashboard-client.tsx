'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

type TopSeller = {
  sku: string;
  title: string;
  units_sold: number;
  revenue: number;
  current_stock: number | null;
};

type StockAlert = {
  sku: string;
  title: string;
  current_stock: number;
  daily_velocity: number;
  days_remaining: number | null;
  alert_level: 'critical' | 'warning' | 'ok';
};

const chartConfig = {
  units_sold: {
    label: 'Units sold',
    color: 'hsl(var(--chart-1))',
  },
};

function fmtMoney(n: number) {
  return `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export function InventoryDashboardClient({
  topSellers,
  stockAlerts,
}: {
  topSellers: TopSeller[];
  stockAlerts: StockAlert[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top sellers in 2026</CardTitle>
          <CardDescription>SKU, units sold, revenue and live stock.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ChartContainer config={chartConfig} className="h-[320px] w-full">
            <BarChart data={topSellers} layout="vertical" margin={{ left: 0, right: 8, top: 8, bottom: 8 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" dataKey="units_sold" />
              <YAxis
                type="category"
                width={90}
                dataKey="sku"
                tickFormatter={(v) => String(v).slice(0, 12)}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="units_sold" radius={6} fill="var(--color-units_sold)" />
            </BarChart>
          </ChartContainer>
          <div className="space-y-2">
            {topSellers.map((row) => (
              <div key={`${row.sku}-${row.title}`} className="grid grid-cols-12 gap-2 rounded-md border p-2 text-xs">
                <p className="col-span-2 font-mono">{row.sku || '—'}</p>
                <p className="col-span-5 truncate">{row.title}</p>
                <p className="col-span-2 text-right">{row.units_sold.toLocaleString()}</p>
                <p className="col-span-2 text-right">{fmtMoney(row.revenue)}</p>
                <p className="col-span-1 text-right">{row.current_stock ?? 0}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Stock risk alerts</CardTitle>
          <CardDescription>Products with less than 14 days of stock left.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {stockAlerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No risk alerts for 2026 sales velocity.</p>
          ) : (
            stockAlerts.map((r) => {
              const rowClass =
                r.alert_level === 'critical'
                  ? 'border-red-500/40 bg-red-500/10'
                  : r.alert_level === 'warning'
                    ? 'border-amber-500/40 bg-amber-500/10'
                    : 'border-border';
              return (
                <div key={`${r.sku}-${r.title}`} className={`rounded-md border p-3 ${rowClass}`}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="font-medium">{r.title}</p>
                    <div className="flex gap-2">
                      {r.alert_level === 'critical' ? (
                        <Badge variant="destructive">Reorder now</Badge>
                      ) : null}
                      <Badge variant={r.alert_level === 'critical' ? 'destructive' : 'secondary'}>
                        {r.alert_level.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    SKU {r.sku} | Stock {r.current_stock} | Daily {r.daily_velocity} | Days left{' '}
                    {r.days_remaining ?? '—'}
                  </p>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
