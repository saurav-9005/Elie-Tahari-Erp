import { createServiceRoleClientWithStatementTimeout } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export const maxDuration = 120;

const TAB_RPC: Record<string, 'erp_customer_ltv_by_channel' | 'erp_customer_ltv_by_first_product' | 'erp_customer_segments' | 'erp_promotion_impact'> = {
  channel: 'erp_customer_ltv_by_channel',
  product: 'erp_customer_ltv_by_first_product',
  segments: 'erp_customer_segments',
  promo: 'erp_promotion_impact',
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tab = (url.searchParams.get('tab') ?? 'channel').toLowerCase();
  const rpc = TAB_RPC[tab] ?? TAB_RPC.channel;

  const supabase = createServiceRoleClientWithStatementTimeout(120000);
  const { data, error } = await supabase.rpc(rpc);

  if (error) {
    console.error('customer-analytics rpc', rpc, error);
    return NextResponse.json({ error: error.message, tab, rpc }, { status: 500 });
  }

  return NextResponse.json({ tab, data: data ?? null });
}
