import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function fetchShopifyPage(url: string, accessToken: string) {
  const res = await fetch(url, {
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Shopify ${res.status}: ${url}`);
  return res;
}

function parseNextPageUrl(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
  return match ? match[1] : null;
}

async function syncOrders(): Promise<number> {
  const shopifyUrl = process.env.SHOPIFY_STORE_URL!;
  const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  let url: string | null =
    `${shopifyUrl}/admin/api/2024-01/orders.json?limit=250&status=any&created_at_min=2026-01-01`;
  let totalImported = 0;

  while (url) {
    const res = await fetchShopifyPage(url, accessToken);
    const data = (await res.json()) as { orders?: Record<string, unknown>[] };
    const orders = data.orders ?? [];
    if (orders.length === 0) break;

    const rows = orders.map((o) => ({
      shopify_order_id: String(o.id),
      customer_email: o.email ?? null,
      customer_name: o.billing_address
        ? `${(o.billing_address as Record<string, unknown>).first_name ?? ''} ${(o.billing_address as Record<string, unknown>).last_name ?? ''}`.trim()
        : null,
      total_price: parseFloat(String(o.total_price ?? 0)),
      currency: o.currency ?? null,
      status: String(o.financial_status ?? 'pending'),
      fulfillment_status: o.fulfillment_status ?? null,
      order_name: o.name ?? null,
      source_name: o.source_name ?? null,
      location_id: o.location_id ? String(o.location_id) : null,
      location_name: o.location_name ?? null,
      line_items: o.line_items ?? null,
      shipping_address: o.shipping_address ?? null,
      created_at: o.created_at ?? null,
      updated_at: o.updated_at ?? null,
    }));

    // Upsert in batches of 250
    for (let i = 0; i < rows.length; i += 250) {
      const batch = rows.slice(i, i + 250);
      const { error } = await supabase
        .from('orders')
        .upsert(batch as never, { onConflict: 'shopify_order_id' });
      if (error) console.error('Orders upsert error:', error.message);
    }

    totalImported += orders.length;
    url = parseNextPageUrl(res.headers.get('link'));
  }

  return totalImported;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Starting orders sync...`);
    const count = await syncOrders();
    console.log(`[${timestamp}] Synced ${count} orders`);
    return NextResponse.json({ ok: true, synced: count, timestamp });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Orders sync failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
