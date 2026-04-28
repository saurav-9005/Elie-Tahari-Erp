'use client';

import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 50;

export type ShopifyInventoryRow = {
  style: string;
  title: string;
  image_url: string | null;
  colors: string | null;
  current_stock: number;
  qty_sold: number;
  qty_returned: number;
  net_sold: number;
  return_rate_pct: number;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'oversold';
};

export type ShopifyInventorySummary = {
  total_styles: number;
  total_stock: number;
  total_sold: number;
  total_returned: number;
};

function toNum(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function normalizeArray(raw: unknown): unknown[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseRows(data: unknown): ShopifyInventoryRow[] {
  return normalizeArray(data).map((r) => {
    const o = (r ?? {}) as Record<string, unknown>;
    const statusRaw = String(o.stock_status ?? 'in_stock').toLowerCase();
    const stock_status =
      statusRaw === 'low_stock' ||
      statusRaw === 'out_of_stock' ||
      statusRaw === 'oversold' ||
      statusRaw === 'in_stock'
        ? (statusRaw as ShopifyInventoryRow['stock_status'])
        : 'in_stock';
    return {
      style: String(o.style ?? ''),
      title: String(o.title ?? ''),
      image_url: o.image_url == null || String(o.image_url).trim() === '' ? null : String(o.image_url),
      colors: o.colors == null || String(o.colors).trim() === '' ? null : String(o.colors),
      current_stock: toNum(o.current_stock),
      qty_sold: toNum(o.qty_sold),
      qty_returned: toNum(o.qty_returned),
      net_sold: toNum(o.net_sold),
      return_rate_pct: toNum(o.return_rate_pct),
      stock_status,
    };
  });
}

function parseSummary(data: unknown): ShopifyInventorySummary {
  const o = data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
  return {
    total_styles: toNum(o.total_styles ?? o.total_styles_count ?? o.total_skus),
    total_stock: toNum(o.total_stock),
    total_sold: toNum(o.total_sold ?? o.total_sold_2026),
    total_returned: toNum(o.total_returned ?? o.total_returned_2026),
  };
}

function toTotalCount(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.floor(v);
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : 0;
}

const MONTH_OPTIONS: { label: string; value: string }[] = [
  { label: 'All months', value: 'all' },
  { label: 'Jan 2026', value: '2026-01' },
  { label: 'Feb 2026', value: '2026-02' },
  { label: 'Mar 2026', value: '2026-03' },
  { label: 'Apr 2026', value: '2026-04' },
];

type StatusFilter = 'all' | ShopifyInventoryRow['stock_status'];

function returnRateClass(rate: number) {
  if (rate < 5) return 'text-emerald-400';
  if (rate <= 15) return 'text-amber-400';
  return 'text-red-400';
}

function statusBadgeClass(status: ShopifyInventoryRow['stock_status']) {
  switch (status) {
    case 'in_stock':
      return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400';
    case 'low_stock':
      return 'border-amber-500/40 bg-amber-500/10 text-amber-400';
    case 'out_of_stock':
      return 'border-red-500/40 bg-red-500/10 text-red-400';
    case 'oversold':
      return 'border-red-900/80 bg-red-950 text-red-300';
    default:
      return '';
  }
}

function statusLabel(status: ShopifyInventoryRow['stock_status']) {
  switch (status) {
    case 'in_stock':
      return 'IN STOCK';
    case 'low_stock':
      return 'LOW STOCK';
    case 'out_of_stock':
      return 'OUT OF STOCK';
    case 'oversold':
      return 'OVERSOLD';
    default:
      return status;
  }
}

function csv(rows: ShopifyInventoryRow[]) {
  const header = [
    'Style',
    'Product title',
    'Colors',
    'Current stock',
    'Units sold (2026)',
    'Units returned (2026)',
    'Net sold',
    'Return rate %',
    'Status',
  ];
  const esc = (v: string | number | null) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [
    header.join(','),
    ...rows.map((r) =>
      [
        esc(r.style),
        esc(r.title),
        esc(r.colors),
        esc(r.current_stock),
        esc(r.qty_sold),
        esc(r.qty_returned),
        esc(r.net_sold),
        esc(r.return_rate_pct),
        esc(statusLabel(r.stock_status)),
      ].join(',')
    ),
  ].join('\n');
}

function ImagePreviewTooltip({
  imageUrl,
  label,
  children,
}: {
  imageUrl: string | null;
  label: string;
  children: React.ReactNode;
}) {
  if (!imageUrl) {
    return <>{children}</>;
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" className="border-border bg-popover p-2">
        <Image
          src={imageUrl}
          alt={label}
          width={150}
          height={150}
          className="h-[150px] w-[150px] rounded-md object-cover"
          unoptimized
        />
      </TooltipContent>
    </Tooltip>
  );
}

export function ShopifyInventoryClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  /** URL month filter (omit param = all months). */
  const month = searchParams.get('month') ?? '';
  const monthSelectValue = month === '' ? 'all' : month;

  const [rows, setRows] = useState<ShopifyInventoryRow[]>([]);
  const [summary, setSummary] = useState<ShopifyInventorySummary | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const setQuery = useCallback(
    (next: { page?: number; month?: string }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.page !== undefined) {
        if (next.page <= 1) params.delete('page');
        else params.set('page', String(next.page));
      }
      if (next.month !== undefined) {
        if (next.month === '' || next.month === 'all') params.delete('month');
        else params.set('month', next.month);
        params.delete('page');
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    let cancelled = false;
    const qs = new URLSearchParams();
    qs.set('page', String(page));
    if (month) qs.set('month', month);

    setLoading(true);
    setError(null);

    const url = `/api/erp/shopify-inventory?${qs.toString()}`;
    fetch(url)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((data as { error?: string }).error ?? res.statusText);
        return data as { rows?: unknown; summary?: unknown; total?: unknown };
      })
      .then((data) => {
        if (cancelled) return;

        console.log('API response:', data);
        console.log('Rows:', Array.isArray(data.rows) ? data.rows.length : 0);
        console.log('Summary:', data.summary);

        const rawRows = data.rows ?? [];
        setRows(parseRows(rawRows));
        setSummary(data.summary != null ? parseSummary(data.summary) : null);
        setTotal(toTotalCount(data.total ?? 0));
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message ?? 'Failed to load');
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [page, month]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (s && !r.style.toLowerCase().includes(s) && !r.title.toLowerCase().includes(s)) return false;
      if (statusFilter !== 'all' && r.stock_status !== statusFilter) return false;
      return true;
    });
  }, [rows, q, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const exportCsv = () => {
    const blob = new Blob([csv(filtered)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shopify-inventory-2026-p${page}${month ? `-${month}` : ''}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!ready) {
    return (
      <TooltipProvider delayDuration={200}>
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border-border bg-card">
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-28" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-9 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Skeleton className="h-10 w-full max-w-3xl" />
          <div className="rounded-lg border border-border">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-none border-b border-border last:border-b-0" />
            ))}
          </div>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div
          className={cn(
            'grid gap-3 sm:grid-cols-2 xl:grid-cols-4',
            loading && 'opacity-70 transition-opacity'
          )}
        >
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total styles</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold tabular-nums">
              {(summary?.total_styles ?? 0).toLocaleString('en-US')}
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total stock</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold tabular-nums">
              {(summary?.total_stock ?? 0).toLocaleString('en-US')}
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total sold (2026)</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold tabular-nums text-sky-400">
              {(summary?.total_sold ?? 0).toLocaleString('en-US')}
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total returned (2026)</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold tabular-nums text-violet-400">
              {(summary?.total_returned ?? 0).toLocaleString('en-US')}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
          <Input
            className="max-w-sm border-border bg-background"
            placeholder="Search by style or product title…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Select
            value={monthSelectValue}
            onValueChange={(v) => setQuery({ month: v === 'all' ? '' : v, page: 1 })}
          >
            <SelectTrigger className="w-full border-border bg-background lg:w-[200px]">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {MONTH_OPTIONS.map((m) => (
                <SelectItem key={m.label} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-full border-border bg-background lg:w-[200px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="in_stock">In stock</SelectItem>
              <SelectItem value="low_stock">Low stock</SelectItem>
              <SelectItem value="out_of_stock">Out of stock</SelectItem>
              <SelectItem value="oversold">Oversold</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            className="border-border"
            onClick={exportCsv}
            disabled={filtered.length === 0}
          >
            Export CSV
          </Button>
        </div>

        <div className="relative overflow-x-auto rounded-lg border border-border">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/40 backdrop-blur-[1px]">
              <p className="text-sm text-muted-foreground">Loading…</p>
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-[120px]">Style</TableHead>
                <TableHead className="w-[56px]">Image</TableHead>
                <TableHead className="min-w-[180px]">Product title</TableHead>
                <TableHead>Colors</TableHead>
                <TableHead className="text-right">Current stock</TableHead>
                <TableHead className="text-right">Units sold (2026)</TableHead>
                <TableHead className="text-right">Units returned (2026)</TableHead>
                <TableHead className="text-right">Net sold</TableHead>
                <TableHead className="text-right">Return rate %</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                    No rows match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r, idx) => (
                  <TableRow key={`${r.style}-${r.title}-${idx}`} className="border-border">
                    <TableCell className="font-mono text-xs">{r.style || '—'}</TableCell>
                    <TableCell className="w-[56px]">
                      {r.image_url ? (
                        <ImagePreviewTooltip imageUrl={r.image_url} label={r.title}>
                          <button
                            type="button"
                            className="relative block h-10 w-10 overflow-hidden rounded border border-border"
                          >
                            <Image
                              src={r.image_url}
                              alt=""
                              width={40}
                              height={40}
                              className="h-10 w-10 object-cover"
                              unoptimized
                            />
                          </button>
                        </ImagePreviewTooltip>
                      ) : null}
                    </TableCell>
                    <TableCell className="max-w-[240px]">
                      <ImagePreviewTooltip imageUrl={r.image_url} label={r.title}>
                        <span className="line-clamp-2 cursor-default text-sm font-medium leading-snug">
                          {r.title}
                        </span>
                      </ImagePreviewTooltip>
                    </TableCell>
                    <TableCell className="max-w-[200px] text-sm text-muted-foreground">
                      {r.colors ?? '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.current_stock.toLocaleString('en-US')}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.qty_sold.toLocaleString('en-US')}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.qty_returned.toLocaleString('en-US')}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.net_sold.toLocaleString('en-US')}</TableCell>
                    <TableCell className={cn('text-right tabular-nums font-medium', returnRateClass(r.return_rate_pct))}>
                      {r.return_rate_pct.toLocaleString('en-US', { maximumFractionDigits: 1 })}%
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn('font-semibold tracking-wide', statusBadgeClass(r.stock_status))}
                      >
                        {statusLabel(r.stock_status)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} · {total.toLocaleString('en-US')} total styles
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-border"
              disabled={page <= 1 || loading}
              onClick={() => setQuery({ page: page - 1 })}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-border"
              disabled={page >= totalPages || loading}
              onClick={() => setQuery({ page: page + 1 })}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
