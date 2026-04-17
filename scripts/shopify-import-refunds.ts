/**
 * Shopify Admin REST → Supabase `refunds`.
 *
 * Loads order IDs from Shopify with `created_at_min=2025-01-01T00:00:00Z` and
 * `financial_status=refunded` and a second pass for `partially_refunded`, then
 * for each order calls `GET .../orders/{id}/refunds.json` (and `line_items` when needed for SKU fallback).
 *
 * Upserts into `refunds` on `shopify_refund_id` so existing rows get updated (subtotal, tax,
 * shipping, `refund_line_items`, etc.).
 *
 * Progress: `shopify-refunds-progress.json` as `{ lastOrderIndex, imported }`.
 * For a full re-sync from order 0, delete that file first, e.g.
 * `Remove-Item shopify-refunds-progress.json -ErrorAction SilentlyContinue`
 *
 * Re-run after a crash to resume. `--reset` or `REFUNDS_IMPORT_RESET=1` starts over.
 * Progress is written every 100 orders; the file is deleted when the run completes.
 *
 * Env: SHOPIFY_STORE_URL, SHOPIFY_ACCESS_TOKEN or SHOPIFY_ADMIN_ACCESS_TOKEN,
 *      NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Run: npm run shopify-import-refunds-full
 */

import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import type { Database, Json } from '../src/lib/database.types';

const API_VERSION = '2024-01';
const BATCH = 100;
const NETWORK_RETRIES = 3;
const NETWORK_RETRY_DELAY_MS = 1000;
const DELAY_BETWEEN_ORDERS_MS = 2000;
const SAVE_PROGRESS_EVERY = 100;
const MAX_503_RETRIES = 3;
const WAIT_503_MS = 30_000;

/** Only orders created on or after this instant (refunded / partially_refunded lists). */
const CREATED_AT_MIN_2025 = '2025-01-01T00:00:00Z';

const PROGRESS_FILE = path.join(process.cwd(), 'shopify-refunds-progress.json');

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

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

function parseNextPageUrl(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  for (const segment of linkHeader.split(',')) {
    const m = segment.trim().match(/<([^>]+)>;\s*rel="?next"?/i);
    if (m?.[1]) return m[1];
  }
  return null;
}

async function fetchWithNetworkRetry(
  url: string,
  options: RequestInit,
  retries = NETWORK_RETRIES
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      if (i < retries - 1) {
        console.log(`Retrying fetch... attempt ${i + 2}/${retries}`);
        await delay(NETWORK_RETRY_DELAY_MS);
      } else {
        throw err;
      }
    }
  }
  throw new Error('All retries failed');
}

/**
 * GET with 429 backoff and up to 3× 30s wait on 503 before returning the last response.
 */
async function shopifyGet(url: string, headers: HeadersInit, label: string): Promise<Response> {
  let attempt503 = 0;
  for (;;) {
    const res = await fetchWithNetworkRetry(url, { headers });
    if (res.status === 429) {
      const retryAfter = res.headers.get('Retry-After') || '2';
      console.log(`Rate limited (${label}). Waiting ${retryAfter}s...`);
      await delay(parseInt(retryAfter, 10) * 1000);
      continue;
    }
    if (res.status === 503) {
      if (attempt503 < MAX_503_RETRIES) {
        attempt503 += 1;
        console.log(`${label}: 503 — waiting 30s (retry ${attempt503}/${MAX_503_RETRIES})...`);
        await delay(WAIT_503_MS);
        continue;
      }
      return res;
    }
    return res;
  }
}

async function paginateOrderIdsByFinancialStatus(
  base: string,
  headers: HeadersInit,
  financialStatus: 'refunded' | 'partially_refunded',
  label: string
): Promise<number[]> {
  const ids: number[] = [];
  const params = new URLSearchParams({
    status: 'any',
    limit: '250',
    created_at_min: CREATED_AT_MIN_2025,
    financial_status: financialStatus,
    fields: 'id',
  });
  let url: string | null = `${base}/orders.json?${params.toString()}`;
  const seen = new Set<string>();

  while (url) {
    if (seen.has(url)) {
      throw new Error(`Shopify pagination loop: repeated URL ${url.slice(0, 120)}…`);
    }
    seen.add(url);

    const res = await shopifyGet(url, headers, `orders list (${label})`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Shopify ${res.status} orders list (${label}): ${text.slice(0, 500)}`);
    }
    const body = (await res.json()) as { orders?: { id: number }[] };
    for (const o of body.orders ?? []) {
      if (o?.id != null) ids.push(o.id);
    }
    const next = parseNextPageUrl(res.headers.get('Link'));
    url = next && next.length > 0 ? next : null;
  }

  return ids;
}

/**
 * Two filtered order lists (refunded + partially_refunded, 2025+), merged and deduped.
 */
async function fetchShopifyOrderIdsForRefundsImport(
  base: string,
  headers: HeadersInit
): Promise<number[]> {
  console.log(
    `Fetching order IDs (created_at_min=${CREATED_AT_MIN_2025}, financial_status=refunded)...`
  );
  const refunded = await paginateOrderIdsByFinancialStatus(base, headers, 'refunded', 'refunded');
  console.log(`  → ${refunded.length} orders`);

  console.log(
    `Fetching order IDs (created_at_min=${CREATED_AT_MIN_2025}, financial_status=partially_refunded)...`
  );
  const partial = await paginateOrderIdsByFinancialStatus(
    base,
    headers,
    'partially_refunded',
    'partially_refunded'
  );
  console.log(`  → ${partial.length} orders`);

  const merged = new Set<number>([...refunded, ...partial]);
  const sorted = [...merged].sort((a, b) => a - b);
  console.log(`Combined (deduped), sorted by id: ${sorted.length} orders`);
  return sorted;
}

function parseNum(value: string | number | null | undefined): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseMoneySet(
  set: { shop_money?: { amount?: string | number | null } } | null | undefined
): number | null {
  return parseNum(set?.shop_money?.amount);
}

type ShopifyLineItem = {
  id?: number;
  sku?: string | null;
  price?: string | number | null;
};

type ShopifyRefundLineItem = {
  line_item_id?: number | null;
  quantity?: number | null;
  subtotal?: string | number | null;
  total_tax?: string | number | null;
  line_item?: ShopifyLineItem | null;
};

type ShopifyRefundShippingLine = {
  subtotal_amount_set?: { shop_money?: { amount?: string | number | null } } | null;
};

type ShopifyOrderAdjustment = {
  kind?: string | null;
  amount?: string | number | null;
  amount_set?: { shop_money?: { amount?: string | number | null } } | null;
};

type ShopifyRefund = {
  id: number;
  order_id: number;
  created_at?: string | null;
  note?: string | null;
  refund_line_items?: ShopifyRefundLineItem[] | null;
  refund_shipping_lines?: ShopifyRefundShippingLine[] | null;
  order_adjustments?: ShopifyOrderAdjustment[] | null;
};

/** Sum of refunded shipping from `refund_shipping_lines`, else legacy `order_adjustments` shipping_refund. */
function computeShippingRefunded(refund: ShopifyRefund): number {
  let sum = 0;
  for (const sl of refund.refund_shipping_lines ?? []) {
    const amt = parseMoneySet(sl.subtotal_amount_set);
    if (amt != null) sum += amt;
  }
  if (sum > 0) return round2(sum);

  for (const adj of refund.order_adjustments ?? []) {
    if (String(adj.kind ?? '').toLowerCase() !== 'shipping_refund') continue;
    const fromSet = parseMoneySet(adj.amount_set);
    if (fromSet != null) sum += fromSet;
    else sum += parseNum(adj.amount) ?? 0;
  }
  return round2(sum);
}

function sumLineSubtotalsAndTax(refund: ShopifyRefund): { linesSubtotal: number; linesTotalTax: number } {
  let linesSubtotal = 0;
  let linesTotalTax = 0;
  for (const rli of refund.refund_line_items ?? []) {
    linesSubtotal += parseNum(rli.subtotal) ?? 0;
    linesTotalTax += parseNum(rli.total_tax) ?? 0;
  }
  return { linesSubtotal: round2(linesSubtotal), linesTotalTax: round2(linesTotalTax) };
}

type RefundLineItemStored = {
  qty: number;
  sku: string | null;
  price: number | null;
  subtotal: number | null;
  total_tax: number | null;
};

function buildRefundLineItemsJson(
  refund: ShopifyRefund,
  skuByLineItemId: Map<number, string | null>
): Json {
  const out: RefundLineItemStored[] = [];
  for (const rli of refund.refund_line_items ?? []) {
    const qty = rli.quantity ?? 0;
    const embeddedSku = rli.line_item?.sku ?? null;
    const lineId = rli.line_item_id != null ? Number(rli.line_item_id) : undefined;
    const sku =
      embeddedSku != null && String(embeddedSku).trim() !== ''
        ? embeddedSku
        : lineId != null
          ? skuByLineItemId.get(lineId) ?? null
          : null;
    const price = parseNum(rli.line_item?.price);
    out.push({
      qty,
      sku,
      price,
      subtotal: parseNum(rli.subtotal),
      total_tax: parseNum(rli.total_tax),
    });
  }
  return out as unknown as Json;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

type RefundsProgressFile = {
  lastOrderIndex: number;
  imported: number;
};

function parseProgressFile(raw: unknown): RefundsProgressFile | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.lastOrderIndex !== 'number' || o.lastOrderIndex < 0) return null;
  if (typeof o.imported !== 'number' || o.imported < 0) return null;
  return { lastOrderIndex: o.lastOrderIndex, imported: o.imported };
}

async function loadProgressFile(): Promise<RefundsProgressFile | null> {
  try {
    const raw = await fs.readFile(PROGRESS_FILE, 'utf8');
    return parseProgressFile(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

async function saveProgressFile(state: RefundsProgressFile): Promise<void> {
  await fs.writeFile(PROGRESS_FILE, JSON.stringify(state, null, 2), 'utf8');
}

async function clearProgressFile(): Promise<void> {
  try {
    await fs.unlink(PROGRESS_FILE);
  } catch {
    /* noop */
  }
}

function refundNeedsSkuFallback(refund: ShopifyRefund): boolean {
  return (refund.refund_line_items ?? []).some((rli) => {
    const embedded = rli.line_item?.sku;
    if (embedded != null && String(embedded).trim() !== '') return false;
    return rli.line_item_id != null;
  });
}

async function main() {
  const reset =
    process.argv.includes('--reset') || String(process.env.REFUNDS_IMPORT_RESET ?? '').trim() === '1';

  if (reset) {
    await clearProgressFile();
    console.log('Progress reset: starting a fresh run.');
  }

  const storeUrl = normalizeStoreUrl(requireEnv('SHOPIFY_STORE_URL'));
  const accessToken =
    process.env.SHOPIFY_ACCESS_TOKEN?.trim() || process.env.SHOPIFY_ADMIN_ACCESS_TOKEN?.trim();
  if (!accessToken) {
    throw new Error('Set SHOPIFY_ACCESS_TOKEN or SHOPIFY_ADMIN_ACCESS_TOKEN');
  }
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const supabaseAdmin = createClient<Database>(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const headers = shopifyHeaders(accessToken);
  const base = `${storeUrl}/admin/api/${API_VERSION}`;

  const saved = await loadProgressFile();
  let lastOrderIndex = saved?.lastOrderIndex ?? 0;
  let imported = saved?.imported ?? 0;

  if (saved) {
    console.log(`Resuming from progress: lastOrderIndex=${lastOrderIndex}, imported=${imported}`);
  }

  const orderIds = await fetchShopifyOrderIdsForRefundsImport(base, headers);
  const total = orderIds.length;
  console.log(`Total orders to process: ${total}`);

  if (lastOrderIndex > total) {
    console.warn(`Progress lastOrderIndex (${lastOrderIndex}) > total (${total}); clamping to 0.`);
    lastOrderIndex = 0;
    imported = 0;
  }

  const pendingRows: Database['public']['Tables']['refunds']['Insert'][] = [];

  async function flushPending(): Promise<void> {
    for (const batch of chunk(pendingRows.splice(0, pendingRows.length), BATCH)) {
      if (batch.length === 0) continue;
      const { error } = await supabaseAdmin.from('refunds').upsert(batch, {
        onConflict: 'shopify_refund_id',
        ignoreDuplicates: false,
      });
      if (error) throw error;
    }
  }

  async function maybeSaveProgress(nextIndex: number): Promise<void> {
    await saveProgressFile({ lastOrderIndex: nextIndex, imported });
  }

  for (let i = lastOrderIndex; i < total; i++) {
    const orderId = orderIds[i];
    console.log(`Order ${i + 1}/${total} — ${imported} refunds upserted`);

    const refUrl = `${base}/orders/${orderId}/refunds.json`;
    const refRes = await shopifyGet(refUrl, headers, `refunds order ${orderId}`);

    if (refRes.status === 503) {
      console.warn(
        `Skipping order ${orderId}: refunds still 503 after ${MAX_503_RETRIES} retries (30s each).`
      );
      const nextIndex = i + 1;
      if (nextIndex % SAVE_PROGRESS_EVERY === 0 || nextIndex === total) {
        await flushPending();
        await maybeSaveProgress(nextIndex);
      }
      if (i < total - 1) await delay(DELAY_BETWEEN_ORDERS_MS);
      continue;
    }

    if (!refRes.ok) {
      const text = await refRes.text();
      throw new Error(`Shopify ${refRes.status} refunds for order ${orderId}: ${text.slice(0, 400)}`);
    }

    const refBody = (await refRes.json()) as { refunds?: ShopifyRefund[] };
    const refunds = refBody.refunds ?? [];

    if (refunds.length > 0) {
      const needSkuFetch = refunds.some((r) => refundNeedsSkuFallback(r));

      let skuByLineItemId = new Map<number, string | null>();
      if (needSkuFetch) {
        const liUrl = `${base}/orders/${orderId}.json?fields=line_items`;
        const liRes = await shopifyGet(liUrl, headers, `line_items order ${orderId}`);

        if (liRes.status === 503) {
          console.warn(
            `Skipping order ${orderId}: line_items 503 after ${MAX_503_RETRIES} retries — refunds not upserted for this order.`
          );
          const nextIndex = i + 1;
          if (nextIndex % SAVE_PROGRESS_EVERY === 0 || nextIndex === total) {
            await flushPending();
            await maybeSaveProgress(nextIndex);
          }
          if (i < total - 1) await delay(DELAY_BETWEEN_ORDERS_MS);
          continue;
        }

        if (!liRes.ok) {
          const text = await liRes.text();
          throw new Error(
            `Shopify ${liRes.status} order ${orderId} line_items: ${text.slice(0, 400)}`
          );
        }

        const liBody = (await liRes.json()) as { order?: { line_items?: ShopifyLineItem[] } };
        const lineItems = liBody.order?.line_items ?? [];
        skuByLineItemId = new Map<number, string | null>();
        for (const li of lineItems) {
          if (li.id != null) skuByLineItemId.set(Number(li.id), li.sku ?? null);
        }
      }

      for (const refund of refunds) {
        const shippingRefunded = computeShippingRefunded(refund);
        const { linesSubtotal, linesTotalTax } = sumLineSubtotalsAndTax(refund);
        pendingRows.push({
          shopify_refund_id: String(refund.id),
          shopify_order_id: String(refund.order_id),
          created_at_shopify: refund.created_at ?? null,
          note: refund.note ?? null,
          refund_line_items: buildRefundLineItemsJson(refund, skuByLineItemId),
          subtotal: linesSubtotal,
          total_tax: linesTotalTax,
          shipping_refunded: shippingRefunded,
          total_refunded: round2(linesSubtotal + shippingRefunded),
        });
        imported += 1;
      }

      if (pendingRows.length >= BATCH) await flushPending();
    }

    const nextIndex = i + 1;
    if (nextIndex % SAVE_PROGRESS_EVERY === 0 || nextIndex === total) {
      await flushPending();
      await maybeSaveProgress(nextIndex);
    }

    if (i < total - 1) await delay(DELAY_BETWEEN_ORDERS_MS);
  }

  await flushPending();
  await clearProgressFile();
  console.log(`Done. ${imported} refunds upserted. Progress file removed.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
