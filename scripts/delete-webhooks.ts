/**
 * Delete all Shopify Admin API webhooks (REST) for the store.
 *
 * Env:
 *   SHOPIFY_STORE_URL
 *   SHOPIFY_ACCESS_TOKEN (or SHOPIFY_ADMIN_ACCESS_TOKEN)
 *   SHOPIFY_API_VERSION — optional, default 2024-01
 *
 * Run: npm run delete-webhooks
 */

import path from 'path';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: path.join(process.cwd(), '.env') });
loadEnv({ path: path.join(process.cwd(), '.env.local'), override: true });

const API_VERSION = process.env.SHOPIFY_API_VERSION?.trim() || '2024-01';

type ShopifyWebhook = {
  id: number;
  topic: string;
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

async function main(): Promise<void> {
  const storeUrl = normalizeStoreUrl(requireEnv('SHOPIFY_STORE_URL'));
  const accessToken =
    process.env.SHOPIFY_ACCESS_TOKEN?.trim() || process.env.SHOPIFY_ADMIN_ACCESS_TOKEN?.trim();
  if (!accessToken) {
    throw new Error('Set SHOPIFY_ACCESS_TOKEN or SHOPIFY_ADMIN_ACCESS_TOKEN');
  }

  const base = `${storeUrl}/admin/api/${API_VERSION}`;
  const listUrl = `${base}/webhooks.json`;

  const listRes = await fetch(listUrl, { headers: shopifyHeaders(accessToken) });
  const listText = await listRes.text();
  if (!listRes.ok) {
    throw new Error(`GET webhooks failed (${listRes.status}): ${listText.slice(0, 500)}`);
  }

  let parsed: { webhooks?: ShopifyWebhook[] };
  try {
    parsed = JSON.parse(listText) as { webhooks?: ShopifyWebhook[] };
  } catch {
    throw new Error('Invalid JSON from GET webhooks');
  }

  const webhooks = parsed.webhooks ?? [];
  let deleted = 0;

  for (const w of webhooks) {
    const delUrl = `${base}/webhooks/${w.id}.json`;
    try {
      const res = await fetch(delUrl, {
        method: 'DELETE',
        headers: shopifyHeaders(accessToken),
      });
      if (res.ok) {
        deleted++;
        console.log(`✓ Deleted ${w.topic} (id: ${w.id})`);
      } else {
        const errBody = await res.text();
        console.log(`✗ Failed to delete ${w.topic} (id: ${w.id}) — ${res.status}: ${errBody.slice(0, 300)}`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`✗ Failed to delete ${w.topic} (id: ${w.id}) — ${msg}`);
    }
  }

  console.log(`Deleted ${deleted} webhooks`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
