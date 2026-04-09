/** Serializable row for Analytics → Inventory (server → client). */

export type AnalyticsInventoryFlatRow = {
  key: string;
  productName: string;
  sku: string;
  createdAtLabel: string;
  price: number;
  vendor: string;
  channel: string;
  totalAvailable: number;
  netSalesBefore: number;
  netSalesAfter: number;
};
