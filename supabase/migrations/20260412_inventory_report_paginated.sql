-- Paginated detail: { "total": int, "rows": [...] }. Defaults p_page=1, p_page_size=50.

DROP FUNCTION IF EXISTS public.erp_inventory_report_pre_july();
DROP FUNCTION IF EXISTS public.erp_inventory_report_pre_july(integer, integer);

CREATE OR REPLACE FUNCTION public.erp_inventory_report_pre_july(
  p_page int DEFAULT 1,
  p_page_size int DEFAULT 50
)
RETURNS json
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH pre_july_sales AS (
    SELECT
      item->>'title' AS title,
      SUM(COALESCE((item->>'quantity')::numeric, 0)) AS qty,
      SUM(
        COALESCE(NULLIF(trim(item->>'price'), '')::numeric, 0)
        * COALESCE((item->>'quantity')::numeric, 0)
      ) AS gross,
      SUM(COALESCE(NULLIF(trim(item->>'total_discount'), '')::numeric, 0)) AS discount
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
      ) AS gross,
      SUM(COALESCE(NULLIF(trim(item->>'total_discount'), '')::numeric, 0)) AS discount
    FROM orders o,
      LATERAL jsonb_array_elements(COALESCE(o.line_items::jsonb, '[]'::jsonb)) AS item
    WHERE o.created_at >= '2025-07-01'
    GROUP BY item->>'title'
  ),
  base AS (
    SELECT
      i.title,
      i.sku,
      i.quantity AS current_stock,
      i.product_created_at,
      i.product_type,
      i.vendor,
      COALESCE(pre.qty, 0) AS qty_sold_before_july,
      COALESCE(pre.gross, 0) AS gross_before_july,
      COALESCE(pre.gross, 0) - COALESCE(pre.discount, 0) AS net_before_july,
      COALESCE(pre.discount, 0) AS discount_before_july,
      COALESCE(post.qty, 0) AS qty_sold_after_july,
      COALESCE(post.gross, 0) AS gross_after_july,
      COALESCE(post.gross, 0) - COALESCE(post.discount, 0) AS net_after_july,
      COALESCE(post.discount, 0) AS discount_after_july,
      COALESCE(pre.qty, 0) + COALESCE(post.qty, 0) AS total_qty_sold,
      COALESCE(pre.gross, 0) + COALESCE(post.gross, 0) AS total_gross,
      COALESCE(pre.gross, 0) - COALESCE(pre.discount, 0)
        + COALESCE(post.gross, 0) - COALESCE(post.discount, 0) AS total_net,
      COALESCE(pre.discount, 0) + COALESCE(post.discount, 0) AS total_discount
    FROM inventory i
    LEFT JOIN pre_july_sales pre ON pre.title = i.title
    LEFT JOIN post_july_sales post ON post.title = i.title
    WHERE i.product_created_at < '2025-07-01'
  ),
  tot AS (
    SELECT COUNT(*)::int AS c FROM base
  ),
  lim AS (
    SELECT
      GREATEST(COALESCE(p_page, 1), 1) AS pg,
      GREATEST(COALESCE(NULLIF(p_page_size, 0), 50), 1) AS psz
  ),
  paged AS (
    SELECT *
    FROM base
    ORDER BY title
    LIMIT (SELECT psz FROM lim)
    OFFSET (SELECT (pg - 1) * psz FROM lim)
  )
  SELECT json_build_object(
    'total',
    (SELECT c FROM tot),
    'rows',
    COALESCE(
      (SELECT json_agg(row_to_json(p) ORDER BY p.title) FROM paged p),
      '[]'::json
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.erp_inventory_report_pre_july(integer, integer) TO service_role;
