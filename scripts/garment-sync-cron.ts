import 'dotenv/config';
import { syncGarmentDelivery } from './sync-garment-delivery';

const INTERVAL_MS = 30 * 60 * 1000;

function timestamp(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

async function runOnce() {
  console.log(`[${timestamp()}] Starting garment delivery sync...`);
  try {
    const count = await syncGarmentDelivery();
    console.log(`[${timestamp()}] Synced ${count} rows to garment_delivery`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${timestamp()}] Sync failed: ${message}`);
  }
}

void runOnce();
setInterval(() => {
  void runOnce();
}, INTERVAL_MS);

