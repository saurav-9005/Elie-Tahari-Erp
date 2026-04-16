'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export type Q1ReportRow = {
  shopify_order_id: string;
  sales_channel: string;
  product_variant_sku: string;
  product_title: string | null;
  order_name: string | null;
  quantity: number;
  gross_sales: number;
  net_sales: number;
  discount: number;
  return_amount: number;
};

export type Q1DisplayRow = Q1ReportRow & {
  isReturnRow?: boolean;
};

export type Q1Summary = {
  total_orders: number;
  total_skus: number;
  gross_sales: number;
  net_sales: number;
  total_units: number;
  total_returned: number;
};

function fmtMoney(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function toNum(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
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
      sales_channel: String(o.sales_channel ?? ''),
      product_variant_sku: String(o.product_variant_sku ?? ''),
      product_title: o.product_title == null ? null : String(o.product_title),
      order_name: o.order_name == null ? null : String(o.order_name).replace(/^#/, ''),
      quantity: toNum(qty),
      gross_sales: toNum(o.gross_sales),
      net_sales: toNum(o.net_sales),
      discount: toNum(o.discount ?? o.total_discount),
      return_amount: toNum(o.return_amount),
    };
  });
}

/** After each sale row with refunds, append a detail row (UI only). */
function expandRowsWithReturns(rows: Q1ReportRow[]): Q1DisplayRow[] {
  const out: Q1DisplayRow[] = [];
  for (const r of rows) {
    out.push({ ...r, isReturnRow: false });
    if (r.return_amount > 0) {
      out.push({
        ...r,
        net_sales: 0,
        discount: 0,
        isReturnRow: true,
      });
    }
  }
  return out;
}

function asSummary(data: unknown): Q1Summary {
  const o = data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
  return {
    total_orders: toNum(o.total_orders),
    total_skus: toNum(o.total_skus),
    gross_sales: toNum(o.gross_sales),
    net_sales: toNum(o.net_sales),
    total_units: toNum(o.total_units),
    total_returned: toNum(o.total_returned ?? o.total_return_amount),
  };
}

function pageTotals(rows: Q1ReportRow[]) {
  return rows.reduce(
    (acc, r) => ({
      quantity: acc.quantity + r.quantity,
      gross_sales: acc.gross_sales + r.gross_sales,
      net_sales: acc.net_sales + r.net_sales,
      discount: acc.discount + r.discount,
      return_amount: acc.return_amount + r.return_amount,
    }),
    { quantity: 0, gross_sales: 0, net_sales: 0, discount: 0, return_amount: 0 }
  );
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
}: {
  initialRows: Q1ReportRow[];
  summary: Q1Summary;
  initialTotalLineItems: number;
  pageSize: number;
}) {
  const [rows, setRows] = useState(initialRows);
  const [summary, setSummary] = useState(initialSummary);
  const [total, setTotal] = useState(initialTotalLineItems);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const skipDebounceFetchRef = useRef(true);

  const displayRows = useMemo(() => expandRowsWithReturns(rows), [rows]);
  const totals = useMemo(() => pageTotals(rows), [rows]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const fetchPage = useCallback(async (nextPage: number, search: string) => {
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
  }, [pageSize]);

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

  const exportHref = useMemo(() => {
    const qs = new URLSearchParams();
    if (debouncedSearch) qs.set('search', debouncedSearch);
    return `/api/erp/q1-report/export${qs.toString() ? `?${qs.toString()}` : ''}`;
  }, [debouncedSearch]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
            <CardTitle className="text-sm">Total returned</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">${fmtMoney(summary.total_returned)}</CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Search order name, order ID, SKU, title (server-side, 500ms debounce)"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <Button asChild variant="outline">
          <a href={exportHref}>Export CSV</a>
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Sales channel</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Product title</TableHead>
              <TableHead>Order name</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Gross sales</TableHead>
              <TableHead className="text-right">Net sales</TableHead>
              <TableHead className="text-right">Discount</TableHead>
              <TableHead className="text-right">Return amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="bg-muted/50 font-medium">
              <TableCell colSpan={5}>Page totals (sale rows)</TableCell>
              <TableCell className="text-right tabular-nums">{totals.quantity.toLocaleString('en-US')}</TableCell>
              <TableCell className="text-right tabular-nums">${fmtMoney(totals.gross_sales)}</TableCell>
              <TableCell className="text-right tabular-nums">${fmtMoney(totals.net_sales)}</TableCell>
              <TableCell className="text-right tabular-nums">${fmtMoney(totals.discount)}</TableCell>
              <TableCell className="text-right">
                <ReturnAmountCell amount={totals.return_amount} />
              </TableCell>
            </TableRow>
            {displayRows.map((r, idx) => (
              <TableRow
                key={`${r.shopify_order_id}-${r.product_variant_sku}-${idx}-${r.isReturnRow ? 'ret' : 'sale'}`}
                className={cn(r.isReturnRow && 'border-l-2 border-red-500 bg-red-500/[0.04]')}
              >
                <TableCell>{r.shopify_order_id}</TableCell>
                <TableCell>{r.sales_channel}</TableCell>
                <TableCell>{r.product_variant_sku}</TableCell>
                <TableCell>{r.product_title ?? '-'}</TableCell>
                <TableCell>{r.order_name ? `#${r.order_name}` : '-'}</TableCell>
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
          Page {page} of {totalPages} - {total.toLocaleString('en-US')} line items
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
