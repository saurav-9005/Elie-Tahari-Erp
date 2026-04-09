import { NextResponse } from 'next/server';
import type { Json } from '@/lib/database.types';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { verifyShopifyWebhookHmac } from '@/lib/shopify/verify-webhook';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  const rawBody = await request.text();
  const hmac = request.headers.get('x-shopify-hmac-sha256');

  if (!secret || !verifyShopifyWebhookHmac(rawBody, hmac, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventType = request.headers.get('x-shopify-topic') || 'unknown';
  const webhookId = request.headers.get('x-shopify-webhook-id');

  try {
    const admin = createServiceRoleClient();
    const { error } = await admin.from('shopify_events').insert({
      shopify_webhook_id: webhookId,
      event_type: eventType,
      raw_payload: json as Json,
      status: 'pending',
    });

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ ok: true, duplicate: true });
      }
      console.error('shopify_events insert', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Server configuration' }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
