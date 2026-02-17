export type FactoryOrder = {
  orderId: string;
  productName: string;
  sku: string;
  quantity: number;
  status: 'In Production' | 'Shipped' | 'Delivered';
};

export const factoryOrders: FactoryOrder[] = [
  { orderId: 'FACT-001', productName: 'A-line Silk Dress', sku: 'CF-DRS-SLK-01', quantity: 50, status: 'In Production' },
  { orderId: 'FACT-002', productName: 'Wool Coat', sku: 'CF-COA-WOL-05', quantity: 100, status: 'Shipped' },
];

export type WarehouseItem = {
  itemId: string;
  productName: string;
  sku: string;
  quantity: number;
  location: string;
};

export const warehouseInventory: WarehouseItem[] = [
  { itemId: 'WH-001', productName: 'A-line Silk Dress', sku: 'CF-DRS-SLK-01', quantity: 20, location: 'A-1-1' },
  { itemId: 'WH-002', productName: 'Floral Print Maxi Skirt', sku: 'CF-SKT-MAX-02', quantity: 30, location: 'A-1-2' },
  { itemId: 'WH-003', productName: 'Cashmere Cardigan', sku: 'CF-CGN-CSH-03', quantity: 15, location: 'B-2-1' },
];

export type ShopifyProduct = {
  id: number;
  title: string;
  sku: string;
  inventory_quantity: number;
};

export const shopifyProducts: ShopifyProduct[] = [
    { id: 1, title: 'A-line Silk Dress', sku: 'CF-DRS-SLK-01', inventory_quantity: 10 },
    { id: 2, title: 'Floral Print Maxi Skirt', sku: 'CF-SKT-MAX-02', inventory_quantity: 5 },
    { id: 3, title: 'Cashmere Cardigan', sku: 'CF-CGN-CSH-03', inventory_quantity: 8 },
    { id: 4, title: 'Leather Clutch', sku: 'CF-ACC-LTH-04', inventory_quantity: 0 },
    { id: 5, title: 'Wool Coat', sku: 'CF-COA-WOL-05', inventory_quantity: 25 },
    { id: 6, title: 'Linen Blouse', sku: 'CF-BLO-LIN-06', inventory_quantity: 2 },
];
