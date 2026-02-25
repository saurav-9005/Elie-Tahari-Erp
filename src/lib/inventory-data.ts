import { fetchShopifyGraphQL } from './shopify-client';

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


// #region Shopify Data Fetching

// Local types for app data structure
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

// #region GraphQL Response Types
type ShopifyInventoryLevelNode = {
    available: number;
    committed: number;
    incoming: number;
    location: {
        name: string;
    };
};

type ShopifyVariantNode = {
    sku: string;
    price: string;
    inventoryItem: {
        inventoryLevels: {
            nodes: ShopifyInventoryLevelNode[];
        };
    };
};

type ShopifyProductNode = {
    id: string;
    title: string;
    productType: string;
    featuredImage: {
        url: string;
    } | null;
    variants: {
        nodes: ShopifyVariantNode[];
    };
};

type ShopifyProductsResponse = {
    products: {
        nodes: ShopifyProductNode[];
    };
};

// #endregion

// GraphQL query to fetch products, variants, and inventory levels
const SHOPIFY_INVENTORY_QUERY = `
query getProductsWithInventory {
  products(first: 50) {
    nodes {
      id
      title
      productType
      featuredImage {
        url(transform: {maxWidth: 400, maxHeight: 300, crop: CENTER})
      }
      variants(first: 10) {
        nodes {
          sku
          price
          inventoryItem {
            inventoryLevels(first: 10) {
              nodes {
                available
                committed
                incoming
                location {
                  name
                }
              }
            }
          }
        }
      }
    }
  }
}
`;

/**
 * Fetches and transforms product and inventory data from Shopify.
 * @returns {Promise<ShopifyProductNode[]>}
 */
async function fetchAndTransformShopifyData(): Promise<ShopifyProductNode[]> {
    try {
        const response = await fetchShopifyGraphQL<ShopifyProductsResponse>(SHOPIFY_INVENTORY_QUERY);
        return response.products.nodes;
    } catch (e) {
        console.error("Disabling Shopify integration due to fetch error:", e);
        return []; // Return empty array on error to prevent app crash
    }
}

/**
 * Fetches product data from Shopify and maps it to the app's Product type.
 * @returns {Promise<Product[]>}
 */
export async function getProducts(): Promise<Product[]> {
    const shopifyProducts = await fetchAndTransformShopifyData();
    
    return shopifyProducts.map((p): Product => ({
        id: p.id,
        name: p.title,
        // Use first variant for primary SKU and price
        sku: p.variants.nodes[0]?.sku || 'N/A', 
        price: parseFloat(p.variants.nodes[0]?.price || '0'),
        category: p.productType || 'Uncategorized',
        imageUrl: p.featuredImage?.url || null,
    }));
}

/**
 * Fetches inventory data from Shopify and maps it to the app's ShopifyInventoryItem type.
 * This function processes data for products that have at least one variant with a SKU.
 * @returns {Promise<ShopifyInventoryItem[]>}
 */
export async function getShopifyInventory(): Promise<ShopifyInventoryItem[]> {
    const shopifyProducts = await fetchAndTransformShopifyData();

    const inventoryItems: ShopifyInventoryItem[] = [];

    shopifyProducts.forEach(product => {
        product.variants.nodes.forEach(variant => {
            // Only process variants that have a SKU
            if (variant.sku) {
                inventoryItems.push({
                    sku: variant.sku,
                    productName: product.title,
                    inventory: variant.inventoryItem.inventoryLevels.nodes.map(level => ({
                        location: level.location.name,
                        available: level.available,
                        committed: level.committed,
                        incoming: level.incoming,
                    })),
                });
            }
        });
    });

    return inventoryItems;
}


export async function getDashboardStats() {
    const shopifyInventoryData = await getShopifyInventory();
    const productsData = await getProducts();
    
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
