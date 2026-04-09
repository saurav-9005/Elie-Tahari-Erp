/** Full-report aggregates from `erp_inventory_report_summary`. */
export type InventoryReportSummary = {
  total_skus: number;
  gross_before_july: number;
  gross_after_july: number;
  net_before_july: number;
  net_after_july: number;
  total_discount: number;
};

export type InventoryReportRow = {
  title: string;
  sku: string | null;
  current_stock: number;
  product_created_at: string | null;
  product_type: string | null;
  vendor: string | null;
  qty_before_july: number;
  gross_before_july: number;
  net_before_july: number;
  discount_before_july: number;
  qty_after_july: number;
  gross_after_july: number;
  net_after_july: number;
  discount_after_july: number;
  total_qty: number;
  total_gross: number;
  total_net: number;
  total_discount: number;
};
