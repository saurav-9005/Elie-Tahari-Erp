
import {
  shopifyFetch,
  getProductsQuery,
  getProductsByCreatedDateQuery,
  getInventoryItemsQuery,
  getOrdersQuery,
  getOrdersLineItemsNetSalesQuery,
  getCustomersQuery,
  getLocationsQuery,
} from './shopify-client';

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

// The type for an inventory item from the new query
type ShopifyInventoryItemNode = {
  sku: string | null;
  inventoryLevels: {
      edges: {
          node: {
              location: {
                  id: string;
              };
              quantities: {
                  name: string;
                  quantity: number;
              }[];
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
    first_inventory_added_at?: string;
    first_inventory_added_qty?: number;
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

// This is now STATIC data, used ONLY for the "First Receipts" demo report.
export const staticShopifyInventory: ShopifyInventoryItem[] = [
  {
    sku: 'CF-DRS-SLK-01',
    productName: 'A-line Silk Dress',
    inventory: [
      { location: 'SoHo Flagship', available: 5, committed: 2, incoming: 0, first_inventory_added_at: '2026-01-15T10:00:00Z', first_inventory_added_qty: 10 },
      { location: 'Online Store', available: 10, committed: 8, incoming: 20, first_inventory_added_at: '2026-01-20T11:30:00Z', first_inventory_added_qty: 30 },
    ],
  },
  {
    sku: 'CF-COA-WOL-05',
    productName: 'Wool Coat',
    inventory: [
      { location: 'SoHo Flagship', available: 8, committed: 1, incoming: 0, first_inventory_added_at: '2026-02-01T09:00:00Z', first_inventory_added_qty: 10 },
      { location: 'Online Store', available: 12, committed: 3, incoming: 15 },
    ],
  },
  {
    sku: 'CF-CGN-CSH-03',
    productName: 'Cashmere Cardigan',
    inventory: [
      { location: 'Online Store', available: 25, committed: 5, incoming: 10, first_inventory_added_at: '2026-02-10T14:00:00Z', first_inventory_added_qty: 20 },
    ],
  },
   {
    sku: 'CF-SKT-MAX-02',
    productName: 'Floral Print Maxi Skirt',
    inventory: [
      { location: 'SoHo Flagship', available: 0, committed: 1, incoming: 0 },
      { location: 'Online Store', available: 5, committed: 5, incoming: 10, first_inventory_added_at: '2026-01-25T16:45:00Z', first_inventory_added_qty: 15 },
    ],
  },
];

async function getLocations(): Promise<Map<string, string>> {
    const res = await shopifyFetch<{ locations: { edges: { node: { id: string } }[] } }>({
        query: getLocationsQuery,
        variables: { first: 50 }
    }, {
        cache: 'no-store',
        tags: ['locations'],
    });
    const locationMap = new Map<string, string>();
    res.locations.edges.forEach(({ node }) => {
        locationMap.set(node.id, node.id);
    });
    return locationMap;
}

/**
 * Fetches products from the Shopify Admin API.
 * @returns {Promise<Product[]>}
 */
export async function getProducts(): Promise<Product[]> {
    const res = await shopifyFetch<{ products: { edges: { node: ShopifyProduct }[] } }>({
        query: getProductsQuery,
        variables: {
        first: 250,
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

/** Shopify Admin search: products created on or after this date (inclusive). Excludes pre-2023 catalog. */
export const LEGACY_PRODUCT_CREATED_FROM = '2023-01-01';

/** Shopify Admin search: products created strictly before this date (UTC date string). */
export const LEGACY_PRODUCT_CREATED_BEFORE = '2025-07-01';

/** Combined product search for Analytics → Inventory (2023+ only, before July 2025). */
export const LEGACY_PRODUCT_ANALYTICS_SHOPIFY_SEARCH = `created_at:>=${LEGACY_PRODUCT_CREATED_FROM} created_at:<${LEGACY_PRODUCT_CREATED_BEFORE}`;

type LegacyShopifyProductNode = {
  id: string;
  createdAt: string;
  title: string;
  handle: string;
  vendor: string | null;
  productType: string | null;
  tags: string[];
  featuredImage: { url: string; altText: string } | null;
  variants: {
    edges: { node: { id: string; sku: string; price: string } }[];
  };
};

export type LegacyProductInventoryAnalytics = {
  productId: string;
  createdAt: string;
  title: string;
  handle: string;
  sku: string;
  price: number;
  imageUrl: string | null;
  productName: string;
  /** Shopify product vendor. */
  vendor: string;
  /** Uses Shopify `productType` as the channel / assortment label. */
  channel: string;
  inventory: ShopifyInventoryItem['inventory'];
};

/**
 * Up to `limit` Shopify products created from `LEGACY_PRODUCT_CREATED_FROM` through before July 1, 2025
 * (oldest first), with live inventory levels.
 */
export async function getLegacyProductsInventoryAnalytics(
  limit = 5
): Promise<LegacyProductInventoryAnalytics[]> {
  const searchQuery = LEGACY_PRODUCT_ANALYTICS_SHOPIFY_SEARCH;
  const fetchFirst = Math.min(50, limit * 10);
  const res = await shopifyFetch<{
    products: { edges: { node: LegacyShopifyProductNode }[] };
  }>(
    {
      query: getProductsByCreatedDateQuery,
      variables: { first: fetchFirst, query: searchQuery },
    },
    { cache: 'no-store', tags: ['analytics-legacy-inventory'] }
  );

  const fromTime = Date.parse(`${LEGACY_PRODUCT_CREATED_FROM}T00:00:00.000Z`);
  const productRows = res.products.edges
    .map(({ node }) => {
      const variant = node.variants.edges[0]?.node;
      const sku = variant?.sku?.trim();
      if (!sku) return null;
      if (Number.isFinite(fromTime) && Date.parse(node.createdAt) < fromTime) return null;
      return {
        productId: node.id,
        createdAt: node.createdAt,
        title: node.title,
        handle: node.handle,
        sku,
        price: parseFloat(variant?.price || '0'),
        imageUrl: node.featuredImage?.url ?? null,
        vendor: (node.vendor ?? '').trim() || '—',
        channel: (node.productType ?? '').trim() || '—',
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .slice(0, limit);

  const allInventory = await getShopifyInventory();
  const bySku = new Map(allInventory.map((item) => [item.sku, item]));

  return productRows.map((row) => {
    const inv = bySku.get(row.sku);
    return {
      ...row,
      productName: inv?.productName ?? row.title,
      inventory: inv?.inventory ?? [],
    };
  });
}

const ORDER_NET_SALES_PAGE_SIZE = 50;
const ORDER_NET_SALES_MAX_PAGES = 40;

/** Max orders loaded per date bucket (before / after cutoff) for net-sales aggregation. */
export const SHOPIFY_ORDER_NET_SALES_CAP_PER_PERIOD =
  ORDER_NET_SALES_PAGE_SIZE * ORDER_NET_SALES_MAX_PAGES;

type OrderNodeNetSales = {
  id: string;
  lineItems: {
    edges: {
      node: {
        sku: string | null;
        quantity: number;
        variant: { sku: string | null } | null;
        discountedTotalSet: { shopMoney: { amount: string; currencyCode: string } };
      };
    }[];
  };
  refunds: {
    refundLineItems: {
      edges: {
        node: {
          subtotalSet: { shopMoney: { amount: string; currencyCode: string } };
          lineItem: {
            sku: string | null;
            variant: { sku: string | null } | null;
          } | null;
        };
      }[];
    };
  }[];
};

function lineItemSku(node: {
  sku: string | null;
  variant: { sku: string | null } | null;
}): string {
  const raw = (node.sku || node.variant?.sku || '').trim();
  return raw;
}

function aggregateNetSalesBySku(
  orders: OrderNodeNetSales[],
  skuSet: Set<string>
): { totals: Map<string, number>; currencyCode: string } {
  const totals = new Map<string, number>();
  let currencyCode = 'USD';

  for (const order of orders) {
    for (const { node: line } of order.lineItems.edges) {
      const sku = lineItemSku(line);
      if (!sku || !skuSet.has(sku)) continue;
      const amt = parseFloat(line.discountedTotalSet.shopMoney.amount);
      if (!Number.isFinite(amt)) continue;
      currencyCode = line.discountedTotalSet.shopMoney.currencyCode || currencyCode;
      totals.set(sku, (totals.get(sku) || 0) + amt);
    }

    for (const refund of order.refunds) {
      for (const { node: rli } of refund.refundLineItems.edges) {
        const li = rli.lineItem;
        if (!li) continue;
        const sku = lineItemSku(li);
        if (!sku || !skuSet.has(sku)) continue;
        const amt = parseFloat(rli.subtotalSet.shopMoney.amount);
        if (!Number.isFinite(amt)) continue;
        currencyCode = rli.subtotalSet.shopMoney.currencyCode || currencyCode;
        totals.set(sku, (totals.get(sku) || 0) - amt);
      }
    }
  }

  return { totals, currencyCode };
}

async function fetchOrdersForNetSalesPeriod(searchQuery: string): Promise<{
  orders: OrderNodeNetSales[];
  /** True if more orders existed but were not fetched (hit page cap). */
  hitPaginationCap: boolean;
}> {
  const orders: OrderNodeNetSales[] = [];
  let after: string | null | undefined;

  for (let page = 0; page < ORDER_NET_SALES_MAX_PAGES; page++) {
    const variables: Record<string, unknown> = {
      first: ORDER_NET_SALES_PAGE_SIZE,
      query: searchQuery,
    };
    if (after) variables.after = after;

    const data = await shopifyFetch<{
      orders: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        edges: { node: OrderNodeNetSales }[];
      };
    }>(
      {
        query: getOrdersLineItemsNetSalesQuery,
        variables,
      },
      { cache: 'no-store', tags: ['order-net-sales'] }
    );

    for (const edge of data.orders.edges) {
      orders.push(edge.node);
    }

    if (!data.orders.pageInfo.hasNextPage || !data.orders.pageInfo.endCursor) {
      return { orders, hitPaginationCap: false };
    }
    after = data.orders.pageInfo.endCursor;
  }

  return { orders, hitPaginationCap: true };
}

export type SkuNetSalesSplit = {
  currencyCode: string;
  /** Net sales (line discounted totals minus refund line subtotals) per SKU, orders with processed_at before cutoff. */
  beforeCutoff: Record<string, number>;
  /** Same, for orders with processed_at on or after cutoff. */
  afterCutoff: Record<string, number>;
  /** Sum of beforeCutoff across the requested SKUs. */
  totalBefore: number;
  /** Sum of afterCutoff across the requested SKUs. */
  totalAfter: number;
  /** Orders loaded for the “before” bucket (used for net sales). */
  ordersLoadedBefore: number;
  /** Orders loaded for the “after” bucket. */
  ordersLoadedAfter: number;
  /** More orders existed before cutoff but were skipped (pagination cap). */
  paginationLimitedBefore: boolean;
  /** More orders existed after cutoff but were skipped. */
  paginationLimitedAfter: boolean;
};

/**
 * Net sales by SKU from the Orders API: sums `discountedTotalSet` per matching line item,
 * subtracts `refundLineItems.subtotalSet` on the same order, bucketed by order `processed_at`
 * vs `cutoffDate` (Shopify search uses store timezone for `processed_at`).
 */
export async function getSkuNetSalesBeforeAndAfterProcessedAt(
  skus: string[],
  cutoffDate: string = LEGACY_PRODUCT_CREATED_BEFORE
): Promise<SkuNetSalesSplit> {
  const unique = [...new Set(skus.map((s) => s.trim()).filter(Boolean))];
  const skuSet = new Set(unique);

  if (skuSet.size === 0) {
    return {
      currencyCode: 'USD',
      beforeCutoff: {},
      afterCutoff: {},
      totalBefore: 0,
      totalAfter: 0,
      ordersLoadedBefore: 0,
      ordersLoadedAfter: 0,
      paginationLimitedBefore: false,
      paginationLimitedAfter: false,
    };
  }

  const beforeQuery = `processed_at:<${cutoffDate}`;
  const afterQuery = `processed_at:>=${cutoffDate}`;

  const [beforeFetch, afterFetch] = await Promise.all([
    fetchOrdersForNetSalesPeriod(beforeQuery),
    fetchOrdersForNetSalesPeriod(afterQuery),
  ]);

  const beforeOrders = beforeFetch.orders;
  const afterOrders = afterFetch.orders;

  const beforeAgg = aggregateNetSalesBySku(beforeOrders, skuSet);
  const afterAgg = aggregateNetSalesBySku(afterOrders, skuSet);

  const currencyCode =
    beforeAgg.currencyCode !== 'USD'
      ? beforeAgg.currencyCode
      : afterAgg.currencyCode;

  const beforeCutoff: Record<string, number> = {};
  const afterCutoff: Record<string, number> = {};
  let totalBefore = 0;
  let totalAfter = 0;

  for (const sku of unique) {
    const b = beforeAgg.totals.get(sku) ?? 0;
    const a = afterAgg.totals.get(sku) ?? 0;
    beforeCutoff[sku] = b;
    afterCutoff[sku] = a;
    totalBefore += b;
    totalAfter += a;
  }

  return {
    currencyCode,
    beforeCutoff,
    afterCutoff,
    totalBefore,
    totalAfter,
    ordersLoadedBefore: beforeOrders.length,
    ordersLoadedAfter: afterOrders.length,
    paginationLimitedBefore: beforeFetch.hitPaginationCap,
    paginationLimitedAfter: afterFetch.hitPaginationCap,
  };
}

/**
 * Fetches LIVE inventory data from the Shopify Admin API.
 * This function now separates concerns: fetches inventory, then fetches products to map names.
 * @returns {Promise<ShopifyInventoryItem[]>}
 */
export async function getShopifyInventory(): Promise<ShopifyInventoryItem[]> {
  const locationsMap = await getLocations();

  const inventoryRes = await shopifyFetch<{ inventoryItems: { edges: { node: ShopifyInventoryItemNode }[] } }>({
    query: getInventoryItemsQuery,
    variables: {
        first: 250,
    },
  }, {
      cache: 'no-store',
      tags: ['inventory'],
  });

  const allProducts = await getProducts();
  const productMap = new Map(allProducts.map(p => [p.sku, p.name]));

  const inventoryItems: ShopifyInventoryItem[] = inventoryRes.inventoryItems.edges
    .filter(({ node }) => node.sku && node.inventoryLevels.edges.length > 0)
    .map(({ node }) => {
      const inventory: ShopifyInventoryItem['inventory'] = node.inventoryLevels.edges.map((levelEdge) => {
          const getQuantity = (name: string) => levelEdge.node.quantities?.find(q => q.name === name)?.quantity ?? 0;
          
          const locationName = locationsMap.get(levelEdge.node.location.id) || 'Unknown Location ID';

          return {
            location: locationName,
            available: getQuantity('available'),
            committed: getQuantity('committed'),
            incoming: getQuantity('incoming'),
          }
      });

      return {
          sku: node.sku!,
          productName: productMap.get(node.sku!) || node.sku!,
          inventory,
      };
  });
  
  return inventoryItems;
}

// #region Orders
export type ShopifyOrder = {
  id: string;
  name: string; // The order number like #1001
  createdAt: string;
  displayFinancialStatus: 'PAID' | 'PENDING' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'VOIDED' | 'AUTHORIZED';
  displayFulfillmentStatus: 'FULFILLED' | 'UNFULFILLED' | 'PARTIALLY_FULFILLED' | 'RESTOCKED';
  totalPriceSet: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    }
  };
  customer: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
}

export type Order = {
  id: string;
  orderNumber: string;
  orderId: string;
  date: string;
  customerName: string;
  customerEmail: string;
  total: number;
  currency: string;
  financialStatus: ShopifyOrder['displayFinancialStatus'];
  fulfillmentStatus: ShopifyOrder['displayFulfillmentStatus'];
}

export async function getOrders(): Promise<Order[]> {
  const res = await shopifyFetch<{ orders: { edges: { node: ShopifyOrder }[] } }>({
    query: getOrdersQuery,
    variables: {
      first: 20, // Fetching more orders
    },
  }, {
    cache: 'no-store',
    tags: ['orders'],
  });

  return res.orders.edges.map(({ node }) => ({
    id: node.id,
    orderNumber: node.name,
    orderId: node.id.split('/').pop()!,
    date: node.createdAt,
    customerName: [node.customer?.firstName, node.customer?.lastName].filter(Boolean).join(' ') || 'N/A',
    customerEmail: node.customer?.email || 'N/A',
    total: parseFloat(node.totalPriceSet.shopMoney.amount),
    currency: node.totalPriceSet.shopMoney.currencyCode,
    financialStatus: node.displayFinancialStatus,
    fulfillmentStatus: node.displayFulfillmentStatus,
  }));
}
// #endregion

// #region Customers
export type ShopifyCustomer = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  numberOfOrders: string | number;
  amountSpent: {
    amount: string;
    currencyCode: string;
  };
  defaultAddress: {
    city: string | null;
    province: string | null;
    country: string | null;
  } | null;
}

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  orderCount: number;
  totalSpent: number;
  currency: string;
}

export async function getCustomers(): Promise<Customer[]> {
  const res = await shopifyFetch<{ customers: { edges: { node: ShopifyCustomer }[] } }>({
    query: getCustomersQuery,
    variables: {
      first: 20,
    },
  }, {
    cache: 'no-store',
    tags: ['customers'],
  });

  return res.customers.edges.map(({ node }) => {
    const spent = parseFloat(node.amountSpent.amount);
    return {
      id: node.id,
      name: [node.firstName, node.lastName].filter(Boolean).join(' ') || 'Unnamed Customer',
      email: node.email || 'No email',
      phone: node.phone || 'No phone',
      location: [node.defaultAddress?.city, node.defaultAddress?.province, node.defaultAddress?.country]
        .filter(Boolean)
        .join(', ') || 'No address',
      orderCount: Number(node.numberOfOrders) || 0,
      totalSpent: Number.isFinite(spent) ? spent : 0,
      currency: node.amountSpent.currencyCode || 'USD',
    };
  });
}
// #endregion


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
