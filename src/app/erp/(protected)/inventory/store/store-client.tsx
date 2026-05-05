'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { StoreLocationMetrics } from '../components/store-location-metrics';

const PAGE_SIZE = 50;
const CHUNK = 1000;

const LOCATION_FILTERS = ['National Harbor', 'Pembroke Gardens', 'Santa Monica Place'] as const;

export type StoreRow = {
  sku: string;
  national_harbor: number;
  pembroke_gardens: number;
  santa_monica_place: number;
};

type RawRow = {
  sku: string | null;
  location_name: string | null;
  quantity: number | null;
};

function asNum(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function pivotRows(raw: RawRow[]): StoreRow[] {
  const acc = new Map<string, { nh: number; pg: number; smp: number }>();
  for (const r of raw) {
    const sku = String(r.sku ?? '').trim();
    if (!sku) continue;
    const loc = String(r.location_name ?? '');
    const q = asNum(r.quantity);
    const prev = acc.get(sku) ?? { nh: 0, pg: 0, smp: 0 };
    let nh = prev.nh;
    let pg = prev.pg;
    let smp = prev.smp;
    if (loc === 'National Harbor') nh += q;
    else if (loc === 'Pembroke Gardens') pg += q;
    else if (loc === 'Santa Monica Place') smp += q;
    acc.set(sku, { nh, pg, smp });
  }
  return Array.from(acc.entries())
    .map(([sku, v]) => ({
      sku,
      national_harbor: v.nh,
      pembroke_gardens: v.pg,
      santa_monica_place: v.smp,
    }))
    .sort((a, b) => {
      const totalA = a.national_harbor + a.pembroke_gardens + a.santa_monica_place;
      const totalB = b.national_harbor + b.pembroke_gardens + b.santa_monica_place;
      return totalB - totalA;
    });
}

export function StoreInventoryClient() {
  const [rows, setRows] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const allRaw: RawRow[] = [];
      let from = 0;
      for (;;) {
        const { data, error: qErr } = await supabase
          .from('inventory_levels' as never)
          .select('sku, location_name, quantity')
          .in('location_name', [...LOCATION_FILTERS])
          .range(from, from + CHUNK - 1);
        if (qErr) throw new Error(qErr.message);
        const batch = (data ?? []) as RawRow[];
        allRaw.push(...batch);
        if (batch.length < CHUNK) break;
        from += CHUNK;
      }
      setRows(pivotRows(allRaw));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load store inventory');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.sku.toLowerCase().includes(q));
  }, [rows, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const currentPage = Math.min(Math.max(1, page), totalPages);

  const pageSlice = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const exportXlsx = () => {
    const sheetData: (string | number)[][] = [
      ['SKU', 'National Harbor', 'Pembroke Gardens', 'Santa Monica Place'],
      ...filtered.map((r) => [
        r.sku,
        r.national_harbor,
        r.pembroke_gardens,
        r.santa_monica_place,
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Store');
    XLSX.writeFile(wb, 'store-inventory.xlsx');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Skeleton className="h-10 w-full max-w-sm" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div
          className="rounded-lg border border-border"
          style={{ overflowX: 'auto', overflowY: 'auto', height: '600px' }}
        >
          <table style={{ minWidth: '700px', borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                {Array.from({ length: 4 }).map((_, i) => (
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
                  {Array.from({ length: 4 }).map((__, cellIdx) => (
                    <td key={cellIdx} className="border-b border-border px-3 py-2">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-center gap-3">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-24" />
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

      <StoreLocationMetrics
        locations={['National Harbor', 'Pembroke Gardens', 'Santa Monica Place']}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Input
          className="max-w-sm border-border bg-background"
          placeholder="Search by SKU"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search by SKU"
        />
        <Button type="button" variant="outline" className="border-border" onClick={exportXlsx}>
          Export to Excel
        </Button>
      </div>

      <div
        className="rounded-lg border border-border"
        style={{ overflowX: 'auto', overflowY: 'auto', height: '600px' }}
      >
        <table style={{ minWidth: '700px', borderCollapse: 'collapse', width: '100%' }}>
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
                National Harbor
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
                Pembroke Gardens
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
                Santa Monica Place
              </th>
            </tr>
          </thead>
          <tbody>
            {pageSlice.map((r) => (
              <tr key={r.sku} className="hover:bg-muted/30">
                <td className="border-b border-border px-3 py-2 text-sm tabular-nums">{r.sku}</td>
                <td className="border-b border-border px-3 py-2 text-right text-sm tabular-nums">
                  {r.national_harbor}
                </td>
                <td className="border-b border-border px-3 py-2 text-right text-sm tabular-nums">
                  {r.pembroke_gardens}
                </td>
                <td className="border-b border-border px-3 py-2 text-right text-sm tabular-nums">
                  {r.santa_monica_place}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-border"
          disabled={currentPage <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Previous
        </Button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-border"
          disabled={currentPage >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
