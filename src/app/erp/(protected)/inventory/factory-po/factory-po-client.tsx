'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
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

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

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

function extractMonthFromStyle(styleNumber: string | null): number | null {
  if (!styleNumber) return null;
  const match = styleNumber.toUpperCase().match(/^E(\d)/);
  if (!match) return null;
  const month = Number(match[1]);
  return month >= 1 && month <= 12 ? month : null;
}

function monthSortKey(month: number | null, currentMonth: number): number {
  if (month == null) return Number.MAX_SAFE_INTEGER;
  return month > currentMonth ? month : month + 12;
}

function monthHeader(month: number | null): string {
  if (month == null) return 'UNKNOWN DELIVERIES';
  return `${MONTH_NAMES[month - 1].toUpperCase()} DELIVERIES`;
}

export function FactoryPoClient() {
  const [rows, setRows] = useState<GarmentDeliveryRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    (async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('garment_delivery' as never)
          .select(
            'delivery_group,estimate_x_garment_delivery_date,factory,style_number,body,description,fabric_contents,hts_codes,goh_flat_pack,country_of_origin,projected_units,actual_shipped_units,air_boat,etd_date,eta_date,in_nj_whse_date,comments'
          )
          .order('estimate_x_garment_delivery_date', { ascending: true });

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

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => (row.style_number ?? '').toLowerCase().includes(term));
  }, [rows, search]);

  const groupedRows = useMemo(() => {
    const currentMonth = new Date().getMonth() + 1;
    return [...filteredRows].sort((a, b) => {
      const monthA = extractMonthFromStyle(a.style_number);
      const monthB = extractMonthFromStyle(b.style_number);
      const groupDelta = monthSortKey(monthA, currentMonth) - monthSortKey(monthB, currentMonth);
      if (groupDelta !== 0) return groupDelta;
      return (a.style_number ?? '').localeCompare(b.style_number ?? '');
    });
  }, [filteredRows]);

  return (
    <div className="space-y-4">
      <div className="max-w-sm space-y-2">
        <label htmlFor="style-search" className="text-sm font-medium">
          Search by Style Number
        </label>
        <Input
          id="style-search"
          placeholder="Type style number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      ) : null}

      <div
        className="relative rounded-lg border border-border"
        style={{ overflowX: 'auto', width: '100%' }}
      >
        {loading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/30">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : null}
        <Table style={{ minWidth: '1400px', borderCollapse: 'collapse', width: '100%' }}>
          <TableHeader>
            <TableRow>
              <TableHead style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: '#111111' }}>Delivery Date</TableHead>
              <TableHead style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: '#111111' }}>Factory</TableHead>
              <TableHead style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: '#111111' }}>Style Number</TableHead>
              <TableHead style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: '#111111' }}>Body</TableHead>
              <TableHead style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: '#111111' }}>Description</TableHead>
              <TableHead style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: '#111111' }}>Fabric Contents</TableHead>
              <TableHead style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: '#111111' }}>HTS Codes</TableHead>
              <TableHead style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: '#111111' }}>GOH/Flat Pack</TableHead>
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
          </TableHeader>
          <TableBody>
            {groupedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={16} className="h-24 text-center text-muted-foreground">
                  No rows found.
                </TableCell>
              </TableRow>
            ) : (
              groupedRows.map((row, idx) => {
                const currentMonth = extractMonthFromStyle(row.style_number);
                const prevMonth = idx > 0 ? extractMonthFromStyle(groupedRows[idx - 1]?.style_number ?? null) : null;
                const showGroup = idx === 0 || prevMonth !== currentMonth;
                return (
                  <Fragment key={`frag-${row.style_number ?? 'style'}-${idx}`}>
                    {showGroup ? (
                      <TableRow>
                        <TableCell
                          colSpan={16}
                          className="py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"
                          style={{ position: 'sticky', top: '45px', zIndex: 20, backgroundColor: '#1a1a1a' }}
                        >
                          {monthHeader(currentMonth)}
                        </TableCell>
                      </TableRow>
                    ) : null}
                    <TableRow>
                      <TableCell>{row.estimate_x_garment_delivery_date ?? '—'}</TableCell>
                      <TableCell>{row.factory ?? '—'}</TableCell>
                      <TableCell>{row.style_number ?? '—'}</TableCell>
                      <TableCell>{row.body ?? '—'}</TableCell>
                      <TableCell>{row.description ?? '—'}</TableCell>
                      <TableCell>{row.fabric_contents ?? '—'}</TableCell>
                      <TableCell>{row.hts_codes ?? '—'}</TableCell>
                      <TableCell>{row.goh_flat_pack ?? '—'}</TableCell>
                      <TableCell>{row.country_of_origin ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(row.projected_units)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(row.actual_shipped_units)}</TableCell>
                      <TableCell>{row.air_boat ?? '—'}</TableCell>
                      <TableCell>{row.etd_date ?? '—'}</TableCell>
                      <TableCell>{row.eta_date ?? '—'}</TableCell>
                      <TableCell>{row.in_nj_whse_date ?? '—'}</TableCell>
                      <TableCell>{row.comments ?? '—'}</TableCell>
                    </TableRow>
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
