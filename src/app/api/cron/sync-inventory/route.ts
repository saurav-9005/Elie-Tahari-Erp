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

async function syncInventory(): Promise<number> {
  const shopifyUrl = process.env.SHOPIFY_STORE_URL!;
  const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  let url: string | null =
    `${shopifyUrl}/admin/api/2024-01/products.json?limit=250`;
  let totalImported = 0;

  while (url) {
    const res = await fetchShopifyPage(url, accessToken);
    const data = (await res.json()) as { products?: Record<string, unknown>[] };
    const products = data.products ?? [];
    if (products.length === 0) break;

    const rows: Record<string, unknown>[] = [];
    for (const product of products) {
      const variants = (product.variants as Record<string, unknown>[]) ?? [];
      for (const variant of variants) {
        rows.push({
          shopify_product_id: String(product.id),
          shopify_variant_id: String(variant.id),
          title: product.title ?? null,
          sku: variant.sku ?? null,
          quantity: variant.inventory_quantity ?? 0,
          product_type: product.product_type ?? null,
          vendor: product.vendor ?? null,
          product_status: product.status ?? null,
          product_created_at: product.created_at ?? null,
          last_synced_at: new Date().toISOString(),
        });
      }
    }

    // Upsert in batches of 250
    for (let i = 0; i < rows.length; i += 250) {
      const batch = rows.slice(i, i + 250);
      const { error } = await supabase
        .from('inventory')
        .upsert(batch as never, { onConflict: 'shopify_variant_id' });
      if (error) console.error('Inventory upsert error:', error.message);
    }

    totalImported += rows.length;
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
    console.log(`[${timestamp}] Starting inventory sync...`);
    const count = await syncInventory();
    console.log(`[${timestamp}] Synced ${count} inventory rows`);
    return NextResponse.json({ ok: true, synced: count, timestamp });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Inventory sync failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
