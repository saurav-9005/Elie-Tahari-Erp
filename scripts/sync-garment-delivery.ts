import 'dotenv/config';
import { syncGarmentDelivery } from '../src/lib/garment-sync';

async function main() {
  const count = await syncGarmentDelivery();
  console.log(`Synced ${count} rows to garment_delivery`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}

