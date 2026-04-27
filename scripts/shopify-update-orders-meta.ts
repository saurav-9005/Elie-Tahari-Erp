/**
 * Backfill `orders.order_name` from Shopify Admin REST for Nov–Dec 2025 rows missing it.
 * Loads up to 250 rows per loop with `.range(0, 249)` and repeats until a batch is empty
 * (updated rows drop out of `order_name IS NULL`).
 *
 * Env: SHOPIFY_STORE_URL, SHOPIFY_ACCESS_TOKEN or SHOPIFY_ADMIN_ACCESS_TOKEN,
 *      NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (`.env` then `.env.local` overrides)
 *
 * Run: npm run update-orders-meta
 */

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/lib/database.types';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

try {
  const u = new URL(supabaseUrl);
  if (u.protocol !== 'https:' && u.protocol !== 'http:') {
    throw new Error(`NEXT_PUBLIC_SUPABASE_URL must be http(s): ${supabaseUrl.slice(0, 80)}`);
  }
} catch (e) {
  if (e instanceof TypeError) {
    throw new Error(`NEXT_PUBLIC_SUPABASE_URL is not a valid URL: ${supabaseUrl.slice(0, 80)}`);
  }
  throw e;
}

const supabase = createClient<Database>(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const API_VERSION = '2024-01';
const BATCH = 250;
const DELAY_MS = 300;

const since = '2025-11-01T00:00:00Z';
const until = '2026-01-01T00:00:00Z';

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function normalizeStoreUrl(raw: string): string {
  return raw.replace(/\/+$/, '');
}

function shopifyHeaders(accessToken: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-Shopify-Access-Token': accessToken,
  };
}

async function shopifyGetOrderName(
  base: string,
  headers: HeadersInit,
  shopifyOrderId: string
): Promise<string | null> {
  const url = `${base}/orders/${shopifyOrderId}.json?fields=id,name`;
  for (;;) {
    const res = await fetch(url, { headers });
    if (res.status === 429) {
      const retryAfter = res.headers.get('Retry-After') ?? '2';
      await delay(parseInt(retryAfter, 10) * 1000);
      continue;
    }
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Shopify ${res.status} order ${shopifyOrderId}: ${t.slice(0, 300)}`);
    }
    const body = (await res.json()) as { order?: { name?: string | null } };
    const name = body.order?.name;
    if (name == null || String(name).trim() === '') return null;
    return String(name).trim();
  }
}

async function main() {
  const storeUrl = normalizeStoreUrl(requireEnv('SHOPIFY_STORE_URL'));
  const accessToken =
    process.env.SHOPIFY_ACCESS_TOKEN?.trim() || process.env.SHOPIFY_ADMIN_ACCESS_TOKEN?.trim();
  if (!accessToken) throw new Error('Set SHOPIFY_ACCESS_TOKEN or SHOPIFY_ADMIN_ACCESS_TOKEN');

  const base = `${storeUrl}/admin/api/${API_VERSION}`;
  const headers = shopifyHeaders(accessToken);

  console.log('Fetching Nov-Dec 2025 orders missing order_name...');

  let updated = 0;

  for (;;) {
    const { data, error } = await supabase
      .from('orders')
      .select('shopify_order_id')
      .is('order_name', null)
      .gte('created_at', since)
      .lt('created_at', until)
      .order('created_at', { ascending: true })
      .range(0, BATCH - 1);

    if (error) {
      console.error('Supabase query error:', error);
      throw new Error(error.message || 'Supabase query failed');
    }

    const rows = data ?? [];
    if (rows.length === 0) break;

    for (const row of rows) {
      const shopifyOrderId = String(row.shopify_order_id ?? '');
      if (!shopifyOrderId) continue;

      try {
        const name = await shopifyGetOrderName(base, headers, shopifyOrderId);
        if (name != null) {
          const { error: upErr } = await supabase
            .from('orders')
            .update({ order_name: name, updated_at: new Date().toISOString() })
            .eq('shopify_order_id', shopifyOrderId);
          if (upErr) {
            console.error(`Supabase update failed for ${shopifyOrderId}:`, upErr.message);
            continue;
          }
          updated += 1;
          console.log(`Updating: ${shopifyOrderId} → ${name}`);
        } else {
          await supabase
            .from('orders')
            .update({ order_name: '', updated_at: new Date().toISOString() })
            .eq('shopify_order_id', shopifyOrderId);
        }
      } catch (e) {
        console.error(`Order ${shopifyOrderId}:`, e);
      }

      await delay(DELAY_MS);
    }
  }

  console.log(`Done. Updated ${updated} orders.`);
}

main().catch((e) => {
  console.error(e);
  setImmediate(() => process.exit(1));
});
