'use client';

import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createClient } from '@/lib/supabase/client';

type RawRow = Record<string, unknown>;

type WmsReceivingReportRow = {
  'Vendor Name': string | null;
  Style: string | null;
  'Style Desc': string | null;
  Color: string | null;
  'Color Desc': string | null;
  'Received Qty': number;
  'Rcv Date': string | null;
};

function toNumber(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function readString(row: RawRow, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value == null) continue;
    const s = String(value).trim();
    if (s.length > 0) return s;
  }
  return null;
}

function readNumber(row: RawRow, ...keys: string[]) {
  for (const key of keys) {
    if (!(key in row)) continue;
    return toNumber(row[key]);
  }
  return 0;
}

export function WmsClient() {
  const [rows, setRows] = useState<WmsReceivingReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [styleSearch, setStyleSearch] = useState('');

  const filteredRows = useMemo(() => {
    const q = styleSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => (row.Style ?? '').toLowerCase().includes(q));
  }, [rows, styleSearch]);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    setLoading(true);
    setError(null);

    supabase
      .from('wms_receiving_report' as never)
      .select('"Vendor Name","Style","Style Desc","Color","Color Desc","Received Qty","Rcv Date"')
      .then(({ data, error: fetchError }) => {
        if (fetchError) throw new Error(fetchError.message ?? 'Failed to load WMS receiving report');
        if (cancelled) return;
        const normalized = (Array.isArray(data) ? data : []).map((item) => {
          const row = (item ?? {}) as RawRow;
          return {
            'Vendor Name': readString(row, 'Vendor Name'),
            Style: readString(row, 'Style'),
            'Style Desc': readString(row, 'Style Desc'),
            Color: readString(row, 'Color'),
            'Color Desc': readString(row, 'Color Desc'),
            'Received Qty': readNumber(row, 'Received Qty'),
            'Rcv Date': readString(row, 'Rcv Date'),
          } satisfies WmsReceivingReportRow;
        });
        setRows(normalized);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message ?? 'Failed to load');
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="wms-style-search" className="text-sm text-muted-foreground">
          Search by Style
        </Label>
        <Input
          id="wms-style-search"
          className="max-w-sm border-border bg-background"
          placeholder="Type style number..."
          value={styleSearch}
          onChange={(e) => setStyleSearch(e.target.value)}
          aria-label="Search by Style"
        />
      </div>

      <div className="relative overflow-x-auto rounded-lg border border-border">
        {loading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/30">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : null}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor Name</TableHead>
              <TableHead>Style</TableHead>
              <TableHead>Style Desc</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Color Desc</TableHead>
              <TableHead className="text-right">Received Qty</TableHead>
              <TableHead>Rcv Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No rows found.
                </TableCell>
              </TableRow>
            ) : (
              filteredRows.map((row, idx) => (
                <TableRow key={`${row['Style'] ?? 'style'}-${row['Vendor Name'] ?? 'vendor'}-${idx}`}>
                  <TableCell>{row['Vendor Name'] ?? '—'}</TableCell>
                  <TableCell>{row['Style'] ?? '—'}</TableCell>
                  <TableCell>{row['Style Desc'] ?? '—'}</TableCell>
                  <TableCell>{row['Color'] ?? '—'}</TableCell>
                  <TableCell>{row['Color Desc'] ?? '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">{row['Received Qty'].toLocaleString('en-US')}</TableCell>
                  <TableCell>{row['Rcv Date'] ?? '—'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
