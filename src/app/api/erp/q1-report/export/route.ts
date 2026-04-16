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

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session?.profile || !hasRole(session, ['admin'])) {
    return new Response('Forbidden', { status: 403 });
  }

  const url = new URL(request.url);
  const p_search = (url.searchParams.get('search') ?? '').trim() || null;
  const supabase = createServiceRoleClientWithStatementTimeout(120_000);

  const rpc = (supabase as any).rpc.bind(supabase as any);
  const { data: summaryData } = await rpc('erp_q1_2026_summary');
  const summaryObj =
    summaryData && typeof summaryData === 'object' && !Array.isArray(summaryData)
      ? (summaryData as Record<string, unknown>)
      : {};
  const totalReturned = toNum(summaryObj.total_returned ?? summaryObj.total_return_amount);

  const all: Record<string, unknown>[] = [];
  let page = 1;
  for (;;) {
    const { data, error } = await rpc('erp_q1_2026_report', {
      p_page: page,
      p_page_size: PAGE_SIZE,
      p_search,
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

  const header = [
    'Order ID',
    'Sales channel',
    'Product variant SKU',
    'Product title',
    'Order name',
    'Gross sales',
    'Net sales',
    'Discount',
    'Return amount',
  ];

  const lines = [
    header.join(','),
    ...all.map((r) =>
      [
        esc(String(r.shopify_order_id ?? '')),
        esc(String(r.sales_channel ?? '')),
        esc(String(r.product_variant_sku ?? '')),
        esc(String(r.product_title ?? '')),
        esc(String(r.order_name ?? '')),
        esc(fmtMoney(toNum(r.gross_sales))),
        esc(fmtMoney(toNum(r.net_sales))),
        esc(fmtMoney(toNum(r.discount ?? r.total_discount))),
        esc(fmtMoney(toNum(r.return_amount))),
      ].join(',')
    ),
    ['', '', '', '', '', '', '', '', ''].join(','),
    [esc('Total Q1 Returns (all refunds in Q1)'), esc(''), esc(''), esc(''), esc(''), esc(''), esc(''), esc(''), esc(fmtMoney(totalReturned))].join(','),
  ];

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="q1-2026-sales-report.csv"',
    },
  });
}
