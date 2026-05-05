'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createClient } from '@/lib/supabase/client';

type GarmentDeliveryRow = {
  estimate_x_garment_delivery_date: string | null;
  factory: string | null;
  style_number: string | null;
  body: string | null;
  description: string | null;
  fabric_contents: string | null;
  hts_codes: string | null;
  goh_flat_pack: string | null;
  country_of_origin: string | null;
  projected_units: number | null;
  actual_shipped_units: number | null;
  air_boat: string | null;
  etd_date: string | null;
  eta_date: string | null;
  in_nj_whse_date: string | null;
  comments: string | null;
};

const MONTH_NAMES = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

function asString(v: unknown) {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

function asNumber(v: unknown) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function formatNumber(v: number | null) {
  if (v == null) return '—';
  return v.toLocaleString('en-US');
}

function extractMonthFromStyle(styleNumber: string | null): number | null {
  if (!styleNumber) return null;
  const match = styleNumber.toUpperCase().match(/^E(\d)/);
  if (!match) return null;
  const month = Number(match[1]);
  return month >= 1 && month <= 12 ? month : null;
}

function mapRow(raw: unknown): GarmentDeliveryRow {
  const row = (raw ?? {}) as Record<string, unknown>;
  return {
    estimate_x_garment_delivery_date: asString(row.estimate_x_garment_delivery_date),
    factory: asString(row.factory),
    style_number: asString(row.style_number),
    body: asString(row.body),
    description: asString(row.description),
    fabric_contents: asString(row.fabric_contents),
    hts_codes: asString(row.hts_codes),
    goh_flat_pack: asString(row.goh_flat_pack),
    country_of_origin: asString(row.country_of_origin),
    projected_units: asNumber(row.projected_units),
    actual_shipped_units: asNumber(row.actual_shipped_units),
    air_boat: asString(row.air_boat),
    etd_date: asString(row.etd_date),
    eta_date: asString(row.eta_date),
    in_nj_whse_date: asString(row.in_nj_whse_date),
    comments: asString(row.comments),
  };
}

export function NextMonthDeliveriesSection() {
  const [rows, setRows] = useState<GarmentDeliveryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentMonth = new Date().getMonth() + 1;

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    (async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('garment_delivery' as never)
          .select(
            'estimate_x_garment_delivery_date,factory,style_number,body,description,fabric_contents,hts_codes,goh_flat_pack,country_of_origin,projected_units,actual_shipped_units,air_boat,etd_date,eta_date,in_nj_whse_date,comments'
          );

        if (fetchError) throw new Error(fetchError.message ?? 'Failed to load garment delivery');
        if (cancelled) return;
        setRows((Array.isArray(data) ? data : []).map(mapRow));
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

  const monthSections = useMemo(() => {
    const filtered = rows.filter((row) => {
      const m = extractMonthFromStyle(row.style_number);
      return m != null && m >= currentMonth;
    });
    const byMonth = new Map<number, GarmentDeliveryRow[]>();
    for (const row of filtered) {
      const m = extractMonthFromStyle(row.style_number);
      if (m == null) continue;
      const list = byMonth.get(m) ?? [];
      list.push(row);
      byMonth.set(m, list);
    }
    for (const list of byMonth.values()) {
      list.sort((a, b) => (a.style_number ?? '').localeCompare(b.style_number ?? ''));
    }
    const months = Array.from(byMonth.keys()).sort((a, b) => a - b);
    return months.map((month) => ({ month, rows: byMonth.get(month) ?? [] }));
  }, [rows, currentMonth]);

  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-headline text-xl font-semibold tracking-tight">Current & Upcoming Factory Deliveries</h2>
          <p className="text-sm text-muted-foreground">Current and upcoming factory deliveries</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/erp/inventory/factory-po">View All</Link>
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      ) : null}

      <div
        className="relative rounded-lg border border-border"
        style={{
          overflowY: 'auto',
          overflowX: 'auto',
          height: '500px',
          width: '100%',
        }}
      >
        <Table style={{ minWidth: '1400px', borderCollapse: 'collapse', width: '100%' }}>
          <TableHeader>
            {loading ? (
              <TableRow>
                {Array.from({ length: 8 }).map((_, idx) => (
                  <TableHead key={`next-month-head-skel-${idx}`} style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: '#111111' }}>
                    <Skeleton className="h-4 w-full" />
                  </TableHead>
                ))}
              </TableRow>
            ) : (
              <TableRow>
                <TableHead style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: '#111111' }}>Delivery Date</TableHead>
                <TableHead style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: '#111111' }}>Factory</TableHead>
                <TableHead style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: '#111111' }}>Style Number</TableHead>
                <TableHead style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: '#111111' }}>Body</TableHead>
                <TableHead style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: '#111111' }}>Country of Origin</TableHead>
                <TableHead className="text-right" style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: '#111111' }}>
                  Projected Units
                </TableHead>
                <TableHead className="text-right" style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: '#111111' }}>
                  Actual Shipped
                </TableHead>
                <TableHead style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: '#111111' }}>Air/Boat</TableHead>
                <TableHead style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: '#111111' }}>ETD Date</TableHead>
                <TableHead style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: '#111111' }}>ETA Date</TableHead>
                <TableHead style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: '#111111' }}>NJ Whse Date</TableHead>
                <TableHead style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: '#111111' }}>Comments</TableHead>
              </TableRow>
            )}
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, rowIdx) => (
                <TableRow key={`next-month-row-skel-${rowIdx}`}>
                  {Array.from({ length: 8 }).map((__, cellIdx) => (
                    <TableCell key={`next-month-cell-skel-${rowIdx}-${cellIdx}`}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : monthSections.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="h-24 text-center text-muted-foreground">
                  No rows found.
                </TableCell>
              </TableRow>
            ) : (
              monthSections.flatMap((section) => [
                <TableRow key={`group-${section.month}`}>
                  <TableCell colSpan={12} className="font-semibold">
                    {MONTH_NAMES[section.month - 1]} DELIVERIES
                  </TableCell>
                </TableRow>,
                ...section.rows.map((row, idx) => (
                  <TableRow key={`${row.style_number ?? 'style'}-${section.month}-${idx}`}>
                    <TableCell>{row.estimate_x_garment_delivery_date ?? '—'}</TableCell>
                    <TableCell>{row.factory ?? '—'}</TableCell>
                    <TableCell>{row.style_number ?? '—'}</TableCell>
                    <TableCell>{row.body ?? '—'}</TableCell>
                    <TableCell>{row.country_of_origin ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(row.projected_units)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(row.actual_shipped_units)}</TableCell>
                    <TableCell>{row.air_boat ?? '—'}</TableCell>
                    <TableCell>{row.etd_date ?? '—'}</TableCell>
                    <TableCell>{row.eta_date ?? '—'}</TableCell>
                    <TableCell>{row.in_nj_whse_date ?? '—'}</TableCell>
                    <TableCell>{row.comments ?? '—'}</TableCell>
                  </TableRow>
                )),
              ])
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

