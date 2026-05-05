'use client';

import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CohortCard, TabErrorPanel, TabLoadingOverlay } from './analytics-chrome';
import { useCustomerAnalyticsTab } from './use-customer-analytics-tab';
import {
  chartChannel,
  chartProduct,
  donutChartConfig,
  downloadCsv,
  escCsv,
  parseChannelRows,
  parseProductRows,
  parsePromoPayload,
  parseSegmentsPayload,
  SEGMENT_COLORS,
  segmentBadge,
} from '../_lib/customer-analytics';

export function LtvChannelPanel() {
  const { data, loading, error, refetch } = useCustomerAnalyticsTab('channel');
  const channelRows = useMemo(() => parseChannelRows(data), [data]);

  const exportCsv = () => {
    const header = ['Channel', 'Customers', 'Avg Orders', 'Avg LTV', 'Total Revenue', 'Avg order value'];
    const lines = [
      header.join(','),
      ...channelRows.map((r) =>
        [
          escCsv(r.channelLabel),
          escCsv(r.customers),
          escCsv(r.avg_orders),
          escCsv(r.avg_ltv),
          escCsv(r.total_revenue),
          escCsv(r.avg_order_value),
        ].join(',')
      ),
    ].join('\n');
    downloadCsv(`customer-ltv-channel.csv`, lines);
  };

  return (
    <div className="space-y-6">
      <TabErrorPanel message={error} onRefresh={refetch} />
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={exportCsv} disabled={channelRows.length === 0}>
          Export CSV
        </Button>
      </div>
      <div className="relative min-h-[320px] space-y-6">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Avg LTV by acquisition channel</CardTitle>
            <CardDescription>Based on each customer&apos;s first order channel (last 2 years).</CardDescription>
          </CardHeader>
          <CardContent className="relative">
            {channelRows.length === 0 && !loading ? (
              <p className="text-sm text-muted-foreground">No channel data yet.</p>
            ) : channelRows.length > 0 ? (
              <ChartContainer config={chartChannel} className="h-[300px] w-full">
                <BarChart data={channelRows} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="channelLabel" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(v) => `$${Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`} />} />
                  <Bar dataKey="avg_ltv" radius={6} fill="var(--color-avg_ltv)" name="Avg LTV" />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[300px] space-y-3 p-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-40 w-full" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Channel breakdown</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel</TableHead>
                  <TableHead className="text-right">Customers</TableHead>
                  <TableHead className="text-right">Avg Orders</TableHead>
                  <TableHead className="text-right">Avg LTV</TableHead>
                  <TableHead className="text-right">Total Revenue</TableHead>
                  <TableHead className="text-right">Avg Order Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {channelRows.map((r) => (
                  <TableRow key={r.channel}>
                    <TableCell className="font-medium">{r.channelLabel}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.customers.toLocaleString('en-US')}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.avg_orders.toLocaleString('en-US')}</TableCell>
                    <TableCell className="text-right tabular-nums">${r.avg_ltv.toLocaleString('en-US', { maximumFractionDigits: 0 })}</TableCell>
                    <TableCell className="text-right tabular-nums">${r.total_revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</TableCell>
                    <TableCell className="text-right tabular-nums">${r.avg_order_value.toLocaleString('en-US', { maximumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <TabLoadingOverlay show={loading} />
      </div>
    </div>
  );
}

export function LtvProductPanel() {
  const { data, loading, error, refetch } = useCustomerAnalyticsTab('product');
  const productRows = useMemo(() => {
    const rows = parseProductRows(data);
    return [...rows].sort((a, b) => b.avg_ltv - a.avg_ltv);
  }, [data]);

  const exportCsv = () => {
    const header = ['Style', 'Customers', 'Avg LTV', 'Avg Orders', 'Return Rate %'];
    const lines = [
      header.join(','),
      ...productRows.map((r) =>
        [escCsv(r.style), escCsv(r.customers), escCsv(r.avg_ltv), escCsv(r.avg_orders), escCsv(r.return_rate_pct)].join(',')
      ),
    ].join('\n');
    downloadCsv(`customer-ltv-first-product.csv`, lines);
  };

  return (
    <div className="space-y-6">
      <TabErrorPanel message={error} onRefresh={refetch} />
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={exportCsv} disabled={productRows.length === 0}>
          Export CSV
        </Button>
      </div>
      <div className="relative min-h-[400px] space-y-6">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Top 20 first-purchase styles by customer count</CardTitle>
            <CardDescription>Horizontal bars show avg LTV for customers whose first SKU style was that style.</CardDescription>
          </CardHeader>
          <CardContent className="relative">
            {productRows.length === 0 && !loading ? (
              <p className="text-sm text-muted-foreground">No product cohort data yet.</p>
            ) : productRows.length > 0 ? (
              <ChartContainer config={chartProduct} className="h-[min(520px,70vh)] w-full">
                <BarChart data={productRows} layout="vertical" margin={{ left: 4, right: 16, top: 8, bottom: 8 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => `$${v}`} />
                  <YAxis type="category" dataKey="style" width={100} tickFormatter={(v) => String(v).slice(0, 14)} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(v) => `$${Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`} />} />
                  <Bar dataKey="avg_ltv" radius={6} fill="var(--color-avg_ltv)" name="Avg LTV" />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[min(400px,60vh)] space-y-3 p-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="h-48 w-full" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Style metrics</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Style</TableHead>
                  <TableHead className="text-right">Customers</TableHead>
                  <TableHead className="text-right">Avg LTV</TableHead>
                  <TableHead className="text-right">Avg Orders</TableHead>
                  <TableHead className="text-right">Return Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productRows.map((r) => (
                  <TableRow key={r.style}>
                    <TableCell className="font-mono text-xs">{r.style}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.customers.toLocaleString('en-US')}</TableCell>
                    <TableCell className="text-right tabular-nums">${r.avg_ltv.toLocaleString('en-US', { maximumFractionDigits: 0 })}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.avg_orders.toLocaleString('en-US')}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.return_rate_pct.toLocaleString('en-US', { maximumFractionDigits: 1 })}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <TabLoadingOverlay show={loading} />
      </div>
    </div>
  );
}

export function SegmentsPanel() {
  const { data, loading, error, refetch } = useCustomerAnalyticsTab('segments');
  const segments = useMemo(() => parseSegmentsPayload(data), [data]);
  const [segmentFilter, setSegmentFilter] = useState<string>('all');

  const filteredSegmentRows = useMemo(() => {
    if (segmentFilter === 'all') return segments.rows;
    return segments.rows.filter((r) => r.segment_key === segmentFilter);
  }, [segmentFilter, segments.rows]);

  const donutData = useMemo(() => {
    const keys = ['big_spenders', 'loyal_browsers', 'promo_hunters', 'brand_loyalists', 'other'] as const;
    return keys
      .map((k) => ({
        key: k,
        name: segmentBadge(k).label,
        value: segments.counts[k] ?? 0,
        fill: SEGMENT_COLORS[k] ?? SEGMENT_COLORS.other,
      }))
      .filter((d) => d.value > 0);
  }, [segments.counts]);

  const exportCsv = () => {
    const header = ['Customer', 'Email', 'Segment', 'Orders', 'Total Spent', 'Avg Discount %'];
    const lines = [
      header.join(','),
      ...filteredSegmentRows.map((r) => {
        const b = segmentBadge(r.segment_key);
        return [escCsv(r.customer_name), escCsv(r.email), escCsv(b.label), escCsv(r.order_count), escCsv(r.total_spent), escCsv(r.avg_discount_pct)].join(',');
      }),
    ].join('\n');
    downloadCsv(`customer-segments.csv`, lines);
  };

  return (
    <div className="space-y-6">
      <TabErrorPanel message={error} onRefresh={refetch} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select value={segmentFilter} onValueChange={setSegmentFilter}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Segment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All segments</SelectItem>
            <SelectItem value="big_spenders">Big Spenders</SelectItem>
            <SelectItem value="loyal_browsers">Loyal Browsers</SelectItem>
            <SelectItem value="promo_hunters">Promo Hunters</SelectItem>
            <SelectItem value="brand_loyalists">Brand Loyalists</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" size="sm" onClick={exportCsv} disabled={filteredSegmentRows.length === 0}>
          Export CSV
        </Button>
      </div>

      <div className="relative min-h-[480px] space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(['big_spenders', 'loyal_browsers', 'promo_hunters', 'brand_loyalists'] as const).map((k) => {
            const b = segmentBadge(k);
            return (
              <Card key={k} className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">{b.label}</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold tabular-nums">{(segments.counts[k] ?? 0).toLocaleString('en-US')}</CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg">Segment mix</CardTitle>
            </CardHeader>
            <CardContent className="h-[320px]">
              {donutData.length === 0 && !loading ? (
                <p className="text-sm text-muted-foreground">No segment distribution yet.</p>
              ) : donutData.length > 0 ? (
                <ChartContainer config={donutChartConfig} className="mx-auto h-full w-full max-w-md">
                  <PieChart>
                    <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={2}>
                      {donutData.map((entry) => (
                        <Cell key={entry.key} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => v.toLocaleString('en-US')} />
                    <Legend />
                  </PieChart>
                </ChartContainer>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
                  <Skeleton className="h-40 w-40 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Customers</CardTitle>
              <CardDescription>Filtered by segment.</CardDescription>
            </CardHeader>
            <CardContent className="max-h-[420px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Segment</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Total Spent</TableHead>
                    <TableHead className="text-right">Avg Discount %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSegmentRows.map((r, idx) => {
                    const b = segmentBadge(r.segment_key);
                    return (
                      <TableRow key={`${r.email}-${idx}`}>
                        <TableCell className="max-w-[140px] truncate">{r.customer_name ?? '—'}</TableCell>
                        <TableCell className="max-w-[180px] truncate text-xs text-muted-foreground">{r.email ?? '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={b.className}>
                            {b.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{r.order_count}</TableCell>
                        <TableCell className="text-right tabular-nums">${r.total_spent.toLocaleString('en-US', { maximumFractionDigits: 0 })}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.avg_discount_pct.toLocaleString('en-US', { maximumFractionDigits: 1 })}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        <TabLoadingOverlay show={loading} />
      </div>
    </div>
  );
}

export function PromoImpactPanel() {
  const { data, loading, error, refetch } = useCustomerAnalyticsTab('promo');
  const promo = useMemo(() => parsePromoPayload(data), [data]);

  const repeatInsight = useMemo(() => {
    const d = promo.repeat_rate_delta_pct;
    if (!Number.isFinite(d) || d === 0) return null;
    const pct = Math.abs(d).toLocaleString('en-US', { maximumFractionDigits: 1 });
    if (d > 0) return `Discount buyers have ${pct}% lower repeat rate than full-price buyers.`;
    return `Discount buyers have ${pct}% higher repeat rate than full-price buyers.`;
  }, [promo.repeat_rate_delta_pct]);

  const exportCsv = () => {
    const header = ['Cohort', 'Customers', 'Repeat Rate %', 'Avg LTV', 'Avg Orders', 'Avg Discount %'];
    const rows: string[] = [];
    if (promo.discount) {
      rows.push(
        [
          escCsv('Discount buyers'),
          escCsv(promo.discount.customers ?? 0),
          escCsv(promo.discount.repeat_rate_pct ?? 0),
          escCsv(promo.discount.avg_ltv ?? 0),
          escCsv(promo.discount.avg_orders ?? 0),
          escCsv(promo.discount.avg_discount_pct ?? 0),
        ].join(',')
      );
    }
    if (promo.fullPrice) {
      rows.push(
        [
          escCsv('Full price buyers'),
          escCsv(promo.fullPrice.customers ?? 0),
          escCsv(promo.fullPrice.repeat_rate_pct ?? 0),
          escCsv(promo.fullPrice.avg_ltv ?? 0),
          escCsv(promo.fullPrice.avg_orders ?? 0),
          escCsv(promo.fullPrice.avg_discount_pct ?? 0),
        ].join(',')
      );
    }
    downloadCsv(`customer-promo-impact.csv`, [header.join(','), ...rows].join('\n'));
  };

  return (
    <div className="space-y-6">
      <TabErrorPanel message={error} onRefresh={refetch} />
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={exportCsv}>
          Export CSV
        </Button>
      </div>

      <div className="relative min-h-[220px] space-y-4">
        {!promo.discount && !promo.fullPrice && !loading ? (
          <p className="text-sm text-muted-foreground">No promotion impact data yet.</p>
        ) : !promo.discount && !promo.fullPrice && loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-44 rounded-lg border border-border" />
            <Skeleton className="h-44 rounded-lg border border-border" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <CohortCard title="Discount buyers" metrics={promo.discount} />
              <CohortCard title="Full price buyers" metrics={promo.fullPrice} />
            </div>
            {repeatInsight ? <p className="text-sm text-muted-foreground">{repeatInsight}</p> : null}
          </>
        )}
        <TabLoadingOverlay show={loading} />
      </div>
    </div>
  );
}
