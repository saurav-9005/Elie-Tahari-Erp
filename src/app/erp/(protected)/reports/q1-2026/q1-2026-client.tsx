'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export type Q1ReportRow = {
  shopify_order_id: string;
  sales_channel: string;
  product_variant_sku: string;
  product_title: string | null;
  order_name: string | null;
  /** ISO timestamp from API (UTC); display with {@link formatDateEST}. */
  order_date: string | null;
  vendor: string | null;
  quantity: number;
  gross_sales: number;
  net_sales: number;
  discount: number;
  return_amount: number;
  row_type?: 'sale' | 'return_only' | string;
};

export type Q1DisplayRow = Q1ReportRow & {
  isReturnRow?: boolean;
};

export type Q1Summary = {
  total_orders: number;
  total_skus: number;
  total_units: number;
  gross_sales: number;
  net_sales: number;
  total_returned: number;
};

function fmtMoney(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function toNum(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function formatDateEST(dateStr: string | null | undefined): string {
  if (dateStr == null || String(dateStr).trim() === '') return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Shopify-style order name: #RS378750 */
function formatOrderNameDisplay(raw: string | null | undefined): string {
  if (raw == null || String(raw).trim() === '') return '—';
  const s = String(raw).trim().replace(/^#/, '');
  return s ? `#${s}` : '—';
}

function asRows(data: unknown): Q1ReportRow[] {
  if (!Array.isArray(data)) return [];
  return data.map((r) => {
    const o = (r ?? {}) as Record<string, unknown>;
    const qty =
      o.quantity ??
      o.qty ??
      o.line_quantity ??
      (typeof o.quantity_sold === 'number' ? o.quantity_sold : null);
    return {
      shopify_order_id: String(o.shopify_order_id ?? ''),
      sales_channel: String(o.sales_channel ?? 'Online Store'),
      product_variant_sku: String(o.product_variant_sku ?? ''),
      product_title: o.product_title == null ? null : String(o.product_title),
      order_name: o.order_name == null ? null : String(o.order_name).replace(/^#/, ''),
      order_date:
        o.order_date != null
          ? String(o.order_date)
          : o.created_at != null
            ? String(o.created_at)
            : null,
      vendor: o.vendor == null || String(o.vendor).trim() === '' ? null : String(o.vendor).trim(),
      quantity: toNum(qty),
      gross_sales: toNum(o.gross_sales),
      net_sales: toNum(o.net_sales),
      discount: toNum(o.discount ?? o.total_discount),
      return_amount: toNum(o.return_amount),
      row_type: o.row_type == null ? undefined : String(o.row_type),
    };
  });
}

function asSummary(data: unknown): Q1Summary {
  const o = data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
  return {
    total_orders: toNum(o.total_orders),
    total_skus: toNum(o.total_skus),
    total_units: toNum(o.total_units),
    gross_sales: toNum(o.gross_sales),
    net_sales: toNum(o.net_sales),
    total_returned: toNum(o.total_returned ?? o.total_return_amount),
  };
}

/**
 * After each sale row with refunds, append a duplicate return-detail row (UI only).
 * Sale row: return_amount = 0 so returns aren’t double-counted with the following row.
 * Return-only row: return_amount from API. Synthetic return row: gross/net/discount = 0, return = amount.
 */
function expandRowsWithReturns(rows: Q1ReportRow[]): Q1DisplayRow[] {
  const out: Q1DisplayRow[] = [];
  for (const r of rows) {
    const isReturnOnly = String(r.row_type ?? '').toLowerCase() === 'return_only';
    if (isReturnOnly) {
      out.push({ ...r, isReturnRow: true });
      continue;
    }
    const returnAmt = r.return_amount;
    out.push({ ...r, return_amount: 0, isReturnRow: false });
    if (returnAmt > 0) {
      out.push({
        ...r,
        quantity: 0,
        gross_sales: 0,
        net_sales: 0,
        discount: 0,
        return_amount: returnAmt,
        isReturnRow: true,
      });
    }
  }
  return out;
}

function ReturnAmountCell({ amount }: { amount: number }) {
  if (amount > 0) {
    return <span className="font-medium text-red-500 tabular-nums">${fmtMoney(amount)}</span>;
  }
  return <span className="text-muted-foreground tabular-nums">${fmtMoney(0)}</span>;
}

export function Q12026ReportClient({
  initialRows,
  summary: initialSummary,
  initialTotalLineItems,
  pageSize,
  vendorOptions,
}: {
  initialRows: Q1ReportRow[];
  summary: Q1Summary;
  initialTotalLineItems: number;
  pageSize: number;
  vendorOptions: string[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [summary, setSummary] = useState(initialSummary);
  const [total, setTotal] = useState(initialTotalLineItems);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [vendor, setVendor] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const skipDebounceFetchRef = useRef(true);

  const filteredSaleRows = useMemo(() => {
    if (vendor === 'all') return rows;
    return rows.filter((r) => (r.vendor ?? '') === vendor);
  }, [rows, vendor]);

  const displayRows = useMemo(() => expandRowsWithReturns(filteredSaleRows), [filteredSaleRows]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const fetchPage = useCallback(
    async (nextPage: number, search: string) => {
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        qs.set('page', String(nextPage));
        qs.set('pageSize', String(pageSize));
        if (search.trim()) qs.set('search', search.trim());
        const res = await fetch(`/api/erp/q1-report?${qs.toString()}`, { cache: 'no-store' });
        const json = (await res.json()) as {
          rows?: unknown;
          total?: number;
          summary?: unknown;
          error?: string;
        };
        if (!res.ok) {
          console.error(json.error ?? 'Q1 report fetch failed');
          return;
        }
        setRows(asRows(json.rows ?? []));
        setTotal(toNum(json.total));
        setSummary(asSummary(json.summary ?? {}));
        setPage(nextPage);
      } finally {
        setLoading(false);
      }
    },
    [pageSize]
  );

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 500);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (skipDebounceFetchRef.current) {
      skipDebounceFetchRef.current = false;
      return;
    }
    void fetchPage(1, debouncedSearch);
  }, [debouncedSearch, fetchPage]);

  useEffect(() => {
    setPage(1);
  }, [vendor]);

  const exportHref = useMemo(() => {
    const qs = new URLSearchParams();
    if (debouncedSearch) qs.set('search', debouncedSearch);
    return `/api/erp/q1-report/export${qs.toString() ? `?${qs.toString()}` : ''}`;
  }, [debouncedSearch]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total orders</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {summary.total_orders.toLocaleString('en-US')}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total SKUs</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {summary.total_skus.toLocaleString('en-US')}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total units sold</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {summary.total_units.toLocaleString('en-US')}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Gross sales</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">${fmtMoney(summary.gross_sales)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Net sales</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">${fmtMoney(summary.net_sales)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total returns</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-red-500">
            ${fmtMoney(summary.total_returned)}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Input
          className="max-w-md"
          placeholder="Search SKU, title, order name, order ID…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <Select value={vendor} onValueChange={setVendor}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Vendor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All vendors</SelectItem>
            {vendorOptions.map((v) => (
              <SelectItem key={v} value={v}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button asChild variant="outline">
          <a href={exportHref}>Export CSV</a>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Search is server-side (500ms debounce, resets to page 1). Vendor filters rows on the current page when the
        report includes a <code className="rounded bg-muted px-1">vendor</code> field per line (join from products /
        inventory in SQL).
      </p>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Sales channel</TableHead>
              <TableHead>Product variant SKU</TableHead>
              <TableHead>Product title</TableHead>
              <TableHead>Order name</TableHead>
              <TableHead className="whitespace-nowrap">Date (ET)</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Gross sales ($)</TableHead>
              <TableHead className="text-right">Net sales ($)</TableHead>
              <TableHead className="text-right">Discount ($)</TableHead>
              <TableHead className="text-right">Return amount ($)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayRows.map((r, idx) => (
              <TableRow
                key={`${r.shopify_order_id}-${r.product_variant_sku}-${idx}-${r.isReturnRow ? 'ret' : 'sale'}`}
                className={cn(r.isReturnRow && 'border-l-2 border-red-500 bg-red-500/[0.04]')}
              >
                <TableCell className="font-mono text-xs">{r.shopify_order_id}</TableCell>
                <TableCell>{r.sales_channel}</TableCell>
                <TableCell>{r.product_variant_sku}</TableCell>
                <TableCell className="max-w-[240px] truncate" title={r.product_title ?? undefined}>
                  {r.product_title ?? '—'}
                </TableCell>
                <TableCell>{formatOrderNameDisplay(r.order_name)}</TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {formatDateEST(r.order_date)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{r.quantity.toLocaleString('en-US')}</TableCell>
                <TableCell className="text-right tabular-nums">${fmtMoney(r.gross_sales)}</TableCell>
                <TableCell className="text-right tabular-nums">${fmtMoney(r.net_sales)}</TableCell>
                <TableCell className="text-right tabular-nums">${fmtMoney(r.discount)}</TableCell>
                <TableCell className="text-right">
                  <ReturnAmountCell amount={r.return_amount} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {page} of {totalPages} · {total.toLocaleString('en-US')} total line items
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={page <= 1 || loading}
            onClick={() => void fetchPage(page - 1, debouncedSearch)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={page >= totalPages || loading}
            onClick={() => void fetchPage(page + 1, debouncedSearch)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
