import { createServiceRoleClientWithStatementTimeout } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const maxDuration = 60

export async function GET(request: Request) {
  const url = new URL(request.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'))
  const pageSize = Math.min(100, parseInt(url.searchParams.get('pageSize') ?? '50'))
  const search = url.searchParams.get('search') ?? ''

  const supabase = createServiceRoleClientWithStatementTimeout(30000)

  const rpc = (supabase as any).rpc.bind(supabase as any);
  const [rowsResult, countResult, summaryResult] = await Promise.all([
    rpc('erp_q1_2026_report', {
      p_page: page,
      p_page_size: pageSize,
      p_search: search || null
    }),
    rpc('erp_q1_2026_report_count', {
      p_search: search || null
    }),
    rpc('erp_q1_2026_summary')
  ])

  if (rowsResult.error) {
    console.error('Q1 rows error:', rowsResult.error)
    return NextResponse.json(
      { error: rowsResult.error.message }, 
      { status: 500 }
    )
  }

  return NextResponse.json({
    rows: rowsResult.data ?? [],
    total: countResult.data ?? 0,
    summary: summaryResult.data ?? null,
    searchMode: 'native'
  })
}
