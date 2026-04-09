/**
 * One-time Shopify → Supabase import (REST Admin API).
 *
 * Env:
 *   SHOPIFY_STORE_URL          e.g. https://your-store.myshopify.com
 *   SHOPIFY_ACCESS_TOKEN       Admin API access token (falls back to SHOPIFY_ADMIN_ACCESS_TOKEN)
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Run:
 *   npm run shopify-import
 *   npm run shopify-import-inventory          (products only; re-runs even if completed)
 *   IMPORT_ONLY=inventory npm run shopify-import
 *   npx ts-node -P tsconfig.scripts.json scripts/shopify-import.ts --only=inventory
 *   (Plain `npx ts-node scripts/shopify-import.ts` may fail; use -P or npm script.)
 */

import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import type { Database, Json } from '../src/lib/database.types';

const API_VERSION = '2024-01';
const BATCH = 100;
const PROGRESS_FILE = path.join(process.cwd(), 'shopify-import-progress.json');

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type ProgressState = {
  orders: { lastPageInfo: string | null; imported: number };
  customers: { lastPageInfo: string | null; imported: number };
  inventory: { lastPageInfo: string | null; imported: number };
  completedSteps: string[];
};

const defaultProgress = (): ProgressState => ({
  orders: { lastPageInfo: null, imported: 0 },
  customers: { lastPageInfo: null, imported: 0 },
  inventory: { lastPageInfo: null, imported: 0 },
  completedSteps: [],
});

async function loadProgress(): Promise<ProgressState> {
  try {
    const raw = await fs.readFile(PROGRESS_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    return {
      ...defaultProgress(),
      ...parsed,
      orders: { ...defaultProgress().orders, ...parsed.orders },
      customers: { ...defaultProgress().customers, ...parsed.customers },
      inventory: { ...defaultProgress().inventory, ...parsed.inventory },
      completedSteps: Array.isArray(parsed.completedSteps) ? parsed.completedSteps : [],
    };
  } catch {
    return defaultProgress();
  }
}

async function saveProgress(state: ProgressState): Promise<void> {
  await fs.writeFile(PROGRESS_FILE, JSON.stringify(state, null, 2), 'utf8');
}

type ShopifyOrder = {
  id: number;
  email?: string | null;
  customer?: {
    id: number;
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  } | null;
  total_price?: string | null;
  currency?: string | null;
  financial_status?: string | null;
  fulfillment_status?: string | null;
  line_items?: unknown[];
  shipping_address?: Record<string, unknown> | null;
  billing_address?: {
    first_name?: string | null;
    last_name?: string | null;
  } | null;
  created_at?: string;
  updated_at?: string | null;
};

type ShopifyCustomer = {
  id: number;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  orders_count?: number;
  total_spent?: string | null;
  created_at?: string;
};

type ShopifyVariant = {
  id: number;
  sku?: string | null;
  inventory_quantity?: number | null;
};

type ShopifyProduct = {
  id: number;
  title: string;
  created_at?: string;
  product_type?: string | null;
  vendor?: string | null;
  status?: string | null;
  variants: ShopifyVariant[];
};

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

function normalizeStoreUrl(raw: string): string {
  return raw.replace(/\/+$/, '');
}

function shopifyHeaders(accessToken: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-Shopify-Access-Token': accessToken,
  };
}

/** Shopify REST pagination: next page URL is in Link header rel="next". */
function parseNextPageUrl(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  for (const segment of linkHeader.split(',')) {
    const m = segment
      .trim()
      .match(/<([^>]+)>;\s*rel="?next"?/i);
    if (m?.[1]) return m[1];
  }
  return null;
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      return res;
    } catch (err) {
      if (i < retries - 1) {
        console.log(`Retrying... attempt ${i + 2}/${retries}`);
        await delay(3000);
      } else {
        throw err;
      }
    }
  }
  throw new Error('All retries failed');
}

/** Fetch until not rate-limited; network errors handled inside fetchWithRetry. */
async function fetchShopifyPage(url: string, headers: HeadersInit): Promise<Response> {
  for (;;) {
    const res = await fetchWithRetry(url, { headers });
    if (res.status === 429) {
      const retryAfter = res.headers.get('Retry-After') || '2';
      console.log(`Rate limited. Waiting ${retryAfter}s...`);
      await delay(parseInt(retryAfter, 10) * 1000);
      continue;
    }
    return res;
  }
}

function mapOrder(o: ShopifyOrder): Database['public']['Tables']['orders']['Insert'] {
  const fromCustomer = o.customer
    ? [o.customer.first_name, o.customer.last_name].filter(Boolean).join(' ').trim()
    : '';
  const fromBilling = o.billing_address
    ? [o.billing_address.first_name, o.billing_address.last_name].filter(Boolean).join(' ').trim()
    : '';
  const customerName = fromCustomer || fromBilling || null;

  return {
    shopify_order_id: String(o.id),
    customer_email: o.email ?? o.customer?.email ?? null,
    customer_name: customerName,
    total_price: o.total_price != null ? parseFloat(String(o.total_price)) : null,
    currency: o.currency ?? 'USD',
    status: o.fulfillment_status ?? o.financial_status ?? 'pending',
    line_items: (o.line_items ?? null) as Json,
    shipping_address: (o.shipping_address ?? null) as Json,
    created_at: o.created_at,
    updated_at: o.updated_at ?? o.created_at ?? new Date().toISOString(),
  };
}

function mapCustomer(c: ShopifyCustomer): Database['public']['Tables']['customers']['Insert'] {
  const fullName = [c.first_name, c.last_name].filter(Boolean).join(' ').trim() || null;
  return {
    shopify_customer_id: String(c.id),
    email: c.email ?? null,
    full_name: fullName,
    phone: c.phone ?? null,
    total_orders: c.orders_count ?? 0,
    total_spent: c.total_spent != null ? parseFloat(String(c.total_spent)) : 0,
    created_at: c.created_at,
  };
}

function mapProduct(p: ShopifyProduct): Database['public']['Tables']['inventory']['Insert'] {
  const variants = p.variants ?? [];
  const first = variants[0];
  return {
    shopify_product_id: String(p.id),
    shopify_variant_id: first ? String(first.id) : null,
    title: p.title || '(untitled)',
    sku: first?.sku ?? null,
    quantity: first?.inventory_quantity ?? 0,
    product_created_at: p.created_at ?? null,
    product_type: p.product_type ?? null,
    vendor: p.vendor ?? null,
    product_status: p.status ?? null,
    last_synced_at: new Date().toISOString(),
  };
}

const storeUrl = normalizeStoreUrl(requireEnv('SHOPIFY_STORE_URL'));
const accessToken =
  process.env.SHOPIFY_ACCESS_TOKEN?.trim() || process.env.SHOPIFY_ADMIN_ACCESS_TOKEN?.trim();
if (!accessToken) {
  throw new Error('Set SHOPIFY_ACCESS_TOKEN or SHOPIFY_ADMIN_ACCESS_TOKEN');
}

const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient<Database>(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function upsertBatches<T extends Record<string, unknown>>(
  table: 'orders' | 'customers' | 'inventory',
  rows: T[],
  onConflict: string
): Promise<void> {
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase.from(table).upsert(batch as never, { onConflict });
    if (error) throw new Error(`${table} upsert: ${error.message}`);
  }
}

const headers = shopifyHeaders(accessToken);
const base = `${storeUrl}/admin/api/${API_VERSION}`;

function pageLabel(importedBeforePage: number): number {
  return Math.floor(importedBeforePage / 250) + 1;
}

async function importOrders(progress: ProgressState): Promise<number> {
  if (progress.completedSteps.includes('orders')) {
    return progress.orders.imported;
  }

  const firstUrl = `${base}/orders.json?limit=250&status=any`;
  let url: string | null = progress.orders.lastPageInfo ?? firstUrl;
  const seenUrls = new Set<string>();
  let imported = progress.orders.imported;

  while (url) {
    if (seenUrls.has(url)) {
      throw new Error(`Shopify pagination loop: repeated URL ${url.slice(0, 120)}…`);
    }
    seenUrls.add(url);

    const pageNum = pageLabel(imported);
    console.log(`Orders:    page ${pageNum} — ${imported} imported so far...`);

    const res = await fetchShopifyPage(url, headers);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Shopify ${res.status} ${url}: ${text.slice(0, 500)}`);
    }
    const body = (await res.json()) as { orders?: ShopifyOrder[] };
    const items = body.orders ?? [];
    const rows = items.map(mapOrder) as Record<string, unknown>[];
    await upsertBatches('orders', rows, 'shopify_order_id');

    imported += items.length;
    const nextUrl = parseNextPageUrl(res.headers.get('link'));

    progress.orders = {
      lastPageInfo: nextUrl,
      imported,
    };
    await saveProgress(progress);

    if (nextUrl) {
      await delay(1000);
    }
    url = nextUrl;
  }

  if (!progress.completedSteps.includes('orders')) {
    progress.completedSteps.push('orders');
    progress.orders.lastPageInfo = null;
    await saveProgress(progress);
  }

  console.log(`✓ Orders complete — ${imported} total imported`);
  return imported;
}

async function importCustomers(progress: ProgressState): Promise<number> {
  if (progress.completedSteps.includes('customers')) {
    return progress.customers.imported;
  }

  const firstUrl = `${base}/customers.json?limit=250`;
  let url: string | null = progress.customers.lastPageInfo ?? firstUrl;
  const seenUrls = new Set<string>();
  let imported = progress.customers.imported;

  while (url) {
    if (seenUrls.has(url)) {
      throw new Error(`Shopify pagination loop: repeated URL ${url.slice(0, 120)}…`);
    }
    seenUrls.add(url);

    const pageNum = pageLabel(imported);
    console.log(`Customers: page ${pageNum} — ${imported} imported so far...`);

    const res = await fetchShopifyPage(url, headers);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Shopify ${res.status} ${url}: ${text.slice(0, 500)}`);
    }
    const body = (await res.json()) as { customers?: ShopifyCustomer[] };
    const items = body.customers ?? [];
    const rows = items.map(mapCustomer) as Record<string, unknown>[];
    await upsertBatches('customers', rows, 'shopify_customer_id');

    imported += items.length;
    const nextUrl = parseNextPageUrl(res.headers.get('link'));

    progress.customers = {
      lastPageInfo: nextUrl,
      imported,
    };
    await saveProgress(progress);

    if (nextUrl) {
      await delay(1000);
    }
    url = nextUrl;
  }

  if (!progress.completedSteps.includes('customers')) {
    progress.completedSteps.push('customers');
    progress.customers.lastPageInfo = null;
    await saveProgress(progress);
  }

  console.log(`✓ Customers complete — ${imported} total imported`);
  return imported;
}

async function importInventory(
  progress: ProgressState,
  options?: { force?: boolean }
): Promise<number> {
  if (!options?.force && progress.completedSteps.includes('inventory')) {
    return progress.inventory.imported;
  }

  const firstUrl = `${base}/products.json?limit=250`;
  let url: string | null = progress.inventory.lastPageInfo ?? firstUrl;
  const seenUrls = new Set<string>();
  let imported = progress.inventory.imported;

  while (url) {
    if (seenUrls.has(url)) {
      throw new Error(`Shopify pagination loop: repeated URL ${url.slice(0, 120)}…`);
    }
    seenUrls.add(url);

    const pageNum = pageLabel(imported);
    console.log(`Inventory: page ${pageNum} — ${imported} imported so far...`);

    const res = await fetchShopifyPage(url, headers);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Shopify ${res.status} ${url}: ${text.slice(0, 500)}`);
    }
    const body = (await res.json()) as { products?: ShopifyProduct[] };
    const items = body.products ?? [];
    const rows = items.map(mapProduct) as Record<string, unknown>[];
    await upsertBatches('inventory', rows, 'shopify_product_id');

    imported += items.length;
    const nextUrl = parseNextPageUrl(res.headers.get('link'));

    progress.inventory = {
      lastPageInfo: nextUrl,
      imported,
    };
    await saveProgress(progress);

    if (nextUrl) {
      await delay(1000);
    }
    url = nextUrl;
  }

  if (!progress.completedSteps.includes('inventory')) {
    progress.completedSteps.push('inventory');
    progress.inventory.lastPageInfo = null;
    await saveProgress(progress);
  }

  console.log(`✓ Inventory complete — ${imported} total imported`);
  return imported;
}

const onlyInventory =
  process.env.IMPORT_ONLY?.trim().toLowerCase() === 'inventory' ||
  process.argv.includes('--only=inventory');

async function main(): Promise<void> {
  let progress = await loadProgress();

  if (onlyInventory) {
    const totalInventory = await importInventory(progress, { force: true });
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✓ Inventory-only import complete!');
    console.log(`  Inventory: ${totalInventory} products`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return;
  }

  const totalOrders = await importOrders(progress);
  progress = await loadProgress();
  const totalCustomers = await importCustomers(progress);
  progress = await loadProgress();
  const totalInventory = await importInventory(progress);

  await fs.unlink(PROGRESS_FILE).catch(() => {});

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✓ Import complete!');
  console.log(`  Orders:    ${totalOrders}`);
  console.log(`  Customers: ${totalCustomers}`);
  console.log(`  Inventory: ${totalInventory}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
