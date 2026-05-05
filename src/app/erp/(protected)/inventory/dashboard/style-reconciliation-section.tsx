'use client';

import { useEffect, useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createClient } from '@/lib/supabase/client';

type ReconciliationRow = {
  style_number: string;
  fo_qty: number;
  wms_qty: number;
  difference: number;
};

function parseFoQty(value: unknown): number {
  if (value == null) return 0;
  const text = String(value).trim();
  if (!text) return 0;
  const first = text.split(/\s\/\s/)[0] ?? '';
  const n = parseInt(first.replace(/[^0-9-]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

function parseNum(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function StyleReconciliationSection() {
  const [rows, setRows] = useState<ReconciliationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    (async () => {
      try {
        const [foRes, wmsRes] = await Promise.all([
          supabase.from('garment_delivery' as never).select('style_number,actual_shipped_units'),
          supabase.from('wms_receiving_report' as never).select('"Style","Received Qty"'),
        ]);

        if (foRes.error) throw new Error(foRes.error.message ?? 'Failed to load garment delivery');
        if (wmsRes.error) throw new Error(wmsRes.error.message ?? 'Failed to load wms receiving report');
        if (cancelled) return;

        const foMap = new Map<string, number>();
        const foRows = Array.isArray(foRes.data) ? foRes.data : [];
        for (const item of foRows) {
          const row = (item ?? {}) as Record<string, unknown>;
          const style = String(row.style_number ?? '').trim();
          if (!style) continue;
          const qty = parseFoQty(row.actual_shipped_units);
          foMap.set(style, (foMap.get(style) ?? 0) + qty);
        }

        const wmsMap = new Map<string, number>();
        const wmsRows = Array.isArray(wmsRes.data) ? wmsRes.data : [];
        for (const item of wmsRows) {
          const row = (item ?? {}) as Record<string, unknown>;
          const style = String(row['Style'] ?? '').trim();
          if (!style) continue;
          const qty = parseNum(row['Received Qty']);
          wmsMap.set(style, (wmsMap.get(style) ?? 0) + qty);
        }

        const styles = Array.from(foMap.keys()).filter((style) => wmsMap.has(style));
        const merged: ReconciliationRow[] = styles.map((style_number) => {
          const fo_qty = foMap.get(style_number) ?? 0;
          const wms_qty = wmsMap.get(style_number) ?? 0;
          return {
            style_number,
            fo_qty,
            wms_qty,
            difference: fo_qty - wms_qty,
          };
        });

        merged.sort((a, b) => {
          const absDiffA = Math.abs(a.difference);
          const absDiffB = Math.abs(b.difference);
          if (absDiffA === 0 && absDiffB === 0) return 0;
          if (absDiffA === 0) return 1;
          if (absDiffB === 0) return -1;
          return absDiffB - absDiffA;
        });
        setRows(merged);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const renderedRows = useMemo(() => rows, [rows]);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-headline text-xl font-semibold tracking-tight">Style Reconciliation</h2>
        <p className="text-sm text-muted-foreground">Factory shipped vs warehouse received</p>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      ) : null}

      <div className="relative rounded-lg border border-border" style={{ overflowY: 'auto', overflowX: 'auto', height: '400px', width: '100%' }}>
        <Table style={{ minWidth: '600px', borderCollapse: 'collapse', width: '100%' }}>
          <TableHeader>
            <TableRow>
              <TableHead style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: '#111111' }}>Style Number</TableHead>
              <TableHead className="text-right" style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: '#111111' }}>
                FO Qty
              </TableHead>
              <TableHead className="text-right" style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: '#111111' }}>
                WMS Qty
              </TableHead>
              <TableHead className="text-right" style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: '#111111' }}>
                Difference
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, rowIdx) => (
                <TableRow key={`style-recon-row-skel-${rowIdx}`}>
                  {Array.from({ length: 4 }).map((__, cellIdx) => (
                    <TableCell key={`style-recon-cell-skel-${rowIdx}-${cellIdx}`}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : renderedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No rows found.
                </TableCell>
              </TableRow>
            ) : (
              renderedRows.map((row) => (
                <TableRow key={row.style_number}>
                  <TableCell>{row.style_number}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.fo_qty.toLocaleString('en-US')}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.wms_qty.toLocaleString('en-US')}</TableCell>
                  <TableCell
                    className={
                      row.difference === 0
                        ? 'text-right tabular-nums text-emerald-400'
                        : row.difference > 0
                          ? 'text-right tabular-nums text-amber-400'
                          : 'text-right tabular-nums text-red-400'
                    }
                  >
                    {row.difference > 0 ? `+${row.difference.toLocaleString('en-US')}` : row.difference.toLocaleString('en-US')}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

