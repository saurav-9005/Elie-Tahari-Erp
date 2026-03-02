import { shopifyFetch, getProductsQuery } from './shopify-client';

// #region Factory & WMS Mock Data (remains unchanged)
export type FactoryInventoryItem = {
  styleName: string;
  sku: string;
  color: string;
  size: string;
  quantity: number;
  cost: number;
  htsCode: string;
  origin: string;
  poNumber: string;
  productionDate: string;
  productionStatus: 'In Production' | 'Awaiting Shipment' | 'Shipped';
  shippedFromFactory: boolean;
  expectedArrivalDate: string;
};

export const factoryInventory: FactoryInventoryItem[] = [
  {
    styleName: 'A-line Dress',
    sku: 'CF-DRS-SLK-01',
    color: 'Midnight Blue',
    size: 'M',
    quantity: 50,
    cost: 120.0,
    htsCode: '6204.42.00',
    origin: 'Vietnam',
    poNumber: 'PO-2024-001',
    productionDate: '2024-05-15',
    productionStatus: 'Awaiting Shipment',
    shippedFromFactory: false,
    expectedArrivalDate: '2024-07-01',
  },
  {
    styleName: 'Wool Coat',
    sku: 'CF-COA-WOL-05',
    color: 'Camel',
    size: 'L',
    quantity: 100,
    cost: 250.0,
    htsCode: '6201.11.00',
    origin: 'Italy',
    poNumber: 'PO-2024-002',
    productionDate: '2024-04-20',
    productionStatus: 'Shipped',
    shippedFromFactory: true,
    expectedArrivalDate: '2024-06-15',
  },
  {
    styleName: 'Cashmere Cardigan',
    sku: 'CF-CGN-CSH-03',
    color: 'Heather Grey',
    size: 'S',
    quantity: 75,
    cost: 180.0,
    htsCode: '6110.11.00',
    origin: 'China',
    poNumber: 'PO-2024-003',
    productionDate: '2024-06-01',
    productionStatus: 'In Production',
    shippedFromFactory: false,
    expectedArrivalDate: '2024-08-01',
  },
  {
    styleName: 'Floral Print Maxi Skirt',
    sku: 'CF-SKT-MAX-02',
    color: 'Multi',
    size: 'M',
    quantity: 120,
    cost: 85.0,
    htsCode: '6204.53.30',
    origin: 'India',
    poNumber: 'PO-2024-004',
    productionDate: '2024-05-25',
    productionStatus: 'Shipped',
    shippedFromFactory: true,
    expectedArrivalDate: '2024-07-10',
  },
  {
    styleName: 'Linen Blouse',
    sku: 'CF-BLO-LIN-06',
    color: 'White',
    size: 'L',
    quantity: 200,
    cost: 60.0,
    htsCode: '6206.30.00',
    origin: 'Vietnam',
    poNumber: 'PO-2024-005',
    productionDate: '2024-06-10',
    productionStatus: 'Awaiting Shipment',
    shippedFromFactory: false,
    expectedArrivalDate: '2024-07-25',
  },
];

export type WarehouseInventoryItem = {
  sku: string;
  productName: string;
  warehouseLocation: string;
  availableQty: number;
  reservedQty: number;
  damagedQty: number;
  inboundQty: number;
};

export const warehouseInventory: WarehouseInventoryItem[] = [
  {
    sku: 'CF-DRS-SLK-01',
    productName: 'A-line Silk Dress',
    warehouseLocation: 'A-1-1',
    availableQty: 20,
    reservedQty: 5,
    damagedQty: 1,
    inboundQty: 50,
  },
  {
    sku: 'CF-SKT-MAX-02',
    productName: 'Floral Print Maxi Skirt',
    warehouseLocation: 'A-1-2',
    availableQty: 30,
    reservedQty: 10,
    damagedQty: 0,
    inboundQty: 0,
  },
  {
    sku: 'CF-CGN-CSH-03',
    productName: 'Cashmere Cardigan',
    warehouseLocation: 'B-2-1',
    availableQty: 15,
    reservedQty: 0,
    damagedQty: 2,
    inboundQty: 20,
  },
   {
    sku: 'CF-COA-WOL-05',
    productName: 'Wool Coat',
    warehouseLocation: 'C-1-1',
    availableQty: 75,
    reservedQty: 10,
    damagedQty: 3,
    inboundQty: 0,
  },
];
// #endregion


// #region Static Data & Shopify Integration

// The type for a product returned from the Shopify Admin API
type ShopifyProduct = {
    id: string;
    title: string;
    tags: string[];
    featuredImage: {
      url: string;
      altText: string;
    } | null;
    variants: {
      edges: {
        node: {
          id: string;
          sku: string;
          price: string;
        }
      }[]
    }
}

// Local type for app data structure
export type ShopifyInventoryItem = {
  sku: string;
  productName: string;
  inventory: Array<{
    location: string;
    available: number;
    committed: number;
    incoming: number;
  }>;
};

export type Product = {
    id: string;
    sku: string;
    name: string;
    category: string;
    price: number;
    imageUrl: string | null;
};

// Static data that remains for other parts of the app
export const products: Product[] = [
    { id: 'gid://shopify/Product/1', sku: 'CF-DRS-SLK-01', name: 'A-line Silk Dress', category: 'Dresses', price: 250.00, imageUrl: 'https://images.unsplash.com/photo-1629221191319-8a3556108e16?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw1fHxzaGVhdGglMjBkcmVzc3xlbnwwfHx8fDE3NzE5NTQwODV8MA&ixlib=rb-4.1.0&q=80&w=1080' },
    { id: 'gid://shopify/Product/2', sku: 'CF-COA-WOL-05', name: 'Wool Coat', category: 'Coats', price: 450.00, imageUrl: 'https://images.unsplash.com/photo-1573545289441-827c028f7a3b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw2fHx0cmVuY2glMjBjb2F0fGVufDB8fHx8MTc3MTI2Mjc2M3ww&ixlib=rb-4.1.0&q=80&w=1080' },
    { id: 'gid://shopify/Product/3', sku: 'CF-CGN-CSH-03', name: 'Cashmere Cardigan', category: 'Cardigans', price: 320.00, imageUrl: 'https://images.unsplash.com/photo-1621932943339-43c7b738d821?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwyfHxzaWxrJTIwYmxvdXNlfGVufDB8fHx8MTc3MTk1NDI5NHww&ixlib=rb-4.1.0&q=80&w=1080' },
    { id: 'gid://shopify/Product/4', sku: 'CF-SKT-MAX-02', name: 'Floral Print Maxi Skirt', category: 'Skirts', price: 150.00, imageUrl: 'https://images.unsplash.com/photo-1587280429443-0498e7279a94?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwzfHxmbG9yYWwlMjBtYXhpJTIwZHJlc3N8ZW58MHx8fHwxNzcxOTU0MjM0fDA&ixlib=rb-4.1.0&q=80&w=1080' },
    { id: 'gid://shopify/Product/5', sku: 'CF-BLO-LIN-06', name: 'Linen Blouse', category: 'Blouses', price: 120.00, imageUrl: 'https://images.unsplash.com/photo-1621932943339-43c7b738d821?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwyfHxzaWxrJTIwYmxvdXNlfGVufDB8fHx8MTc3MTk1NDI5NHww&ixlib=rb-4.1.0&q=80&w=1080' },
];

export const shopifyInventory: ShopifyInventoryItem[] = [
  {
    sku: 'CF-DRS-SLK-01',
    productName: 'A-line Silk Dress',
    inventory: [
      { location: 'SoHo Flagship', available: 5, committed: 2, incoming: 0 },
      { location: 'Online Store', available: 10, committed: 8, incoming: 20 },
    ],
  },
  {
    sku: 'CF-COA-WOL-05',
    productName: 'Wool Coat',
    inventory: [
      { location: 'SoHo Flagship', available: 8, committed: 1, incoming: 0 },
      { location: 'Online Store', available: 12, committed: 3, incoming: 15 },
    ],
  },
  {
    sku: 'CF-CGN-CSH-03',
    productName: 'Cashmere Cardigan',
    inventory: [
      { location: 'Online Store', available: 25, committed: 5, incoming: 10 },
    ],
  },
   {
    sku: 'CF-SKT-MAX-02',
    productName: 'Floral Print Maxi Skirt',
    inventory: [
      { location: 'SoHo Flagship', available: 0, committed: 1, incoming: 0 },
      { location: 'Online Store', available: 5, committed: 5, incoming: 10 },
    ],
  },
];


/**
 * Fetches products from the Shopify Admin API.
 * @returns {Promise<Product[]>}
 */
export async function getProducts(): Promise<Product[]> {
    const res = await shopifyFetch<{ products: { edges: { node: ShopifyProduct }[] } }>({
        query: getProductsQuery,
        variables: {
        first: 20,
        },
    }, {
        tags: ['products'],
        cache: 'no-store'
    });

    const products = res.products.edges.map(({ node }) => {
        const variant = node.variants.edges[0]?.node;
        return {
            id: node.id,
            name: node.title,
            // Use the first tag as the category, or a default
            category: node.tags[0] || 'Uncategorized',
            price: parseFloat(variant?.price || '0'),
            sku: variant?.sku || 'N/A',
            imageUrl: node.featuredImage?.url || null,
        };
    });

    return products;
}

/**
 * Returns a static list of Shopify inventory items.
 * @returns {Promise<ShopifyInventoryItem[]>}
 */
export async function getShopifyInventory(): Promise<ShopifyInventoryItem[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    return shopifyInventory;
}


export async function getDashboardStats() {
    const shopifyInventoryData = await getShopifyInventory();
    // Using the static products list here for stats calculation
    const productsData = products;
    
    const wmsUnits = warehouseInventory.reduce((sum, item) => sum + item.availableQty, 0);
    const shopifyUnits = shopifyInventoryData.reduce((sum, item) => sum + item.inventory.reduce((locSum, loc) => locSum + loc.available, 0), 0);
    const totalUnits = wmsUnits + shopifyUnits;

    const wmsValue = warehouseInventory.reduce((sum, item) => {
        const product = productsData.find(p => p.sku === item.sku);
        return sum + (item.availableQty * (product?.price || 0));
    }, 0);

    const shopifyValue = shopifyInventoryData.reduce((sum, item) => {
        const product = productsData.find(p => p.sku === item.sku);
        const totalAvailable = item.inventory.reduce((locSum, loc) => locSum + loc.available, 0);
        return sum + (totalAvailable * (product?.price || 0));
    }, 0);
    
    const totalValue = wmsValue + shopifyValue;

    const allSellableSkus = new Map<string, number>();
    warehouseInventory.forEach(item => {
        allSellableSkus.set(item.sku, (allSellableSkus.get(item.sku) || 0) + item.availableQty);
    });
    shopifyInventoryData.forEach(item => {
        const totalAvailable = item.inventory.reduce((locSum, loc) => locSum + loc.available, 0);
        allSellableSkus.set(item.sku, (allSellableSkus.get(item.sku) || 0) + totalAvailable);
    });

    let outOfStockCount = 0;
    let lowStockCount = 0;
    allSellableSkus.forEach(quantity => {
        if (quantity <= 0) {
            outOfStockCount++;
        }
        if (quantity > 0 && quantity < 10) {
            lowStockCount++;
        }
    });

    return {
        totalUnits,
        totalValue,
        outOfStockCount,
        lowStockCount,
    };
}
// #endregion
