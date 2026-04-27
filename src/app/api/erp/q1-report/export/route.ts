import { createServiceRoleClientWithStatementTimeout } from '@/lib/supabase/admin';
import { getServerSession, hasRole } from '@/lib/supabase/session';

export const runtime = 'nodejs';
export const maxDuration = 120;

const PAGE_SIZE = 1000;

function asUnknownArray(data: unknown): unknown[] {
  if (data == null) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'string') {
    try {
      const p = JSON.parse(data);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}

function esc(v: string | number | null | undefined) {
  return `"${String(v ?? '').replace(/"/g, '""')}"`;
}

function toNum(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function fmtMoney(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function csvOrderName(raw: unknown): string {
  if (raw == null || String(raw).trim() === '') return '';
  const s = String(raw).trim().replace(/^#/, '');
  return s ? `#${s}` : '';
}

function rowQty(o: Record<string, unknown>): number {
  const qty =
    o.quantity ??
    o.qty ??
    o.line_quantity ??
    (typeof o.quantity_sold === 'number' ? o.quantity_sold : null);
  return toNum(qty);
}

/** Match UI: return amount only on `return_only` rows; sale rows export 0 (no duplicate with expanded UI logic). */
function csvReturnAmount(r: Record<string, unknown>): number {
  if (String(r.row_type ?? '').toLowerCase() === 'return_only') return toNum(r.return_amount);
  return 0;
}

/** Normalize `erp_q1_2026_summary` payload (object, single-element array, or JSON string). */
function parseQ1SummaryPayload(data: unknown): Record<string, unknown> {
  let raw: unknown = data;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (Array.isArray(raw) && raw.length > 0) {
    raw = raw[0];
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session?.profile || !hasRole(session, ['admin'])) {
    return new Response('Forbidden', { status: 403 });
  }

  const url = new URL(request.url);
  const p_search = (url.searchParams.get('search') ?? '').trim() || null;
  const supabase = createServiceRoleClientWithStatementTimeout(120_000);
  const db = supabase as unknown as {
    rpc: (fn: string, args?: object) => Promise<{ data: unknown; error: { message: string } | null }>;
  };

  const { data: summaryData, error: summaryError } = await db.rpc('erp_q1_2026_summary');
  if (summaryError) {
    return new Response(`Export failed: ${summaryError.message}`, { status: 500 });
  }
  const summaryObj = parseQ1SummaryPayload(summaryData);
  /** Canonical Q1 returns total from `erp_q1_2026_summary()` — do not sum `return_amount` from detail rows (sale + return_only double-counts). */
  const totalReturned = toNum(summaryObj.total_returned ?? summaryObj.total_return_amount);
  const e = () => esc('');
  const summaryLines = [
    [esc('SUMMARY'), e(), e(), e(), e(), e(), e(), e(), e(), e()].join(','),
    [esc('Total orders'), e(), e(), e(), e(), esc(toNum(summaryObj.total_orders)), e(), e(), e(), e()].join(','),
    [esc('Total SKUs'), e(), e(), e(), e(), esc(toNum(summaryObj.total_skus)), e(), e(), e(), e()].join(','),
    [esc('Total units sold'), e(), e(), e(), e(), esc(toNum(summaryObj.total_units)), e(), e(), e(), e()].join(','),
    [esc('Gross sales ($)'), e(), e(), e(), e(), e(), esc(fmtMoney(toNum(summaryObj.gross_sales))), e(), e(), e()].join(','),
    [esc('Net sales ($)'), e(), e(), e(), e(), e(), e(), esc(fmtMoney(toNum(summaryObj.net_sales))), e(), e()].join(','),
    [esc('Total Returns'), e(), e(), e(), e(), e(), e(), e(), e(), esc(fmtMoney(totalReturned))].join(','),
    [e(), e(), e(), e(), e(), e(), e(), e(), e(), e()].join(','),
  ];

  const header = [
    'Order ID',
    'Sales channel',
    'Product variant SKU',
    'Product title',
    'Order name',
    'Qty',
    'Gross sales ($)',
    'Net sales ($)',
    'Discount ($)',
    'Return amount ($)',
  ];

  const all: Record<string, unknown>[] = [];
  let page = 1;
  for (;;) {
    const { data, error } = await db.rpc('erp_q1_2026_report', {
      p_page: page,
      p_page_size: PAGE_SIZE,
      p_search: p_search,
    });
    if (error) return new Response(`Export failed: ${error.message}`, { status: 500 });
    const chunk = asUnknownArray(data).map((r) =>
      r && typeof r === 'object' ? (r as Record<string, unknown>) : {}
    );
    all.push(...chunk);
    if (chunk.length < PAGE_SIZE) break;
    page += 1;
    if (page > 10_000) break;
  }

  const dataLines = all.map((r) =>
    [
      esc(String(r.shopify_order_id ?? '')),
      esc(String(r.sales_channel ?? '')),
      esc(String(r.product_variant_sku ?? '')),
      esc(String(r.product_title ?? '')),
      esc(csvOrderName(r.order_name)),
      esc(rowQty(r)),
      esc(fmtMoney(toNum(r.gross_sales))),
      esc(fmtMoney(toNum(r.net_sales))),
      esc(fmtMoney(toNum(r.discount ?? r.total_discount))),
      esc(fmtMoney(csvReturnAmount(r))),
    ].join(',')
  );

  const body = [summaryLines.join('\n'), header.join(','), ...dataLines].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="q1-2026-sales-report.csv"',
    },
  });
}
