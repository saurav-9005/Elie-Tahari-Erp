export type FactoryInventoryItem = {
  style: string;
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
    style: 'A-line Dress',
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
    style: 'Wool Coat',
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

export type ShopifyInventoryItem = {
  sku: string;
  productName: string;
  inventory: Array<{
    location: 'CLS Warehouse' | 'Retail Store' | '3PL' | 'Preorder' | 'Sample Room';
    available: number;
    committed: number;
    incoming: number;
  }>;
};


export const shopifyInventory: ShopifyInventoryItem[] = [
  {
    sku: 'CF-DRS-SLK-01',
    productName: 'A-line Silk Dress',
    inventory: [
      { location: 'CLS Warehouse', available: 10, committed: 2, incoming: 50 },
      { location: 'Retail Store', available: 5, committed: 1, incoming: 10 },
      { location: 'Preorder', available: 20, committed: 20, incoming: 0 },
    ],
  },
  {
    sku: 'CF-SKT-MAX-02',
    productName: 'Floral Print Maxi Skirt',
    inventory: [
        { location: 'CLS Warehouse', available: 5, committed: 5, incoming: 0 },
        { location: 'Retail Store', available: 10, committed: 2, incoming: 15 },
    ],
  },
  {
    sku: 'CF-CGN-CSH-03',
    productName: 'Cashmere Cardigan',
    inventory: [
        { location: 'CLS Warehouse', available: 8, committed: 0, incoming: 20 },
    ],
  },
  {
    sku: 'CF-ACC-LTH-04',
    productName: 'Leather Clutch',
    inventory: [
        { location: 'CLS Warehouse', available: 0, committed: 0, incoming: 15 },
    ]
  },
  {
    sku: 'CF-COA-WOL-05',
    productName: 'Wool Coat',
    inventory: [
        { location: 'CLS Warehouse', available: 25, committed: 5, incoming: 0 },
        { location: 'Retail Store', available: 10, committed: 0, incoming: 15 },
    ]
  },
  {
    sku: 'CF-BLO-LIN-06',
    productName: 'Linen Blouse',
    inventory: [
        { location: 'CLS Warehouse', available: 2, committed: 2, incoming: 25 },
    ]
  }
];

export type Product = {
    id: string;
    sku: string;
    name: string;
    category: string;
    price: number;
    imagePlaceholderId: string;
}

export const products: Product[] = [
    { id: '1', sku: 'CF-DRS-SLK-01', name: 'A-line Silk Dress', category: 'Dresses', price: 295.00, imagePlaceholderId: 'silk-dress'},
    { id: '2', sku: 'CF-SKT-MAX-02', name: 'Floral Print Maxi Skirt', category: 'Skirts', price: 175.00, imagePlaceholderId: 'maxi-skirt'},
    { id: '3', sku: 'CF-CGN-CSH-03', name: 'Cashmere Cardigan', category: 'Cardigans', price: 350.00, imagePlaceholderId: 'cashmere-cardigan'},
    { id: '4', sku: 'CF-ACC-LTH-04', name: 'Leather Clutch', category: 'Accessories', price: 150.00, imagePlaceholderId: 'leather-clutch'},
    { id: '5', sku: 'CF-COA-WOL-05', name: 'Wool Coat', category: 'Coats', price: 495.00, imagePlaceholderId: 'wool-coat'},
    { id: '6', sku: 'CF-BLO-LIN-06', name: 'Linen Blouse', category: 'Blouses', price: 125.00, imagePlaceholderId: 'linen-blouse'},
    { id: '7', sku: 'CF-BOT-SUE-07', name: 'Ankle Suede Boots', category: 'Shoes', price: 250.00, imagePlaceholderId: 'suede-boots' },
    { id: '8', sku: 'CF-COA-TRN-08', name: 'Classic Trench Coat', category: 'Coats', price: 550.00, imagePlaceholderId: 'trench-coat' },
];
