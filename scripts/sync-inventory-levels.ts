import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const API_VERSION = '2024-01';
const BATCH_SIZE = 500;

type Location = {
  id: number;
  name: string;
};

type ProductVariant = {
  id?: number;
  sku?: string | null;
  inventory_item_id?: number;
};

type Product = {
  variants?: ProductVariant[];
};

type InventoryLevel = {
  inventory_item_id?: number;
  location_id?: number;
  available?: number | null;
};

type VariantMapValue = {
  shopify_variant_id: string;
  sku: string;
};

type InventoryLevelRow = {
  shopify_variant_id: string;
  shopify_inventory_item_id: string;
  sku: string;
  location_id: string;
  location_name: string;
  quantity: number;
  last_synced_at: string;
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function requiredEnv(name: string): string {
  return process.env[name]?.trim() ?? '';
}

function parseNextPageUrl(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  for (const segment of linkHeader.split(',')) {
    const match = segment.trim().match(/<([^>]+)>;\s*rel="?next"?/i);
    if (match?.[1]) return match[1];
  }
  return null;
}

function normalizeStoreDomain(raw: string): string {
  const stripped = raw.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  return stripped;
}

async function fetchWithRetry(url: string, token: string): Promise<Response> {
  for (;;) {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
    });
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get('Retry-After') ?? '2');
      await sleep((Number.isFinite(retryAfter) ? retryAfter : 2) * 1000);
      continue;
    }
    return res;
  }
}

async function fetchAllLocations(baseUrl: string, token: string): Promise<Location[]> {
  const url = `${baseUrl}/locations.json`;
  const res = await fetchWithRetry(url, token);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Shopify locations fetch failed (${res.status}): ${body.slice(0, 500)}`);
  }
  const json = (await res.json()) as { locations?: Array<{ id?: number; name?: string | null }> };
  return (json.locations ?? [])
    .filter((loc): loc is { id: number; name: string } => Number.isFinite(loc.id) && Boolean(loc.name))
    .map((loc) => ({ id: loc.id, name: loc.name }));
}

async function fetchAllProducts(baseUrl: string, token: string): Promise<Product[]> {
  let url: string | null = `${baseUrl}/products.json?limit=250&fields=id,variants`;
  const allProducts: Product[] = [];
  const seen = new Set<string>();

  while (url) {
    if (seen.has(url)) {
      throw new Error(`Pagination loop detected for products: ${url.slice(0, 120)}...`);
    }
    seen.add(url);

    const res = await fetchWithRetry(url, token);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Shopify products fetch failed (${res.status}): ${body.slice(0, 500)}`);
    }

    const json = (await res.json()) as { products?: Product[] };
    allProducts.push(...(json.products ?? []));
    url = parseNextPageUrl(res.headers.get('link'));
  }

  return allProducts;
}

async function fetchInventoryLevelsForLocation(
  baseUrl: string,
  token: string,
  locationId: number
): Promise<InventoryLevel[]> {
  let url: string | null = `${baseUrl}/inventory_levels.json?location_ids=${locationId}&limit=250`;
  const allLevels: InventoryLevel[] = [];
  const seen = new Set<string>();

  while (url) {
    if (seen.has(url)) {
      throw new Error(`Pagination loop detected for inventory levels: ${url.slice(0, 120)}...`);
    }
    seen.add(url);

    const res = await fetchWithRetry(url, token);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Shopify inventory levels fetch failed (${res.status}): ${body.slice(0, 500)}`);
    }

    const json = (await res.json()) as { inventory_levels?: InventoryLevel[] };
    allLevels.push(...(json.inventory_levels ?? []));
    url = parseNextPageUrl(res.headers.get('link'));
  }

  return allLevels;
}

function buildVariantMap(products: Product[]): Map<string, VariantMapValue> {
  const variantMap = new Map<string, VariantMapValue>();
  for (const product of products) {
    for (const variant of product.variants ?? []) {
      if (!variant.inventory_item_id || !variant.id) continue;
      const sku = String(variant.sku ?? '').trim();
      variantMap.set(String(variant.inventory_item_id), {
        shopify_variant_id: String(variant.id),
        sku,
      });
    }
  }
  return variantMap;
}

async function main() {
  const envKeys = [
    'SHOPIFY_STORE_URL',
    'SHOPIFY_ADMIN_ACCESS_TOKEN',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ] as const;
  const missing = envKeys.filter((key) => !requiredEnv(key));
  if (missing.length > 0) {
    console.error(`Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }

  const storeDomain = normalizeStoreDomain(requiredEnv('SHOPIFY_STORE_URL'));
  const token = requiredEnv('SHOPIFY_ADMIN_ACCESS_TOKEN');
  const supabaseUrl = requiredEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRole = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  const baseUrl = `https://${storeDomain}/admin/api/${API_VERSION}`;

  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const locations = await fetchAllLocations(baseUrl, token);
  console.log(`Found ${locations.length} locations`);

  const products = await fetchAllProducts(baseUrl, token);
  const variantMap = buildVariantMap(products);

  const parsedRows: InventoryLevelRow[] = [];
  for (let i = 0; i < locations.length; i += 1) {
    const location = locations[i];
    const levels = await fetchInventoryLevelsForLocation(baseUrl, token, location.id);

    for (const level of levels) {
      const inventoryItemId = level.inventory_item_id != null ? String(level.inventory_item_id) : '';
      if (!inventoryItemId) continue;
      const variant = variantMap.get(inventoryItemId);
      if (!variant) continue;
      const sku = variant?.sku?.trim() ?? '';
      if (!sku) continue;

      parsedRows.push({
        shopify_variant_id: variant.shopify_variant_id,
        shopify_inventory_item_id: inventoryItemId,
        sku,
        location_id: String(location.id),
        location_name: location.name,
        quantity: Number(level.available ?? 0),
        last_synced_at: new Date().toISOString(),
      });
    }

    if (i < locations.length - 1) {
      await sleep(500);
    }
  }

  if (parsedRows.length === 0) {
    console.log('0 rows parsed. Exiting without touching DB.');
    return;
  }

  const { error: clearError } = await supabase
    .from('inventory_levels')
    .delete()
    .or('shopify_inventory_item_id.is.null,shopify_inventory_item_id.not.is.null');

  if (clearError) {
    console.error(`Failed to truncate inventory_levels: ${clearError.message}`);
    process.exit(1);
  }

  let inserted = 0;
  for (let i = 0; i < parsedRows.length; i += BATCH_SIZE) {
    const batch = parsedRows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('inventory_levels').insert(batch);
    if (error) {
      console.error(`Insert error on batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
      continue;
    }
    inserted += batch.length;
  }

  console.log(`Synced ${inserted} inventory level rows across ${locations.length} locations`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
