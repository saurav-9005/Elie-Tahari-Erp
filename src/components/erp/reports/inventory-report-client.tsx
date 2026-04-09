'use client';

import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { parseInventoryReportRows } from '@/lib/erp/inventory-report-rows';
import type { InventoryReportRow, InventoryReportSummary } from '@/lib/erp/inventory-report-types';

export type { InventoryReportRow, InventoryReportSummary };

type SortKey = keyof InventoryReportRow;

/** $X,XXX.XX (table cells) */
function fmtMoney(n: number) {
  return `$${Number(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Whole dollars for summary bar (e.g. $134,695,400). */
function fmtMoneySummary(n: number) {
  return `$${Math.round(Number(n)).toLocaleString('en-US')}`;
}

const TOOLTIP_GROSS = 'Gross = full selling price × qty';
const TOOLTIP_NET = 'Net = after discounts applied';
const TOOLTIP_DISCOUNT = 'Discount = gross minus net';

function SummaryMetric({
  label,
  value,
  tooltip,
}: {
  label: string;
  value: string;
  tooltip?: string;
}) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        {label}
        {tooltip ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex rounded-sm text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label={`About ${label}`}
              >
                <Info className="h-3.5 w-3.5 shrink-0" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </span>
      <span className="font-semibold tabular-nums text-foreground">{value}</span>
    </p>
  );
}

function fmtNum(n: number) {
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function rowTone(row: InventoryReportRow): 'selling' | 'stopped' | 'never' {
  const totalQty = Number(row.total_qty);
  const afterQty = Number(row.qty_after_july);
  const afterGross = Number(row.gross_after_july);
  if (totalQty === 0) return 'never';
  if (afterQty > 0 || afterGross > 0) return 'selling';
  return 'stopped';
}

const ROW_CLASS: Record<ReturnType<typeof rowTone>, string> = {
  selling: 'bg-emerald-500/10 hover:bg-emerald-500/15',
  stopped: 'bg-amber-500/10 hover:bg-amber-500/15',
  never: 'bg-muted/50 hover:bg-muted/70',
};

const NUMERIC_SORT_DEFAULT: Partial<Record<SortKey, 'asc' | 'desc'>> = {
  current_stock: 'desc',
  qty_before_july: 'desc',
  gross_before_july: 'desc',
  net_before_july: 'desc',
  discount_before_july: 'desc',
  qty_after_july: 'desc',
  gross_after_july: 'desc',
  net_after_july: 'desc',
  discount_after_july: 'desc',
  total_qty: 'desc',
  total_gross: 'desc',
  total_net: 'desc',
  total_discount: 'desc',
};

type Props = {
  initialRows: InventoryReportRow[];
  /** Full report size from `erp_inventory_report_summary().total_skus` (not the paginated row count). */
  totalProductCount: number;
  pageSize: number;
  showPopulateHint: boolean;
  reportSummary: InventoryReportSummary | null;
  summaryError?: string | null;
};

export function InventoryReportClient({
  initialRows,
  totalProductCount,
  pageSize,
  showPopulateHint,
  reportSummary,
  summaryError,
}: Props) {
  const [q, setQ] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('title');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [rows, setRows] = useState(initialRows);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalProductCount / pageSize)),
    [totalProductCount, pageSize]
  );

  const loadPage = useCallback(
    async (targetPage: number) => {
      const maxPage = Math.max(1, Math.ceil(totalProductCount / pageSize));
      if (targetPage < 1 || targetPage > maxPage) return;
      setLoading(true);
      setPageError(null);
      try {
        const params = new URLSearchParams({
          page: String(targetPage),
          pageSize: String(pageSize),
        });
        const res = await fetch(`/api/erp/inventory-report?${params.toString()}`);
        const json: { rows?: unknown; error?: string } = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Failed to load page');
        setRows(parseInventoryReportRows(json.rows));
        setCurrentPage(targetPage);
      } catch (e) {
        setPageError(e instanceof Error ? e.message : 'Failed to load page');
      } finally {
        setLoading(false);
      }
    },
    [pageSize, totalProductCount]
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        r.title.toLowerCase().includes(s) || (r.sku && r.sku.toLowerCase().includes(s))
    );
  }, [rows, q]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      let cmp = 0;
      if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb;
      else if (va == null && vb == null) cmp = 0;
      else if (va == null) cmp = 1;
      else if (vb == null) cmp = -1;
      else cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(NUMERIC_SORT_DEFAULT[key] ?? 'asc');
    }
  };

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

  const COLS = 14;

  const rangeStart =
    totalProductCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, totalProductCount);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        {showPopulateHint && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            Product metadata (including dates) is empty. Run{' '}
            <code className="rounded bg-muted px-1 text-foreground">
              npm run shopify-import-inventory
            </code>{' '}
            to populate product dates.
          </div>
        )}

        <div className="rounded-lg border border-border bg-card/40 px-4 py-3 text-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Summary (full report)
          </p>
          <p className="mb-3 text-xs text-muted-foreground">
            Totals reflect every SKU in this report — independent of the table pagination and search
            below.
          </p>
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
            {TOOLTIP_GROSS}. {TOOLTIP_NET}. {TOOLTIP_DISCOUNT}.
          </p>
          {summaryError ? (
            <p className="text-sm text-destructive">
              Could not load summary totals: {summaryError}
            </p>
          ) : reportSummary ? (
            <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              <SummaryMetric
                label="Total SKUs:"
                value={reportSummary.total_skus.toLocaleString('en-US')}
              />
              <SummaryMetric
                label="Gross before Jul 1 2025:"
                value={fmtMoneySummary(reportSummary.gross_before_july)}
                tooltip={TOOLTIP_GROSS}
              />
              <SummaryMetric
                label="Gross after Jul 1 2025:"
                value={fmtMoneySummary(reportSummary.gross_after_july)}
                tooltip={TOOLTIP_GROSS}
              />
              <SummaryMetric
                label="Total discount:"
                value={fmtMoneySummary(reportSummary.total_discount)}
                tooltip={TOOLTIP_DISCOUNT}
              />
              <SummaryMetric
                label="Net before:"
                value={fmtMoneySummary(reportSummary.net_before_july)}
                tooltip={TOOLTIP_NET}
              />
              <SummaryMetric
                label="Net after:"
                value={fmtMoneySummary(reportSummary.net_after_july)}
                tooltip={TOOLTIP_NET}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No summary data.</p>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="flex min-w-[200px] flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Search (this page)</Label>
            <Input
              placeholder="Title or SKU…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full min-w-[200px] sm:w-64"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.open('/api/erp/inventory-report/export', '_blank')}
          >
            Export CSV
          </Button>
        </div>

        {pageError ? (
          <p className="text-sm text-destructive">{pageError}</p>
        ) : null}

        <div
          className={`overflow-x-auto rounded-md border ${loading ? 'pointer-events-none opacity-60' : ''}`}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer whitespace-nowrap text-xs select-none"
                  onClick={() => toggleSort('sku')}
                >
                  SKU{sortIndicator('sku')}
                </TableHead>
                <TableHead
                  className="cursor-pointer min-w-[140px] text-xs select-none"
                  onClick={() => toggleSort('title')}
                >
                  Product{sortIndicator('title')}
                </TableHead>
                <TableHead
                  className="cursor-pointer whitespace-nowrap text-right text-xs select-none"
                  onClick={() => toggleSort('current_stock')}
                >
                  Current stock{sortIndicator('current_stock')}
                </TableHead>
                <TableHead
                  className="cursor-pointer whitespace-nowrap text-right text-xs select-none"
                  onClick={() => toggleSort('qty_before_july')}
                >
                  Qty before Jul 1{sortIndicator('qty_before_july')}
                </TableHead>
                <TableHead
                  className="cursor-pointer whitespace-nowrap text-right text-xs select-none"
                  onClick={() => toggleSort('gross_before_july')}
                >
                  Gross before{sortIndicator('gross_before_july')}
                </TableHead>
                <TableHead
                  className="cursor-pointer whitespace-nowrap text-right text-xs select-none"
                  onClick={() => toggleSort('net_before_july')}
                >
                  Net before{sortIndicator('net_before_july')}
                </TableHead>
                <TableHead
                  className="cursor-pointer whitespace-nowrap text-right text-xs select-none"
                  onClick={() => toggleSort('discount_before_july')}
                >
                  Discount before{sortIndicator('discount_before_july')}
                </TableHead>
                <TableHead
                  className="cursor-pointer whitespace-nowrap text-right text-xs select-none"
                  onClick={() => toggleSort('qty_after_july')}
                >
                  Qty after Jul 1{sortIndicator('qty_after_july')}
                </TableHead>
                <TableHead
                  className="cursor-pointer whitespace-nowrap text-right text-xs select-none"
                  onClick={() => toggleSort('gross_after_july')}
                >
                  Gross after{sortIndicator('gross_after_july')}
                </TableHead>
                <TableHead
                  className="cursor-pointer whitespace-nowrap text-right text-xs select-none"
                  onClick={() => toggleSort('net_after_july')}
                >
                  Net after{sortIndicator('net_after_july')}
                </TableHead>
                <TableHead
                  className="cursor-pointer whitespace-nowrap text-right text-xs select-none"
                  onClick={() => toggleSort('discount_after_july')}
                >
                  Discount after{sortIndicator('discount_after_july')}
                </TableHead>
                <TableHead
                  className="cursor-pointer whitespace-nowrap text-right text-xs select-none"
                  onClick={() => toggleSort('total_qty')}
                >
                  Total qty{sortIndicator('total_qty')}
                </TableHead>
                <TableHead
                  className="cursor-pointer whitespace-nowrap text-right text-xs select-none"
                  onClick={() => toggleSort('total_gross')}
                >
                  Total gross{sortIndicator('total_gross')}
                </TableHead>
                <TableHead
                  className="cursor-pointer whitespace-nowrap text-right text-xs select-none"
                  onClick={() => toggleSort('total_net')}
                >
                  Total net{sortIndicator('total_net')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLS} className="text-center text-muted-foreground">
                    {totalProductCount === 0
                      ? 'No products match this report (inventory created before Jul 1, 2025 with a known product date).'
                      : 'No rows match your search on this page.'}
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((row, idx) => {
                  const tone = rowTone(row);
                  return (
                    <TableRow
                      key={`${currentPage}-${idx}-${row.sku ?? ''}-${row.title}`}
                      className={ROW_CLASS[tone]}
                    >
                      <TableCell className="whitespace-nowrap font-mono text-xs">
                        {row.sku ?? '—'}
                      </TableCell>
                      <TableCell className="max-w-[200px] font-medium">{row.title}</TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        {fmtNum(row.current_stock)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        {fmtNum(row.qty_before_july)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        {fmtMoney(row.gross_before_july)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        {fmtMoney(row.net_before_july)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        {fmtMoney(row.discount_before_july)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        {fmtNum(row.qty_after_july)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        {fmtMoney(row.gross_after_july)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        {fmtMoney(row.net_after_july)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        {fmtMoney(row.discount_after_july)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        {fmtNum(row.total_qty)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        {fmtMoney(row.total_gross)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        {fmtMoney(row.total_net)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {totalProductCount > 0 ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {rangeStart.toLocaleString('en-US')}–{rangeEnd.toLocaleString('en-US')} · Page{' '}
              {currentPage} of {totalPages} ·{' '}
              {totalProductCount.toLocaleString('en-US')} total products
              {loading ? ' — loading…' : ''}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage <= 1 || loading}
                onClick={() => void loadPage(currentPage - 1)}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages || loading}
                onClick={() => void loadPage(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}

        <p className="text-xs text-muted-foreground">
          Row colors: green = sales after Jul 1 · amber = sold before Jul 1 only · gray = no sales in
          either period.
        </p>
      </div>
    </TooltipProvider>
  );
}
