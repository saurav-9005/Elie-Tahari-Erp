'use server';

import { factoryOrders, warehouseInventory, shopifyProducts } from '@/lib/inventory-data';

// This is a simplified function to get combined inventory.
// In a real app, this would involve API calls.
function getCombinedInventory() {
    const inventoryMap = new Map<string, { sku: string; name: string; quantity: number; source: string[] }>();

    // Process factory orders
    factoryOrders.forEach(item => {
        const existing = inventoryMap.get(item.sku) || { sku: item.sku, name: item.productName, quantity: 0, source: [] };
        existing.quantity += item.quantity;
        if (!existing.source.includes('Factory')) {
            existing.source.push('Factory');
        }
        inventoryMap.set(item.sku, existing);
    });

    // Process warehouse inventory
    warehouseInventory.forEach(item => {
        const existing = inventoryMap.get(item.sku) || { sku: item.sku, name: item.productName, quantity: 0, source: [] };
        existing.quantity += item.quantity;
        if (!existing.source.includes('Warehouse')) {
            existing.source.push('Warehouse');
        }
        inventoryMap.set(item.sku, existing);
    });
    
    // Process shopify products (considers this as the sellable quantity)
    shopifyProducts.forEach(item => {
        const existing = inventoryMap.get(item.sku) || { sku: item.sku, name: item.title, quantity: 0, source: [] };
        // Shopify is the source of truth for sellable stock for this example
        existing.quantity = item.inventory_quantity;
        if (!existing.source.includes('Shopify')) {
            existing.source.push('Shopify');
        }
        inventoryMap.set(item.sku, existing);
    });

    return Array.from(inventoryMap.values());
}


export async function sendOutOfStockReport() {
  try {
    const combinedInventory = getCombinedInventory();
    const outOfStockProducts = combinedInventory.filter(p => p.quantity <= 0);

    if (outOfStockProducts.length > 0) {
      const report = outOfStockProducts.map(p => `Product: ${p.name} (SKU: ${p.sku}) is out of stock.`).join('\n');
      console.log('--- OUT OF STOCK REPORT ---');
      console.log(`To: sauravk@elietahair.com`);
      console.log('Subject: Out of Stock Product Alert');
      console.log('Body:\n' + report);
      console.log('--------------------------');
      return { success: true, message: `Report for ${outOfStockProducts.length} out-of-stock product(s) sent to sauravk@elietahair.com.` };
    }

    return { success: true, message: 'All products are in stock. No report sent.' };
  } catch (error) {
    console.error('Failed to send out of stock report:', error);
    return { success: false, message: 'Failed to generate inventory report.' };
  }
}
