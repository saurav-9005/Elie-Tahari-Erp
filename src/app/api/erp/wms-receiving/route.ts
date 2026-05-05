import { createServiceRoleClientWithStatementTimeout } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export const maxDuration = 30;

const PAGE_SIZE = 50;

type Status = 'received' | 'late' | 'in_transit';
type SortDir = 'asc' | 'desc';
type SortBy = 'factory' | 'style' | 'description' | 'color' | 'qty' | 'received_date' | 'eta_date' | 'status';

type Row = {
  factory: string | null;
  style: string | null;
  description: string | null;
  color: string | null;
  qty: number;
  received_date: string | null;
  eta_date: string | null;
  status: Status;
};

function toNum(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeString(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

function asRows(data: unknown): Row[] {
  if (!Array.isArray(data)) return [];
  const today = todayIso();
  return data.map((item) => {
    const o = (item ?? {}) as Record<string, unknown>;
    const receivedDate = normalizeString(o.received_date);
    const etaDate = normalizeString(o.eta_date);
    const status: Status = receivedDate ? 'received' : etaDate && etaDate < today ? 'late' : 'in_transit';
    return {
      factory: normalizeString(o.factory),
      style: normalizeString(o.style),
      description: normalizeString(o.description),
      color: normalizeString(o.color),
      qty: toNum(o.qty),
      received_date: receivedDate,
      eta_date: etaDate,
      status,
    };
  });
}

function compareRows(a: Row, b: Row, sortBy: SortBy, sortDir: SortDir): number {
  const dir = sortDir === 'desc' ? -1 : 1;
  const str = (v: string | null) => (v ?? '').toLowerCase();

  if (sortBy === 'qty') return (a.qty - b.qty) * dir;
  if (sortBy === 'status') return str(a.status).localeCompare(str(b.status)) * dir;
  if (sortBy === 'received_date') return str(a.received_date).localeCompare(str(b.received_date)) * dir;
  if (sortBy === 'eta_date') return str(a.eta_date).localeCompare(str(b.eta_date)) * dir;
  if (sortBy === 'factory') return str(a.factory).localeCompare(str(b.factory)) * dir;
  if (sortBy === 'style') return str(a.style).localeCompare(str(b.style)) * dir;
  if (sortBy === 'description') return str(a.description).localeCompare(str(b.description)) * dir;
  return str(a.color).localeCompare(str(b.color)) * dir;
}

function getSummary(rows: Row[]) {
  const styleSet = new Set<string>();
  let totalQty = 0;
  let received = 0;
  let late = 0;
  let inTransit = 0;

  for (const row of rows) {
    if (row.style) styleSet.add(row.style);
    totalQty += row.qty;
    if (row.status === 'received') received += 1;
    else if (row.status === 'late') late += 1;
    else inTransit += 1;
  }

  return {
    total_styles: styleSet.size,
    total_qty: totalQty,
    received,
    in_transit: inTransit,
    late,
  };
}

function applyFilters(rows: Row[], search: string, factory: string, status: string): Row[] {
  const s = search.trim().toLowerCase();
  return rows.filter((row) => {
    if (s) {
      const hit =
        (row.style ?? '').toLowerCase().includes(s) ||
        (row.description ?? '').toLowerCase().includes(s) ||
        (row.factory ?? '').toLowerCase().includes(s) ||
        (row.color ?? '').toLowerCase().includes(s);
      if (!hit) return false;
    }
    if (factory !== 'all' && (row.factory ?? '') !== factory) return false;
    if (status !== 'all' && row.status !== status) return false;
    return true;
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1) || 1);
  const search = url.searchParams.get('search') ?? '';
  const factory = url.searchParams.get('factory') ?? 'all';
  const status = url.searchParams.get('status') ?? 'all';
  const sortByParam = url.searchParams.get('sortBy') ?? 'eta_date';
  const sortDirParam = url.searchParams.get('sortDir') ?? 'asc';
  const sortBy: SortBy =
    sortByParam === 'factory' ||
    sortByParam === 'style' ||
    sortByParam === 'description' ||
    sortByParam === 'color' ||
    sortByParam === 'qty' ||
    sortByParam === 'received_date' ||
    sortByParam === 'eta_date' ||
    sortByParam === 'status'
      ? sortByParam
      : 'eta_date';
  const sortDir: SortDir = sortDirParam === 'desc' ? 'desc' : 'asc';

  const supabase = createServiceRoleClientWithStatementTimeout(30000);
  const db = supabase as unknown as {
    from: (
      table: string
    ) => { select: (columns: string) => { limit: (value: number) => Promise<{ data: unknown; error: { message: string } | null }> } };
  };
  const { data, error } = await db
    .from('wms_receiving_report')
    .select('factory,style,description,color,qty,received_date,eta_date')
    .limit(100000);

  if (error) {
    console.error('wms_receiving_report fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const allRows = asRows(data ?? []);
  const factories = Array.from(
    new Set(allRows.map((r) => r.factory ?? '').filter((x) => x.trim().length > 0))
  ).sort((a, b) => a.localeCompare(b));

  const filtered = applyFilters(allRows, search, factory, status).sort((a, b) => compareRows(a, b, sortBy, sortDir));
  const total = filtered.length;
  const start = (page - 1) * PAGE_SIZE;
  const rows = filtered.slice(start, start + PAGE_SIZE);
  const summary = getSummary(filtered);

  return NextResponse.json({ rows, total, summary, factories });
}
