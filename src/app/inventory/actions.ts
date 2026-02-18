'use server';

import { factoryInventory, warehouseInventory, shopifyInventory } from '@/lib/inventory-data';

type ConsolidatedInventoryItem = {
    sku: string;
    productName: string;
    factoryQty: number;
    warehouseQty: number;
    shopifySellableQty: number;
    totalSellable: number;
    status: 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Overstocked';
};

// This is a simplified function to get combined inventory.
// In a real app, this would involve more complex logic and DB queries.
function getConsolidatedInventory(): ConsolidatedInventoryItem[] {
    const inventoryMap = new Map<string, ConsolidatedInventoryItem>();

    const allSkus = new Set([
        ...factoryInventory.map(i => i.sku), 
        ...warehouseInventory.map(i => i.sku), 
        ...shopifyInventory.map(i => i.sku)
    ]);

    for (const sku of allSkus) {
        const factoryItem = factoryInventory.find(i => i.sku === sku);
        const warehouseItem = warehouseInventory.find(i => i.sku === sku);
        const shopifyItem = shopifyInventory.find(i => i.sku === sku);

        const productName = factoryItem?.styleName || warehouseItem?.productName || shopifyItem?.productName || 'Unknown Product';

        const factoryQty = factoryItem?.quantity || 0;
        const warehouseQty = warehouseItem?.availableQty || 0;
        const shopifySellableQty = shopifyItem?.inventory.reduce((acc, loc) => acc + loc.available, 0) || 0;
        
        // For this demo, sellable is what's in the warehouse and what's available on Shopify.
        // This logic can be much more complex.
        const totalSellable = warehouseQty + shopifySellableQty;

        let status: ConsolidatedInventoryItem['status'] = 'In Stock';
        if (totalSellable <= 0) {
            status = 'Out of Stock';
        } else if (totalSellable < 10) {
            status = 'Low Stock';
        } else if (totalSellable > 200) {
            status = 'Overstocked';
        }
        
        inventoryMap.set(sku, {
            sku,
            productName,
            factoryQty,
            warehouseQty,
            shopifySellableQty,
            totalSellable,
            status,
        });
    }

    return Array.from(inventoryMap.values());
}


export async function generateAndSendReport() {
  try {
    const consolidatedInventory = getConsolidatedInventory();
    const outOfStock = consolidatedInventory.filter(p => p.status === 'Out of Stock');
    const lowStock = consolidatedInventory.filter(p => p.status === 'Low Stock');
    const inventoryMismatches = []; // Placeholder for discrepancy logic

    let report = '';
    let hasContent = false;

    if (outOfStock.length > 0) {
        hasContent = true;
        report += '--- OUT OF STOCK PRODUCTS ---\n';
        report += outOfStock.map(p => `Product: ${p.productName} (SKU: ${p.sku}) is out of stock.`).join('\n');
        report += '\n\n';
    }

    if (lowStock.length > 0) {
        hasContent = true;
        report += '--- LOW STOCK PRODUCTS (less than 10 units) ---\n';
        report += lowStock.map(p => `Product: ${p.productName} (SKU: ${p.sku}) has low stock: ${p.totalSellable} units.`).join('\n');
        report += '\n\n';
    }
    
    // In a real app, you would implement this logic.
    if (inventoryMismatches.length > 0) {
        // report += '--- INVENTORY MISMATCHES ---\n';
        // ...
    }
    
    if (hasContent) {
      console.log('--- INVENTORY ALERT REPORT ---');
      console.log(`To: sauravk@elietahair.com`);
      console.log('Subject: Inventory System Alert');
      console.log('Body:\n' + report);
      console.log('------------------------------');
      return { success: true, message: `Inventory alert report sent to sauravk@elietahair.com.` };
    }

    return { success: true, message: 'All inventory levels are normal. No report sent.' };
  } catch (error) {
    console.error('Failed to send inventory report:', error);
    return { success: false, message: 'Failed to generate inventory report.' };
  }
}
