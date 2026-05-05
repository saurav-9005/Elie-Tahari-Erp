import { createServiceRoleClientWithStatementTimeout } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export const maxDuration = 30;

type RpcResult<T> = { data: T; error: { message: string } | null };

function normalizeTotalCount(data: unknown): number {
  if (data == null) return 0;
  if (typeof data === 'number' && Number.isFinite(data)) return Math.floor(data);
  if (typeof data === 'object' && data !== null && 'count' in (data as object)) {
    return normalizeTotalCount((data as { count: unknown }).count);
  }
  const n = Number(data);
  return Number.isFinite(n) ? Math.floor(n) : 0;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
  const monthRaw = url.searchParams.get('month');
  const month = monthRaw && monthRaw.trim() !== '' ? monthRaw.trim() : null;

  const supabase = createServiceRoleClientWithStatementTimeout(30000);
  const db = supabase as unknown as {
    rpc: (fn: string, args?: object) => Promise<RpcResult<unknown>>;
  };

  const [rowsResult, summaryResult, countResult] = await Promise.all([
    db.rpc('erp_shopify_inventory', { p_page: page, p_month: month }),
    db.rpc('erp_shopify_inventory_summary'),
    db.rpc('erp_shopify_inventory_count'),
  ]);

  if (rowsResult.error) {
    console.error('erp_shopify_inventory error:', rowsResult.error);
    return NextResponse.json({ error: rowsResult.error.message }, { status: 500 });
  }
  if (summaryResult.error) {
    console.error('erp_shopify_inventory_summary error:', summaryResult.error);
    return NextResponse.json({ error: summaryResult.error.message }, { status: 500 });
  }
  if (countResult.error) {
    console.error('erp_shopify_inventory_count error:', countResult.error);
    return NextResponse.json({ error: countResult.error.message }, { status: 500 });
  }

  return NextResponse.json({
    rows: rowsResult.data ?? [],
    summary: summaryResult.data ?? null,
    total: normalizeTotalCount(countResult.data),
  });
}
