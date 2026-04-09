-- Inventory: Shopify product metadata + pre/post July 2025 sales report RPC

ALTER TABLE inventory
ADD COLUMN IF NOT EXISTS product_created_at TIMESTAMPTZ;

ALTER TABLE inventory
ADD COLUMN IF NOT EXISTS product_type TEXT;

ALTER TABLE inventory
ADD COLUMN IF NOT EXISTS vendor TEXT;

ALTER TABLE inventory
ADD COLUMN IF NOT EXISTS product_status TEXT;

CREATE OR REPLACE FUNCTION public.erp_inventory_report_pre_july()
RETURNS json
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    json_agg(row_to_json(t) ORDER BY t.title),
    '[]'::json
  )
  FROM (
    WITH pre_july_sales AS (
      SELECT
        item->>'title' AS title,
        SUM(COALESCE((item->>'quantity')::numeric, 0)) AS qty,
        SUM(
          COALESCE(NULLIF(trim(item->>'price'), '')::numeric, 0)
          * COALESCE((item->>'quantity')::numeric, 0)
        ) AS revenue
      FROM orders o,
        LATERAL jsonb_array_elements(COALESCE(o.line_items::jsonb, '[]'::jsonb)) AS item
      WHERE o.created_at < '2025-07-01'
      GROUP BY item->>'title'
    ),
    post_july_sales AS (
      SELECT
        item->>'title' AS title,
        SUM(COALESCE((item->>'quantity')::numeric, 0)) AS qty,
        SUM(
          COALESCE(NULLIF(trim(item->>'price'), '')::numeric, 0)
          * COALESCE((item->>'quantity')::numeric, 0)
        ) AS revenue
      FROM orders o,
        LATERAL jsonb_array_elements(COALESCE(o.line_items::jsonb, '[]'::jsonb)) AS item
      WHERE o.created_at >= '2025-07-01'
      GROUP BY item->>'title'
    )
    SELECT
      i.title,
      i.sku,
      i.quantity AS current_stock,
      i.product_created_at,
      i.product_type,
      i.vendor,
      COALESCE(pre.qty, 0) AS qty_sold_before_july,
      COALESCE(pre.revenue, 0) AS revenue_before_july,
      COALESCE(post.qty, 0) AS qty_sold_after_july,
      COALESCE(post.revenue, 0) AS revenue_after_july,
      COALESCE(pre.qty, 0) + COALESCE(post.qty, 0) AS total_qty_sold,
      COALESCE(pre.revenue, 0) + COALESCE(post.revenue, 0) AS total_revenue
    FROM inventory i
    LEFT JOIN pre_july_sales pre ON pre.title = i.title
    LEFT JOIN post_july_sales post ON post.title = i.title
    WHERE i.product_created_at < '2025-07-01'
  ) t;
$$;

GRANT EXECUTE ON FUNCTION public.erp_inventory_report_pre_july() TO service_role;
