'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

const CHUNK = 1000;
const PRICE_CHUNK = 200;

type DonationRow = Record<string, unknown>;

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function orderedQuantity(row: DonationRow): number {
  const n = Number(row.ordered_quantity);
  return Number.isFinite(n) ? n : 0;
}

function destinationKey(row: DonationRow): string {
  return asString(row.inventory_destination_name) ?? '—';
}

function MetricsBoxesSkeleton() {
  const boxStyle = { flex: '1 1 calc(33% - 16px)', minWidth: '280px' } as const;
  return (
    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
      {[1, 2, 3].map((k) => (
        <div
          key={k}
          className="rounded-lg border border-border p-4"
          style={boxStyle}
        >
          <Skeleton className="mb-3 h-5 w-40" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between border-b border-border py-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-14" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function asString(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

function formatCreatedDate(v: unknown): string {
  const s = asString(v);
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s.length >= 10 ? s.slice(0, 10) : s;
  return d.toISOString().slice(0, 10);
}

function statusBadgeClass(status: string | null): string {
  if (!status) return 'border-border bg-muted text-muted-foreground';
  const s = status.toLowerCase().replace(/\s+/g, '_');
  if (s === 'ready_to_ship') return 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400';
  if (s === 'pending') return 'border-amber-500/50 bg-amber-500/15 text-amber-300';
  if (s === 'cancelled') return 'border-red-500/50 bg-red-500/15 text-red-400';
  if (s === 'completed') return 'border-sky-500/50 bg-sky-500/15 text-sky-400';
  return 'border-border bg-muted text-muted-foreground';
}

export function DonationClient() {
  const [rows, setRows] = useState<DonationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [skuPriceMap, setSkuPriceMap] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    let donationRows: DonationRow[] | null = null;
    try {
      const supabase = createClient();
      const all: DonationRow[] = [];
      let from = 0;
      for (;;) {
        const { data, error: qErr } = await supabase
          .from('inventory_donation' as never)
          .select(
            'transfer_name, inventory_origin_name, inventory_destination_name, transfer_status, transfer_note, transfer_tags, transfer_created_date, transfer_line_item_id, product_variant_sku, ordered_quantity'
          )
          .order('transfer_created_date', { ascending: false })
          .range(from, from + CHUNK - 1);
        if (qErr) throw new Error(qErr.message);
        const batch = (data ?? []) as DonationRow[];
        all.push(...batch);
        if (batch.length < CHUNK) break;
        from += CHUNK;
      }
      donationRows = all;
      setRows(all);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load donation inventory');
      setRows([]);
      setSkuPriceMap({});
    } finally {
      setLoading(false);
    }

    if (!donationRows?.length) {
      setSkuPriceMap({});
      return;
    }

    const donationSkus = [
      ...new Set(
        donationRows
          .map((r) => asString(r.product_variant_sku))
          .filter((s): s is string => Boolean(s))
      ),
    ];

    if (donationSkus.length === 0) {
      setSkuPriceMap({});
      return;
    }

    setPricesLoading(true);
    try {
      const supabase = createClient();
      const priceMap: Record<string, number> = {};
      for (let i = 0; i < donationSkus.length; i += PRICE_CHUNK) {
        const chunk = donationSkus.slice(i, i + PRICE_CHUNK);
        const { data: pvRows, error: pvErr } = await supabase
          .from('product_variants' as never)
          .select('sku, price')
          .in('sku', chunk);
        if (pvErr) {
          setSkuPriceMap({});
          return;
        }
        for (const raw of (pvRows ?? []) as { sku?: unknown; price?: unknown }[]) {
          const sku = asString(raw.sku);
          if (!sku) continue;
          const p = Number(raw.price);
          if (Number.isFinite(p)) priceMap[sku] = p;
        }
      }
      setSkuPriceMap(priceMap);
    } finally {
      setPricesLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const sku = (asString(row.product_variant_sku) ?? '').toLowerCase();
      const name = (asString(row.transfer_name) ?? '').toLowerCase();
      return sku.includes(q) || name.includes(q);
    });
  }, [rows, search]);

  const unitsByDestination = useMemo(() => {
    const sums = new Map<string, number>();
    for (const row of rows) {
      const dest = destinationKey(row);
      sums.set(dest, (sums.get(dest) ?? 0) + orderedQuantity(row));
    }
    return [...sums.entries()]
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [rows]);

  const skuCountByDestination = useMemo(() => {
    const sets = new Map<string, Set<string>>();
    for (const row of rows) {
      const dest = destinationKey(row);
      const sku = asString(row.product_variant_sku);
      if (!sku) continue;
      if (!sets.has(dest)) sets.set(dest, new Set());
      sets.get(dest)!.add(sku);
    }
    return [...sets.entries()]
      .map(([name, set]) => ({ name, count: set.size }))
      .sort((a, b) => b.count - a.count);
  }, [rows]);

  const valueByDestination = useMemo(() => {
    const sums = new Map<string, number>();
    for (const row of rows) {
      const dest = destinationKey(row);
      const sku = asString(row.product_variant_sku);
      const qty = orderedQuantity(row);
      const price = sku ? skuPriceMap[sku] : undefined;
      const line = qty * (price ?? 0);
      sums.set(dest, (sums.get(dest) ?? 0) + line);
    }
    return [...sums.entries()]
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [rows, skuPriceMap]);

  const exportXlsx = () => {
    const sheetData: (string | number | null)[][] = [
      [
        'Transfer Name',
        'Origin',
        'Destination',
        'Status',
        'SKU',
        'Ordered Qty',
        'Created Date',
        'Note',
        'Tags',
        'Line Item ID',
      ],
      ...rows.map((row) => [
        asString(row.transfer_name) ?? '',
        asString(row.inventory_origin_name) ?? '',
        asString(row.inventory_destination_name) ?? '',
        asString(row.transfer_status) ?? '',
        asString(row.product_variant_sku) ?? '',
        row.ordered_quantity != null ? Number(row.ordered_quantity) : '',
        formatCreatedDate(row.transfer_created_date),
        asString(row.transfer_note) ?? '',
        asString(row.transfer_tags) ?? '',
        asString(row.transfer_line_item_id) ?? '',
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Donation');
    XLSX.writeFile(wb, 'donation-inventory.xlsx');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <MetricsBoxesSkeleton />
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Skeleton className="h-10 w-full max-w-sm" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div
          className="rounded-lg border border-border"
          style={{ overflowX: 'auto', overflowY: 'auto', height: '600px' }}
        >
          <table style={{ minWidth: '1200px', borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                {Array.from({ length: 10 }).map((_, i) => (
                  <th
                    key={i}
                    className="border-b border-border px-3 py-2 text-left text-xs font-medium"
                    style={{
                      position: 'sticky',
                      top: 0,
                      zIndex: 30,
                      backgroundColor: '#111111',
                    }}
                  >
                    <Skeleton className="h-4 w-20 bg-muted" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }).map((_, rowIdx) => (
                <tr key={rowIdx}>
                  {Array.from({ length: 10 }).map((__, cellIdx) => (
                    <td key={cellIdx} className="border-b border-border px-3 py-2">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {pricesLoading ? (
        <MetricsBoxesSkeleton />
      ) : (
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div
            className="rounded-lg border border-border p-4"
            style={{ flex: '1 1 calc(33% - 16px)', minWidth: '280px' }}
          >
            <div className="mb-3 font-semibold">Units by Destination</div>
            <div>
              {unitsByDestination.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data</p>
              ) : (
                unitsByDestination.map(({ name, total }) => (
                  <div
                    key={name}
                    className="flex justify-between gap-2 border-b border-border py-1"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
                    <span className="shrink-0 text-sm font-medium tabular-nums">{total}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div
            className="rounded-lg border border-border p-4"
            style={{ flex: '1 1 calc(33% - 16px)', minWidth: '280px' }}
          >
            <div className="mb-3 font-semibold">SKUs by Destination</div>
            <div>
              {skuCountByDestination.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data</p>
              ) : (
                skuCountByDestination.map(({ name, count }) => (
                  <div
                    key={name}
                    className="flex justify-between gap-2 border-b border-border py-1"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
                    <span className="shrink-0 text-sm font-medium tabular-nums">{count}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div
            className="rounded-lg border border-border p-4"
            style={{ flex: '1 1 calc(33% - 16px)', minWidth: '280px' }}
          >
            <div className="mb-3 font-semibold">Value by Destination</div>
            <div>
              {valueByDestination.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data</p>
              ) : (
                valueByDestination.map(({ name, total }) => (
                  <div
                    key={name}
                    className="flex justify-between gap-2 border-b border-border py-1"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
                    <span className="shrink-0 text-sm font-medium tabular-nums">
                      {formatUsd(total)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Input
          className="max-w-sm border-border bg-background"
          placeholder="Search by SKU or Transfer Name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search by SKU or Transfer Name"
        />
        <Button type="button" variant="outline" className="border-border" onClick={exportXlsx}>
          Export to Excel
        </Button>
      </div>

      <div
        className="rounded-lg border border-border"
        style={{ overflowX: 'auto', overflowY: 'auto', height: '600px' }}
      >
        <table style={{ minWidth: '1200px', borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th
                className="border-b border-border px-3 py-2 text-left text-xs font-medium text-foreground"
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 30,
                  backgroundColor: '#111111',
                }}
              >
                Transfer Name
              </th>
              <th
                className="border-b border-border px-3 py-2 text-left text-xs font-medium text-foreground"
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 30,
                  backgroundColor: '#111111',
                }}
              >
                Origin
              </th>
              <th
                className="border-b border-border px-3 py-2 text-left text-xs font-medium text-foreground"
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 30,
                  backgroundColor: '#111111',
                }}
              >
                Destination
              </th>
              <th
                className="border-b border-border px-3 py-2 text-left text-xs font-medium text-foreground"
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 30,
                  backgroundColor: '#111111',
                }}
              >
                Status
              </th>
              <th
                className="border-b border-border px-3 py-2 text-left text-xs font-medium text-foreground"
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 30,
                  backgroundColor: '#111111',
                }}
              >
                SKU
              </th>
              <th
                className="border-b border-border px-3 py-2 text-right text-xs font-medium text-foreground"
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 30,
                  backgroundColor: '#111111',
                }}
              >
                Ordered Qty
              </th>
              <th
                className="border-b border-border px-3 py-2 text-left text-xs font-medium text-foreground"
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 30,
                  backgroundColor: '#111111',
                }}
              >
                Created Date
              </th>
              <th
                className="border-b border-border px-3 py-2 text-left text-xs font-medium text-foreground"
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 30,
                  backgroundColor: '#111111',
                }}
              >
                Note
              </th>
              <th
                className="border-b border-border px-3 py-2 text-left text-xs font-medium text-foreground"
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 30,
                  backgroundColor: '#111111',
                }}
              >
                Tags
              </th>
              <th
                className="border-b border-border px-3 py-2 text-left text-xs font-medium text-foreground"
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 30,
                  backgroundColor: '#111111',
                }}
              >
                Line Item ID
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="h-24 text-center text-sm text-muted-foreground">
                  No rows found.
                </td>
              </tr>
            ) : (
              filtered.map((row, idx) => {
                const status = asString(row.transfer_status);
                return (
                  <tr key={`${asString(row.transfer_line_item_id) ?? idx}-${idx}`} className="hover:bg-muted/30">
                    <td className="border-b border-border px-3 py-2 text-xs text-foreground">
                      {asString(row.transfer_name) ?? '—'}
                    </td>
                    <td className="border-b border-border px-3 py-2 text-xs text-foreground">
                      {asString(row.inventory_origin_name) ?? '—'}
                    </td>
                    <td className="border-b border-border px-3 py-2 text-xs text-foreground">
                      {asString(row.inventory_destination_name) ?? '—'}
                    </td>
                    <td className="border-b border-border px-3 py-2 text-xs">
                      <Badge className={statusBadgeClass(status)} variant="outline">
                        {status ?? '—'}
                      </Badge>
                    </td>
                    <td className="border-b border-border px-3 py-2 font-mono text-xs text-foreground">
                      {asString(row.product_variant_sku) ?? '—'}
                    </td>
                    <td className="border-b border-border px-3 py-2 text-right text-xs tabular-nums text-foreground">
                      {row.ordered_quantity != null && row.ordered_quantity !== ''
                        ? String(row.ordered_quantity)
                        : '—'}
                    </td>
                    <td className="border-b border-border px-3 py-2 text-xs tabular-nums text-foreground">
                      {formatCreatedDate(row.transfer_created_date)}
                    </td>
                    <td className="max-w-[200px] truncate border-b border-border px-3 py-2 text-xs text-foreground">
                      {asString(row.transfer_note) ?? '—'}
                    </td>
                    <td className="max-w-[160px] truncate border-b border-border px-3 py-2 text-xs text-foreground">
                      {asString(row.transfer_tags) ?? '—'}
                    </td>
                    <td className="border-b border-border px-3 py-2 font-mono text-xs text-foreground">
                      {asString(row.transfer_line_item_id) ?? '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
