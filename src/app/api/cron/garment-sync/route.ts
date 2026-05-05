import { NextResponse } from 'next/server';
import { syncGarmentDelivery } from '@/lib/garment-sync';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Starting garment delivery sync...`);

    const rowCount = await syncGarmentDelivery();

    console.log(`[${timestamp}] Synced ${rowCount} rows to garment_delivery`);
    return NextResponse.json({ ok: true, synced: rowCount, timestamp });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Garment sync failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
