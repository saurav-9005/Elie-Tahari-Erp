-- Optional pre-aggregated rows for fast CSV export. Leave empty to use erp_inventory_report_pre_july() only.

CREATE TABLE IF NOT EXISTS public.inventory_report_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  sku text,
  product_type text,
  vendor text,
  current_stock integer NOT NULL DEFAULT 0,
  qty_before_july numeric NOT NULL DEFAULT 0,
  gross_before_july numeric NOT NULL DEFAULT 0,
  net_before_july numeric NOT NULL DEFAULT 0,
  discount_before_july numeric NOT NULL DEFAULT 0,
  qty_after_july numeric NOT NULL DEFAULT 0,
  gross_after_july numeric NOT NULL DEFAULT 0,
  net_after_july numeric NOT NULL DEFAULT 0,
  discount_after_july numeric NOT NULL DEFAULT 0,
  total_qty numeric NOT NULL DEFAULT 0,
  total_gross numeric NOT NULL DEFAULT 0,
  total_net numeric NOT NULL DEFAULT 0,
  total_discount numeric NOT NULL DEFAULT 0,
  refreshed_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventory_report_cache_gross_before_idx
  ON public.inventory_report_cache (gross_before_july DESC);

COMMENT ON TABLE public.inventory_report_cache IS
  'Populate via scheduled job for instant exports; /api/erp/inventory-report/export falls back to erp_inventory_report_pre_july when empty or missing.';
