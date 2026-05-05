-- Customer intelligence analytics: line-item view + RPCs (SECURITY DEFINER).
-- Filters in RPCs: orders.created_at >= NOW() - INTERVAL '2 years'

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS source_name TEXT;

-- Line-level rows for reporting/analytics (used by Q1 report and customer analytics).
CREATE OR REPLACE VIEW public.q1_2026_line_items AS
SELECT
  o.shopify_order_id,
  o.order_name,
  o.customer_email,
  o.created_at,
  LOWER(TRIM(COALESCE(NULLIF(TRIM(o.source_name), ''), NULLIF(TRIM(item->>'source_name'), '')))) AS source_name,
  item->>'sku' AS sku,
  item->>'title' AS title,
  COALESCE((item->>'quantity')::numeric, 0)::numeric AS quantity,
  COALESCE((item->>'price')::numeric, 0)::numeric AS price,
  COALESCE(
    NULLIF(TRIM(item->>'pre_tax_price'), '')::numeric,
    COALESCE((item->>'price')::numeric, 0)
  )::numeric AS pre_tax_price
FROM public.orders o
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(o.line_items::jsonb, '[]'::jsonb)) AS item
WHERE COALESCE(item->>'sku', '') <> '';

CREATE OR REPLACE FUNCTION public.erp_customer_ltv_by_channel()
RETURNS json
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $func$
WITH bounds AS (
  SELECT (now() - interval '2 years') AS t0
),
cust_orders AS (
  SELECT lower(trim(o.customer_email)) AS cust_key,
         o.shopify_order_id,
         o.created_at,
         COALESCE(o.total_price, 0)::numeric AS order_total
  FROM public.orders o, bounds b
  WHERE o.created_at >= b.t0
    AND o.customer_email IS NOT NULL
    AND trim(o.customer_email) <> ''
),
first_order AS (
  SELECT DISTINCT ON (cust_key)
    cust_key,
    shopify_order_id,
    created_at
  FROM cust_orders
  ORDER BY cust_key, created_at ASC, shopify_order_id ASC
),
first_src AS (
  SELECT fo.cust_key,
    COALESCE(
      NULLIF(trim(lower(COALESCE(o.source_name, ''::text))), ''),
      (
        SELECT NULLIF(trim(lower(item2->>'source_name')), '')
        FROM jsonb_array_elements(COALESCE(o.line_items::jsonb, '[]'::jsonb)) AS item2
        LIMIT 1
      )
    ) AS raw_src
  FROM first_order fo
  JOIN public.orders o ON o.shopify_order_id = fo.shopify_order_id
),
ch AS (
  SELECT cust_key,
    CASE
      WHEN raw_src IS NULL OR raw_src = '' THEN NULL::text
      WHEN raw_src IN ('pos', 'point_of_sale', 'point of sale') OR raw_src LIKE '%pos%' THEN 'pos'::text
      WHEN raw_src IN ('shopify_draft_order', 'draft_order', 'draft') OR raw_src LIKE '%draft%' THEN 'shopify_draft_order'::text
      WHEN raw_src IN ('web', 'online_store', 'online store', 'checkout', 'www') THEN 'web'::text
      ELSE NULL::text
    END AS channel
  FROM first_src
),
cust_totals AS (
  SELECT cust_key,
         COUNT(DISTINCT shopify_order_id)::numeric AS order_cnt,
         SUM(order_total)::numeric AS revenue
  FROM cust_orders
  GROUP BY 1
)
SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
FROM (
  SELECT
    COALESCE(ch.channel::text, 'null') AS channel,
    COUNT(*)::bigint AS customers,
    ROUND(AVG(ct.order_cnt), 2)::numeric AS avg_orders,
    ROUND(AVG(ct.revenue), 2)::numeric AS avg_ltv,
    ROUND(SUM(ct.revenue), 2)::numeric AS total_revenue,
    ROUND(AVG(ct.revenue / NULLIF(ct.order_cnt, 0)), 2)::numeric AS avg_order_value
  FROM ch
  JOIN cust_totals ct ON ct.cust_key = ch.cust_key
  GROUP BY ch.channel
  ORDER BY customers DESC
) t;
$func$;

GRANT EXECUTE ON FUNCTION public.erp_customer_ltv_by_channel() TO service_role;

CREATE OR REPLACE FUNCTION public.erp_customer_ltv_by_first_product()
RETURNS json
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $func$
WITH bounds AS (
  SELECT (now() - interval '2 years') AS t0
),
cust_orders AS (
  SELECT lower(trim(o.customer_email)) AS cust_key,
         o.shopify_order_id,
         o.created_at,
         COALESCE(o.total_price, 0)::numeric AS order_total
  FROM public.orders o, bounds b
  WHERE o.created_at >= b.t0
    AND o.customer_email IS NOT NULL
    AND trim(o.customer_email) <> ''
),
first_order AS (
  SELECT DISTINCT ON (cust_key)
    cust_key,
    shopify_order_id,
    created_at
  FROM cust_orders
  ORDER BY cust_key, created_at ASC, shopify_order_id ASC
),
first_line_style AS (
  SELECT DISTINCT ON (fo.cust_key)
    fo.cust_key,
    NULLIF(upper(split_part(COALESCE(t.item->>'sku', ''), '-', 1)), '') AS style
  FROM first_order fo
  JOIN public.orders o ON o.shopify_order_id = fo.shopify_order_id
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(o.line_items::jsonb, '[]'::jsonb))
    WITH ORDINALITY AS t(item, ord)
  WHERE COALESCE(t.item->>'sku', '') <> ''
  ORDER BY fo.cust_key, t.ord ASC
),
cust_totals AS (
  SELECT cust_key,
         COUNT(DISTINCT shopify_order_id)::numeric AS order_cnt,
         SUM(order_total)::numeric AS revenue
  FROM cust_orders
  GROUP BY 1
),
by_style AS (
  SELECT fs.style,
         COUNT(*)::bigint AS customers,
         ROUND(AVG(ct.revenue), 2)::numeric AS avg_ltv,
         ROUND(AVG(ct.order_cnt), 2)::numeric AS avg_orders
  FROM first_line_style fs
  JOIN cust_totals ct ON ct.cust_key = fs.cust_key
  WHERE fs.style IS NOT NULL
  GROUP BY fs.style
),
top20 AS (
  SELECT * FROM by_style ORDER BY customers DESC NULLS LAST LIMIT 20
)
SELECT COALESCE(json_agg(row_to_json(u)), '[]'::json)
FROM (
  SELECT
    top20.style,
    top20.customers,
    top20.avg_ltv,
    top20.avg_orders,
    0::numeric AS return_rate_pct
  FROM top20
  ORDER BY top20.customers DESC
) u;
$func$;

GRANT EXECUTE ON FUNCTION public.erp_customer_ltv_by_first_product() TO service_role;

CREATE OR REPLACE FUNCTION public.erp_customer_segments()
RETURNS json
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $func$
WITH bounds AS (
  SELECT (now() - interval '2 years') AS t0
),
order_disc AS (
  SELECT lower(trim(o.customer_email)) AS cust_key,
         o.shopify_order_id,
         COALESCE(SUM(COALESCE((item->>'total_discount')::numeric, 0)), 0)::numeric AS disc_amt,
         COALESCE(SUM(COALESCE((item->>'price')::numeric, 0) * COALESCE((item->>'quantity')::numeric, 0)), 0)::numeric AS gross_amt
  FROM public.orders o, bounds b
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(o.line_items::jsonb, '[]'::jsonb)) AS item
  WHERE o.created_at >= b.t0
    AND o.customer_email IS NOT NULL
    AND trim(o.customer_email) <> ''
  GROUP BY 1, 2
),
cust_agg AS (
  SELECT o.cust_key,
         COUNT(DISTINCT o.shopify_order_id)::int AS order_count,
         SUM(COALESCE(o.total_price, 0))::numeric AS total_spent,
         AVG(
           CASE WHEN COALESCE(od.gross_amt, 0) > 0 THEN od.disc_amt / od.gross_amt * 100 ELSE 0 END
         )::numeric AS avg_discount_pct
  FROM (
    SELECT lower(trim(o.customer_email)) AS cust_key,
           o.shopify_order_id,
           o.total_price
    FROM public.orders o, bounds b
    WHERE o.created_at >= b.t0
      AND o.customer_email IS NOT NULL
      AND trim(o.customer_email) <> ''
  ) o
  LEFT JOIN order_disc od ON od.cust_key = o.cust_key AND od.shopify_order_id = o.shopify_order_id
  GROUP BY o.cust_key
),
cust_display AS (
  SELECT c.cust_key,
         COALESCE(cu.full_name, initcap(split_part(c.cust_key, '@', 1))) AS customer_name,
         COALESCE(cu.email, c.cust_key) AS email,
         ca.order_count,
         ca.total_spent,
         ROUND(COALESCE(ca.avg_discount_pct, 0), 2)::numeric AS avg_discount_pct,
         CASE
           WHEN ca.total_spent > 500 AND ca.order_count <= 2 THEN 'big_spenders'
           WHEN ca.total_spent <= 300 AND ca.order_count >= 3 THEN 'loyal_browsers'
           WHEN ca.avg_discount_pct > 20 THEN 'promo_hunters'
           WHEN ca.avg_discount_pct < 5 AND ca.order_count >= 2 THEN 'brand_loyalists'
           ELSE 'other'
         END AS segment_key
  FROM (SELECT DISTINCT cust_key FROM cust_agg) c
  LEFT JOIN public.customers cu ON lower(trim(cu.email)) = c.cust_key
  JOIN cust_agg ca ON ca.cust_key = c.cust_key
),
counts AS (
  SELECT segment_key, COUNT(*)::bigint AS cnt
  FROM cust_display
  GROUP BY segment_key
)
SELECT json_build_object(
  'counts', COALESCE((SELECT json_agg(json_build_object('segment_key', segment_key, 'count', cnt)) FROM counts), '[]'::json),
  'rows', COALESCE((SELECT json_agg(row_to_json(x)) FROM (
    SELECT customer_name, email, segment_key, order_count, total_spent, avg_discount_pct
    FROM cust_display
    ORDER BY total_spent DESC NULLS LAST
  ) x), '[]'::json)
)::json;
$func$;

GRANT EXECUTE ON FUNCTION public.erp_customer_segments() TO service_role;

CREATE OR REPLACE FUNCTION public.erp_promotion_impact()
RETURNS json
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $func$
WITH bounds AS (
  SELECT (now() - interval '2 years') AS t0
),
cust_orders AS (
  SELECT lower(trim(o.customer_email)) AS cust_key,
         o.shopify_order_id,
         o.created_at,
         COALESCE(o.total_price, 0)::numeric AS order_total
  FROM public.orders o, bounds b
  WHERE o.created_at >= b.t0
    AND o.customer_email IS NOT NULL
    AND trim(o.customer_email) <> ''
),
first_order AS (
  SELECT DISTINCT ON (cust_key)
    cust_key,
    shopify_order_id,
    created_at
  FROM cust_orders
  ORDER BY cust_key, created_at ASC, shopify_order_id ASC
),
first_disc AS (
  SELECT fo.cust_key,
         COALESCE(SUM(COALESCE((item->>'total_discount')::numeric, 0)), 0)::numeric AS first_order_discount
  FROM first_order fo
  JOIN public.orders o ON o.shopify_order_id = fo.shopify_order_id
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(o.line_items::jsonb, '[]'::jsonb)) AS item
  GROUP BY fo.cust_key
),
cohort AS (
  SELECT fd.cust_key,
         CASE WHEN fd.first_order_discount > 0 THEN 'discount' ELSE 'full_price' END AS cohort
  FROM first_disc fd
),
cust_totals AS (
  SELECT cust_key,
         COUNT(DISTINCT shopify_order_id)::numeric AS order_cnt,
         SUM(order_total)::numeric AS revenue
  FROM cust_orders
  GROUP BY 1
),
order_disc AS (
  SELECT lower(trim(o.customer_email)) AS cust_key,
         o.shopify_order_id,
         COALESCE(SUM(COALESCE((item->>'total_discount')::numeric, 0)), 0)::numeric AS disc_amt,
         COALESCE(SUM(COALESCE((item->>'price')::numeric, 0) * COALESCE((item->>'quantity')::numeric, 0)), 0)::numeric AS gross_amt
  FROM public.orders o, bounds b
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(o.line_items::jsonb, '[]'::jsonb)) AS item
  WHERE o.created_at >= b.t0
    AND o.customer_email IS NOT NULL
    AND trim(o.customer_email) <> ''
  GROUP BY 1, 2
),
cust_avg_disc AS (
  SELECT od.cust_key,
         AVG(CASE WHEN od.gross_amt > 0 THEN od.disc_amt / od.gross_amt * 100 ELSE 0 END)::numeric AS avg_discount_pct
  FROM order_disc od
  GROUP BY 1
),
cohort_metrics AS (
  SELECT c.cohort,
         COUNT(*)::bigint AS customers,
         (COUNT(*) FILTER (WHERE ct.order_cnt > 1))::numeric * 100.0 / NULLIF(COUNT(*), 0) AS repeat_rate_pct,
         AVG(ct.revenue)::numeric AS avg_ltv,
         AVG(ct.order_cnt)::numeric AS avg_orders,
         AVG(COALESCE(cd.avg_discount_pct, 0))::numeric AS avg_discount_pct
  FROM cohort c
  JOIN cust_totals ct ON ct.cust_key = c.cust_key
  LEFT JOIN cust_avg_disc cd ON cd.cust_key = c.cust_key
  GROUP BY c.cohort
),
d AS (
  SELECT
    MAX(cm.repeat_rate_pct) FILTER (WHERE cohort = 'discount') AS disc_rr,
    MAX(cm.repeat_rate_pct) FILTER (WHERE cohort = 'full_price') AS full_rr
  FROM cohort_metrics cm
)
SELECT json_build_object(
  'discount_buyers', (SELECT row_to_json(x) FROM cohort_metrics x WHERE x.cohort = 'discount'),
  'full_price_buyers', (SELECT row_to_json(x) FROM cohort_metrics x WHERE x.cohort = 'full_price'),
  'repeat_rate_delta_pct', (SELECT ROUND(COALESCE(full_rr,0) - COALESCE(disc_rr,0), 2) FROM d)
)::json;
$func$;

GRANT EXECUTE ON FUNCTION public.erp_promotion_impact() TO service_role;

NOTIFY pgrst, 'reload schema';
