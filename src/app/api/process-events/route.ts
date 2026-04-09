import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { processShopifyEventRow } from '@/lib/erp/process-shopify-event';
import { getServerSession, hasRole } from '@/lib/supabase/session';

export const runtime = 'nodejs';

/**
 * POST /api/process-events
 * - If CRON_SECRET is set, require matching `x-cron-secret` header (manual/curl).
 * - Otherwise allow Supabase-signed-in **admin** (dashboard “Process” button).
 *
 * GET /api/process-events
 * - Vercel Cron: requires `Authorization: Bearer <CRON_SECRET>` (see Vercel cron docs).
 */
async function runProcessEvents() {
  let admin;
  try {
    admin = createServiceRoleClient();
  } catch {
    return NextResponse.json({ error: 'Service role not configured' }, { status: 503 });
  }

  const { data: events, error: fetchError } = await admin
    .from('shopify_events')
    .select('id, event_type, raw_payload')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(25);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  let processed = 0;
  let failed = 0;

  for (const ev of events ?? []) {
    try {
      await processShopifyEventRow(admin, ev.id, ev.event_type, ev.raw_payload);
      await admin
        .from('shopify_events')
        .update({ status: 'processed', processed_at: new Date().toISOString(), error_message: null })
        .eq('id', ev.id);
      await admin.from('sync_logs').insert({
        event_id: ev.id,
        action: ev.event_type,
        success: true,
        error_message: null,
      });
      processed++;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      await admin
        .from('shopify_events')
        .update({
          status: 'failed',
          error_message: message,
          retry_count: 1,
        })
        .eq('id', ev.id);
      await admin.from('sync_logs').insert({
        event_id: ev.id,
        action: ev.event_type,
        success: false,
        error_message: message,
      });
      failed++;
    }
  }

  return NextResponse.json({ processed, failed, batch: events?.length ?? 0 });
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return runProcessEvents();
}

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const session = await getServerSession();
  let authorized = hasRole(session, ['admin']);
  if (!authorized && cronSecret && request.headers.get('x-cron-secret') === cronSecret) {
    authorized = true;
  }

  if (!authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return runProcessEvents();
}
