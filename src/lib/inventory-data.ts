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
  {
    style: 'Cashmere Cardigan',
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
    style: 'Floral Print Maxi Skirt',
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
    style: 'Linen Blouse',
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
    unitsSold: number;
    revenue: number;
}

export const products: Product[] = [
    { id: 'prod-1', sku: 'ET-DRS-VNK-01', name: 'The Collared V-Neck Sheath Dress', category: 'Dresses', price: 475.00, imagePlaceholderId: 'sheath-dress', unitsSold: 52, revenue: 24700 },
    { id: 'prod-2', sku: 'ET-BLZ-RSL-01', name: 'The Ruched Sleeve Blazer', category: 'Blazers', price: 495.00, imagePlaceholderId: 'ruched-blazer', unitsSold: 38, revenue: 18810 },
    { id: 'prod-3', sku: 'ET-PNT-WDL-01', name: 'The Pleated Wide Leg Pant', category: 'Pants', price: 345.00, imagePlaceholderId: 'wide-leg-pant', unitsSold: 75, revenue: 25875 },
    { id: 'prod-4', sku: 'ET-DRS-FLR-01', name: 'The Floral Georgette Maxi Dress', category: 'Dresses', price: 795.00, imagePlaceholderId: 'floral-dress', unitsSold: 25, revenue: 19875 },
    { id: 'prod-5', sku: 'ET-TOP-SLK-01', name: 'The Silk Charmeuse Blouse', category: 'Tops', price: 325.00, imagePlaceholderId: 'silk-blouse', unitsSold: 90, revenue: 29250 },
    { id: 'prod-6', sku: 'ET-SKT-LTH-01', name: 'The Faux Leather Pleated Skirt', category: 'Skirts', price: 375.00, imagePlaceholderId: 'leather-skirt', unitsSold: 42, revenue: 15750 },
    { id: 'prod-7', sku: 'ET-JMP-CFT-01', name: 'The Cuffed V-Neck Jumpsuit', category: 'Jumpsuits', price: 595.00, imagePlaceholderId: 'jumpsuit', unitsSold: 33, revenue: 19635 },
    { id: '8', sku: 'ET-COA-TRN-08', name: 'The Modern Trench Coat', category: 'Coats', price: 695.00, imagePlaceholderId: 'trench-coat', unitsSold: 28, revenue: 19460 },
];
