'use client';

import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Download } from 'lucide-react';
import type { AnalyticsInventoryFlatRow } from './types';

type Period = 'before' | 'after';

type Props = {
  rows: AnalyticsInventoryFlatRow[];
  currencyCode: string;
  totalNetBefore: number;
  totalNetAfter: number;
  cutoffLabel: string;
  /** Lower bound for product created_at filter (e.g. January 1, 2023). */
  productFromLabel: string;
  /** Exact Shopify Admin product search string shown in the UI. */
  productShopifySearch: string;
  ordersLoadedBefore: number;
  ordersLoadedAfter: number;
  paginationLimitedBefore: boolean;
  paginationLimitedAfter: boolean;
  maxOrdersPerPeriod: number;
};

function safeInt(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function formatMoney(amount: number, currencyCode: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currencyCode}`;
  }
}

function escapeCsvCell(value: string | number): string {
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildAnalyticsInventoryCsv(
  rows: AnalyticsInventoryFlatRow[],
  currencyCode: string,
  cutoffLabel: string
): string {
  const headers = [
    'Product',
    'SKU',
    'Created',
    'Vendor',
    'Channel',
    `List price (${currencyCode})`,
    'Total available',
    `Net sales before ${cutoffLabel} (${currencyCode})`,
    `Net sales on or after ${cutoffLabel} (${currencyCode})`,
  ];
  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((r) =>
      [
        r.productName,
        r.sku,
        r.createdAtLabel,
        r.vendor,
        r.channel,
        r.price.toFixed(2),
        safeInt(r.totalAvailable),
        r.netSalesBefore.toFixed(2),
        r.netSalesAfter.toFixed(2),
      ]
        .map(escapeCsvCell)
        .join(',')
    ),
  ];
  return lines.join('\r\n');
}

export function AnalyticsInventorySalesTable({
  rows,
  currencyCode,
  totalNetBefore,
  totalNetAfter,
  cutoffLabel,
  productFromLabel,
  productShopifySearch,
  ordersLoadedBefore,
  ordersLoadedAfter,
  paginationLimitedBefore,
  paginationLimitedAfter,
  maxOrdersPerPeriod,
}: Props) {
  const [period, setPeriod] = useState<Period>('before');

  const total = period === 'before' ? totalNetBefore : totalNetAfter;
  const limitedForPeriod =
    period === 'before' ? paginationLimitedBefore : paginationLimitedAfter;

  const periodDescription = useMemo(
    () =>
      period === 'before'
        ? `Orders with processed date before ${cutoffLabel} (Shopify search: processed_at:<2025-07-01).`
        : `Orders with processed date on or after ${cutoffLabel} (processed_at:>=2025-07-01).`,
    [period, cutoffLabel]
  );

  const handleExportCsv = useCallback(() => {
    const csv = buildAnalyticsInventoryCsv(rows, currencyCode, cutoffLabel);
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [rows, currencyCode, cutoffLabel]);

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>Legacy product inventory</CardTitle>
            <CardDescription className="mt-2">
              Products: Shopify search{' '}
              <code className="whitespace-pre-wrap break-all rounded bg-muted px-1.5 py-0.5 text-sm">
                {productShopifySearch}
              </code>{' '}
              (from {productFromLabel} onward, before {cutoffLabel}).{' '}
              <span className="text-muted-foreground">
                Channel uses Shopify <span className="font-mono">productType</span>.
              </span>{' '}
              Net sales use the Orders API (line{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
                discountedTotalSet
              </code>{' '}
              minus refund line{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-sm">subtotalSet</code>
              ), matched by SKU.
            </CardDescription>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 shrink-0"
              onClick={handleExportCsv}
              disabled={rows.length === 0}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <div
              className="flex shrink-0 rounded-md border bg-muted/40 p-1"
              role="group"
              aria-label="Net sales period"
            >
              <button
                type="button"
                onClick={() => setPeriod('before')}
                className={cn(
                  'rounded-sm px-3 py-1.5 text-sm font-medium transition-colors',
                  period === 'before'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Before {cutoffLabel}
              </button>
              <button
                type="button"
                onClick={() => setPeriod('after')}
                className={cn(
                  'rounded-sm px-3 py-1.5 text-sm font-medium transition-colors',
                  period === 'after'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                After {cutoffLabel}
              </button>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">{periodDescription}</p>
          <p className="mt-1 font-headline text-xl font-semibold tracking-tight">
            Net sales ({period === 'before' ? 'before' : 'on or after'} cutoff):{' '}
            {formatMoney(total, currencyCode)}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Orders scanned for net sales:{' '}
            <span className="font-medium text-foreground">{ordersLoadedBefore}</span> before cutoff ·{' '}
            <span className="font-medium text-foreground">{ordersLoadedAfter}</span> on or after (max{' '}
            {maxOrdersPerPeriod.toLocaleString()} per side).
          </p>
          {limitedForPeriod ? (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">
              The active period hit the order fetch limit; net sales for these SKUs may be understated.
            </p>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-muted-foreground">
            No products matched this filter (check API scopes and catalog dates).
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead className="text-right">List price</TableHead>
                <TableHead className="text-right">Total available</TableHead>
                <TableHead className="text-right">
                  Net sales ({period === 'before' ? 'before' : 'after'})
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((item) => {
                const net =
                  period === 'before' ? item.netSalesBefore : item.netSalesAfter;
                return (
                  <TableRow key={item.key}>
                    <TableCell className="font-medium">{item.productName}</TableCell>
                    <TableCell>{item.sku}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.createdAtLabel}
                    </TableCell>
                    <TableCell>{item.vendor}</TableCell>
                    <TableCell>{item.channel}</TableCell>
                    <TableCell className="text-right">
                      {formatMoney(item.price, currencyCode)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {safeInt(item.totalAvailable).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatMoney(net, currencyCode)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
