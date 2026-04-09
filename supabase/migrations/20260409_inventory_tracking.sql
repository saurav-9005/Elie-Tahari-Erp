CREATE OR REPLACE FUNCTION public.erp_inventory_dashboard_stats()
RETURNS json
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $func$
  SELECT json_build_object(
    'total_skus', COUNT(*),
    'in_stock', COUNT(CASE WHEN quantity > 10 THEN 1 END),
    'low_stock', COUNT(CASE WHEN quantity > 0 AND quantity <= 10 THEN 1 END),
    'out_of_stock', COUNT(CASE WHEN quantity = 0 THEN 1 END),
    'oversold', COUNT(CASE WHEN quantity < 0 THEN 1 END),
    'total_units', SUM(CASE WHEN quantity > 0 THEN quantity ELSE 0 END)
  )
  FROM inventory
  WHERE sku IS NOT NULL;
$func$;

GRANT EXECUTE ON FUNCTION public.erp_inventory_dashboard_stats() TO service_role;

CREATE OR REPLACE FUNCTION public.erp_inventory_top_sellers(
  p_page int DEFAULT 1
)
RETURNS json
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $func$
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  FROM (
    SELECT
      item->>'sku' AS sku,
      item->>'title' AS title,
      SUM((item->>'quantity')::numeric) AS units_sold,
      SUM(
        COALESCE(NULLIF(trim(item->>'price'), '')::numeric, 0)
        * COALESCE((item->>'quantity')::numeric, 0)
      ) AS revenue,
      i.quantity AS current_stock
    FROM orders o,
      LATERAL jsonb_array_elements(COALESCE(o.line_items::jsonb, '[]'::jsonb)) AS item
    LEFT JOIN inventory i ON i.sku = item->>'sku'
    WHERE o.created_at >= '2026-01-01'
      AND item->>'sku' IS NOT NULL
      AND item->>'sku' != ''
    GROUP BY item->>'sku', item->>'title', i.quantity
    ORDER BY units_sold DESC
    LIMIT 50 OFFSET (GREATEST(COALESCE(p_page, 1), 1) - 1) * 50
  ) t;
$func$;

GRANT EXECUTE ON FUNCTION public.erp_inventory_top_sellers(int) TO service_role;

CREATE OR REPLACE FUNCTION public.erp_inventory_stock_alerts(
  p_page int DEFAULT 1
)
RETURNS json
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $func$
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  FROM (
    WITH daily_sales AS (
      SELECT
        item->>'sku' AS sku,
        SUM((item->>'quantity')::numeric)
          / GREATEST(
            DATE_PART('day', NOW() - '2026-01-01'::timestamptz),
            1
          ) AS units_per_day
      FROM orders o,
        LATERAL jsonb_array_elements(COALESCE(o.line_items::jsonb, '[]'::jsonb)) AS item
      WHERE o.created_at >= '2026-01-01'
        AND item->>'sku' IS NOT NULL
      GROUP BY item->>'sku'
    )
    SELECT
      i.sku,
      i.title,
      i.quantity AS current_stock,
      ROUND(d.units_per_day::numeric, 1) AS daily_velocity,
      ROUND(i.quantity / NULLIF(d.units_per_day, 0)) AS days_remaining,
      CASE
        WHEN i.quantity / NULLIF(d.units_per_day, 0) < 3 THEN 'critical'
        WHEN i.quantity / NULLIF(d.units_per_day, 0) < 7 THEN 'warning'
        ELSE 'ok'
      END AS alert_level
    FROM inventory i
    JOIN daily_sales d ON d.sku = i.sku
    WHERE i.quantity > 0
      AND i.quantity / NULLIF(d.units_per_day, 0) < 14
    ORDER BY days_remaining ASC
    LIMIT 50 OFFSET (GREATEST(COALESCE(p_page, 1), 1) - 1) * 50
  ) t;
$func$;

GRANT EXECUTE ON FUNCTION public.erp_inventory_stock_alerts(int) TO service_role;

CREATE OR REPLACE FUNCTION public.erp_wms_inventory(
  p_page int DEFAULT 1
)
RETURNS json
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $func$
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  FROM (
    WITH first_orders_2026 AS (
      SELECT
        item->>'sku' AS sku,
        MIN(o.created_at) AS first_order_date,
        SUM((item->>'quantity')::numeric) AS units_sold_2026
      FROM orders o,
        LATERAL jsonb_array_elements(COALESCE(o.line_items::jsonb, '[]'::jsonb)) AS item
      WHERE o.created_at >= '2026-01-01'
        AND item->>'sku' IS NOT NULL
        AND item->>'sku' != ''
      GROUP BY item->>'sku'
    )
    SELECT
      i.sku,
      i.title,
      i.product_type,
      i.vendor,
      f.first_order_date AS first_inventory_date,
      i.quantity AS current_qty,
      COALESCE(f.units_sold_2026, 0) AS units_sold,
      i.quantity + COALESCE(f.units_sold_2026, 0) AS estimated_initial_qty,
      i.last_synced_at,
      CASE
        WHEN i.quantity > 10 THEN 'in_stock'
        WHEN i.quantity > 0 THEN 'low_stock'
        WHEN i.quantity = 0 THEN 'out_of_stock'
        ELSE 'oversold'
      END AS stock_status
    FROM inventory i
    LEFT JOIN first_orders_2026 f ON f.sku = i.sku
    WHERE i.sku IS NOT NULL
      AND i.sku != ''
    ORDER BY f.first_order_date ASC NULLS LAST
    LIMIT 50 OFFSET (GREATEST(COALESCE(p_page, 1), 1) - 1) * 50
  ) t;
$func$;

GRANT EXECUTE ON FUNCTION public.erp_wms_inventory(int) TO service_role;

CREATE OR REPLACE FUNCTION public.erp_shopify_inventory(
  p_page int DEFAULT 1
)
RETURNS json
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $func$
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  FROM (
    WITH sold AS (
      SELECT
        item->>'sku' AS sku,
        item->>'title' AS title,
        SUM((item->>'quantity')::numeric) AS qty_sold,
        SUM(
          COALESCE(NULLIF(trim(item->>'price'), '')::numeric, 0)
          * COALESCE((item->>'quantity')::numeric, 0)
        ) AS gross_sold,
        COUNT(DISTINCT o.id) AS order_count
      FROM orders o,
        LATERAL jsonb_array_elements(COALESCE(o.line_items::jsonb, '[]'::jsonb)) AS item
      WHERE o.created_at >= '2026-01-01'
        AND item->>'sku' IS NOT NULL
        AND item->>'sku' != ''
      GROUP BY item->>'sku', item->>'title'
    ),
    returned AS (
      SELECT
        item->>'sku' AS sku,
        SUM((item->>'quantity')::numeric) AS qty_returned
      FROM shopify_events se,
        LATERAL jsonb_array_elements(COALESCE(se.raw_payload->'refund_line_items', '[]'::jsonb)) AS item
      WHERE se.event_type = 'refunds/create'
        AND se.created_at >= '2026-01-01'
        AND item->>'sku' IS NOT NULL
      GROUP BY item->>'sku'
    )
    SELECT
      s.sku,
      s.title,
      i.product_type,
      i.vendor,
      i.quantity AS current_stock,
      s.qty_sold,
      COALESCE(r.qty_returned, 0) AS qty_returned,
      s.qty_sold - COALESCE(r.qty_returned, 0) AS net_sold,
      ROUND(s.gross_sold::numeric, 2) AS gross_revenue,
      s.order_count,
      CASE
        WHEN s.qty_sold > 0 THEN ROUND(COALESCE(r.qty_returned, 0)::numeric / s.qty_sold::numeric * 100, 1)
        ELSE 0
      END AS return_rate_pct
    FROM sold s
    LEFT JOIN returned r ON r.sku = s.sku
    LEFT JOIN inventory i ON i.sku = s.sku
    ORDER BY s.qty_sold DESC
    LIMIT 50 OFFSET (GREATEST(COALESCE(p_page, 1), 1) - 1) * 50
  ) t;
$func$;

GRANT EXECUTE ON FUNCTION public.erp_shopify_inventory(int) TO service_role;
