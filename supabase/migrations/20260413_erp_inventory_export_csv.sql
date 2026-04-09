-- Full CSV text for inventory report export (reads inventory_report_cache).

CREATE OR REPLACE FUNCTION public.erp_inventory_export_csv()
RETURNS text
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH
  esc AS (
    SELECT
      t.*,
      '"' || replace(coalesce(t.sku::text, ''), '"', '""') || '"' AS q_sku,
      '"' || replace(coalesce(t.title::text, ''), '"', '""') || '"' AS q_title,
      '"' || replace(coalesce(t.product_type::text, ''), '"', '""') || '"' AS q_product_type,
      '"' || replace(coalesce(t.vendor::text, ''), '"', '""') || '"' AS q_vendor,
      '"' || replace(coalesce(t.current_stock::text, ''), '"', '""') || '"' AS q_current_stock,
      '"' || replace(coalesce(t.qty_before_july::text, ''), '"', '""') || '"' AS q_qty_before_july,
      '"' || replace(coalesce(t.gross_before_july::text, ''), '"', '""') || '"' AS q_gross_before_july,
      '"' || replace(coalesce(t.net_before_july::text, ''), '"', '""') || '"' AS q_net_before_july,
      '"' || replace(coalesce(t.discount_before_july::text, ''), '"', '""') || '"' AS q_discount_before_july,
      '"' || replace(coalesce(t.qty_after_july::text, ''), '"', '""') || '"' AS q_qty_after_july,
      '"' || replace(coalesce(t.gross_after_july::text, ''), '"', '""') || '"' AS q_gross_after_july,
      '"' || replace(coalesce(t.net_after_july::text, ''), '"', '""') || '"' AS q_net_after_july,
      '"' || replace(coalesce(t.discount_after_july::text, ''), '"', '""') || '"' AS q_discount_after_july,
      '"' || replace(coalesce(t.total_qty::text, ''), '"', '""') || '"' AS q_total_qty,
      '"' || replace(coalesce(t.total_gross::text, ''), '"', '""') || '"' AS q_total_gross,
      '"' || replace(coalesce(t.total_net::text, ''), '"', '""') || '"' AS q_total_net,
      '"' || replace(coalesce(t.total_discount::text, ''), '"', '""') || '"' AS q_total_discount
    FROM public.inventory_report_cache t
  ),
  lines AS (
    SELECT
      0 AS ord,
      'SKU,Product,Type,Vendor,Current Stock,Qty Before Jul 1,Gross Before Jul 1,Net Before Jul 1,Discount Before,Qty After Jul 1,Gross After Jul 1,Net After Jul 1,Discount After,Total Qty,Total Gross,Total Net,Total Discount'::text AS line
    UNION ALL
    SELECT
      row_number() OVER (ORDER BY e.gross_before_july DESC) AS ord,
      e.q_sku
        || ','
        || e.q_title
        || ','
        || e.q_product_type
        || ','
        || e.q_vendor
        || ','
        || e.q_current_stock
        || ','
        || e.q_qty_before_july
        || ','
        || e.q_gross_before_july
        || ','
        || e.q_net_before_july
        || ','
        || e.q_discount_before_july
        || ','
        || e.q_qty_after_july
        || ','
        || e.q_gross_after_july
        || ','
        || e.q_net_after_july
        || ','
        || e.q_discount_after_july
        || ','
        || e.q_total_qty
        || ','
        || e.q_total_gross
        || ','
        || e.q_total_net
        || ','
        || e.q_total_discount
    FROM esc e
  )
  SELECT string_agg(lines.line, E'\n' ORDER BY lines.ord)
  FROM lines;
$$;

GRANT EXECUTE ON FUNCTION public.erp_inventory_export_csv() TO service_role;
