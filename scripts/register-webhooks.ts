/**
 * Register Shopify Admin API webhooks (REST).
 *
 * Env:
 *   SHOPIFY_STORE_URL
 *   SHOPIFY_ACCESS_TOKEN (or SHOPIFY_ADMIN_ACCESS_TOKEN)
 *   NEXT_PUBLIC_APP_URL — base URL, e.g. https://xxx.ngrok.io or production URL
 *   SHOPIFY_API_VERSION — optional, default 2024-01
 *
 * Run: npm run register-webhooks
 *
 * Loads `.env` then `.env.local` (local overrides) so NEXT_PUBLIC_APP_URL can live in `.env.local`.
 */

import path from 'path';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: path.join(process.cwd(), '.env') });
loadEnv({ path: path.join(process.cwd(), '.env.local'), override: true });

const API_VERSION = process.env.SHOPIFY_API_VERSION?.trim() || '2024-01';

const TOPICS = [
  'orders/create',
  'orders/updated',
  'orders/cancelled',
  'orders/fulfilled',
  'customers/create',
  'customers/update',
  'products/update',
  'inventory_levels/update',
  'refunds/create',
] as const;

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

  const appUrl = requireEnv('NEXT_PUBLIC_APP_URL').replace(/\/+$/, '');
  const address = `${appUrl}/api/webhooks/shopify`;

  const base = `${storeUrl}/admin/api/${API_VERSION}`;

  console.log(`Webhook callback URL: ${address}\n`);

  for (const topic of TOPICS) {
    const url = `${base}/webhooks.json`;
    const body = JSON.stringify({
      webhook: {
        topic,
        address,
        format: 'json',
      },
    });

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: shopifyHeaders(accessToken),
        body,
      });

      const text = await res.text();
      if (res.ok) {
        console.log(`✓ ${topic} — registered (${res.status})`);
      } else {
        console.log(`✗ ${topic} — failed (${res.status}): ${text.slice(0, 400)}`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`✗ ${topic} — error: ${msg}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
