import { NextResponse } from 'next/server';
import { createServiceRoleClientWithStatementTimeout } from '@/lib/supabase/admin';
import { getServerSession, hasRole } from '@/lib/supabase/session';
import { parsePagedRpcPayload } from '@/lib/erp/inventory-report-rows';

export const runtime = 'nodejs';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 500;

function summaryTotalSkus(data: unknown): number | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const o = data as Record<string, unknown>;
  if (o.total_skus == null) return null;
  const n = Number(o.total_skus);
  return Number.isFinite(n) ? n : null;
}

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session?.profile || !hasRole(session, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
  const rawSize = parseInt(url.searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE), 10);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number.isNaN(rawSize) ? DEFAULT_PAGE_SIZE : rawSize)
  );

  const supabase = createServiceRoleClientWithStatementTimeout(30_000);

  const [{ data: pageData, error: pageError }, { data: summaryData }] = await Promise.all([
    supabase.rpc('erp_inventory_report_pre_july', {
      p_page: page,
      p_page_size: pageSize,
    }),
    supabase.rpc('erp_inventory_report_summary'),
  ]);

  if (pageError) {
    return NextResponse.json({ error: pageError.message }, { status: 500 });
  }

  const parsed = parsePagedRpcPayload(pageData);
  const { rows } = parsed;
  const total = summaryTotalSkus(summaryData) ?? parsed.total;

  return NextResponse.json({
    rows,
    total,
    page,
    pageSize,
  });
}
