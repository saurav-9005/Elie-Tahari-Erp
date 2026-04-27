DROP FUNCTION IF EXISTS erp_q1_2026_report(int, int, text);

CREATE OR REPLACE FUNCTION erp_q1_2026_report(
  p_page int DEFAULT 1,
  p_page_size int DEFAULT 50,
  p_search text DEFAULT NULL
)
RETURNS json LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path = public AS $$
SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
FROM (
  -- Q1 orders (existing)
  SELECT
    li.shopify_order_id,
    CASE WHEN TRIM(COALESCE(li.source_name,'')) = 'pos'
      THEN 'POS' ELSE 'Online Store' END as sales_channel,
    li.sku as product_variant_sku,
    li.title as product_title,
    COALESCE(li.order_name, '#' || li.shopify_order_id) as order_name,
    li.quantity as qty,
    ROUND(li.price * li.quantity, 2) as gross_sales,
    ROUND(li.pre_tax_price * li.quantity, 2) as net_sales,
    ROUND((li.price - li.pre_tax_price) * li.quantity, 2) as discount,
    COALESCE(ra.amount_returned, 0) as return_amount,
    li.created_at as order_date,
    'sale' as row_type
  FROM q1_2026_line_items li
  LEFT JOIN refunds_by_order_sku ra
    ON ra.shopify_order_id = li.shopify_order_id
    AND ra.sku = li.sku
  WHERE (li.created_at AT TIME ZONE 'America/New_York') >= '2025-12-31'
    AND (li.created_at AT TIME ZONE 'America/New_York') < '2026-04-01'
    AND (p_search IS NULL OR p_search = ''
      OR COALESCE(li.order_name,'#'||li.shopify_order_id)
         ILIKE '%'||p_search||'%'
      OR li.shopify_order_id ILIKE '%'||p_search||'%'
      OR li.sku ILIKE '%'||p_search||'%'
      OR li.title ILIKE '%'||p_search||'%')

  UNION ALL

  -- Returns in Q1 for orders placed BEFORE Q1
  SELECT
    o.shopify_order_id,
    CASE WHEN TRIM(COALESCE(o.source_name,'')) = 'pos'
      THEN 'POS' ELSE 'Online Store' END as sales_channel,
    item->>'sku' as product_variant_sku,
    item->>'title' as product_title,
    COALESCE(o.order_name, '#' || o.shopify_order_id) as order_name,
    0 as qty,
    0 as gross_sales,
    0 as net_sales,
    0 as discount,
    COALESCE(ra2.amount_returned, 0) as return_amount,
    r.created_at_shopify as order_date,
    'return_only' as row_type
  FROM refunds r
  JOIN orders o ON o.shopify_order_id = r.shopify_order_id
  CROSS JOIN LATERAL jsonb_array_elements(
    COALESCE(o.line_items::jsonb, '[]'::jsonb)) AS item
  JOIN refunds_by_order_sku ra2
    ON ra2.shopify_order_id = r.shopify_order_id
    AND ra2.sku = item->>'sku'
  WHERE (r.created_at_shopify AT TIME ZONE 'America/New_York')
      >= '2025-12-31'
    AND (r.created_at_shopify AT TIME ZONE 'America/New_York')
      < '2026-04-01'
    AND (o.created_at AT TIME ZONE 'America/New_York') < '2025-12-31'
    AND item->>'sku' IS NOT NULL
    AND item->>'sku' != ''
    AND (p_search IS NULL OR p_search = ''
      OR COALESCE(o.order_name,'#'||o.shopify_order_id)
         ILIKE '%'||p_search||'%'
      OR o.shopify_order_id ILIKE '%'||p_search||'%'
      OR item->>'sku' ILIKE '%'||p_search||'%'
      OR item->>'title' ILIKE '%'||p_search||'%')

  ORDER BY order_date DESC
  LIMIT p_page_size OFFSET (p_page-1)*p_page_size
) t;
$$;

GRANT EXECUTE ON FUNCTION erp_q1_2026_report(int,int,text)
TO service_role;

NOTIFY pgrst, 'reload schema';
