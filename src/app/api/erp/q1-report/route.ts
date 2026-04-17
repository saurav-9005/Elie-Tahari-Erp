import { createServiceRoleClientWithStatementTimeout } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export const maxDuration = 60;

type RpcResult<T> = { data: T; error: { message: string } | null };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
  const pageSize = Math.min(100, parseInt(url.searchParams.get('pageSize') ?? '50', 10));
  const search = url.searchParams.get('search') ?? '';

  const supabase = createServiceRoleClientWithStatementTimeout(30000);
  const db = supabase as unknown as {
    rpc: (fn: string, args?: object) => Promise<RpcResult<unknown>>;
  };

  const pSearch = search.trim() === '' ? null : search.trim();

  const [rowsResult, countResult, summaryResult] = await Promise.all([
    db.rpc('erp_q1_2026_report', {
      p_page: page,
      p_page_size: pageSize,
      p_search: pSearch,
    }),
    db.rpc('erp_q1_2026_report_count', {
      p_search: pSearch,
    }),
    db.rpc('erp_q1_2026_summary'),
  ]);

  if (rowsResult.error) {
    console.error('Q1 rows error:', rowsResult.error);
    return NextResponse.json({ error: rowsResult.error.message }, { status: 500 });
  }
  if (countResult.error) {
    console.error('Q1 count error:', countResult.error);
    return NextResponse.json({ error: countResult.error.message }, { status: 500 });
  }
  if (summaryResult.error) {
    console.error('Q1 summary error:', summaryResult.error);
    return NextResponse.json({ error: summaryResult.error.message }, { status: 500 });
  }

  return NextResponse.json({
    rows: rowsResult.data ?? [],
    total: countResult.data ?? 0,
    summary: summaryResult.data ?? null,
    searchMode: 'native',
  });
}
