-- Dashboard intelligence RPCs (called from Next.js with service role).
-- Bounded to 2026 orders: created_at >= 2026-01-01 UTC AND created_at <= NOW().
-- Row caps before JSONB expansion avoid full-table scans.
-- Run in Supabase SQL Editor or via CLI migration apply.

BEGIN;

CREATE OR REPLACE FUNCTION public.erp_intelligence_geo_by_state()
RETURNS json
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT COALESCE(
    json_agg(row_to_json(t) ORDER BY t.revenue DESC NULLS LAST),
    '[]'::json
  )
  INTO result
  FROM (
    SELECT
      COALESCE(o.shipping_address->>'province', '(unknown)') AS state,
      COALESCE(o.shipping_address->>'province_code', '') AS state_code,
      COUNT(*)::bigint AS orders,
      COALESCE(SUM(o.total_price), 0)::numeric AS revenue
    FROM (
      SELECT id, total_price, status, shipping_address, created_at
      FROM orders
      WHERE created_at >= '2026-01-01T00:00:00.000Z'::timestamptz
        AND created_at <= NOW()
      LIMIT 10000
    ) o
    WHERE lower(trim(coalesce(o.status, ''))) NOT IN ('cancelled', 'canceled', 'voided')
      AND o.shipping_address IS NOT NULL
    GROUP BY 1, 2
    ORDER BY revenue DESC NULLS LAST
    LIMIT 10
  ) t;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.erp_intelligence_geo_top_cities()
RETURNS json
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT COALESCE(
    json_agg(row_to_json(t) ORDER BY t.revenue DESC NULLS LAST),
    '[]'::json
  )
  INTO result
  FROM (
    SELECT
      COALESCE(o.shipping_address->>'city', '(unknown)') AS city,
      COALESCE(SUM(o.total_price), 0)::numeric AS revenue
    FROM (
      SELECT id, total_price, status, shipping_address, created_at
      FROM orders
      WHERE created_at >= '2026-01-01T00:00:00.000Z'::timestamptz
        AND created_at <= NOW()
      LIMIT 10000
    ) o
    WHERE lower(trim(coalesce(o.status, ''))) NOT IN ('cancelled', 'canceled', 'voided')
      AND o.shipping_address IS NOT NULL
    GROUP BY 1
    ORDER BY revenue DESC NULLS LAST
    LIMIT 7
  ) t;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.erp_intelligence_product_top_week()
RETURNS json
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT COALESCE(
    json_agg(row_to_json(t) ORDER BY t.units_sold DESC NULLS LAST),
    '[]'::json
  )
  INTO result
  FROM (
    SELECT
      COALESCE(NULLIF(trim(item->>'title'), ''), '(untitled)') AS product,
      SUM(GREATEST(COALESCE((item->>'quantity')::int, 0), 0))::bigint AS units_sold
    FROM (
      SELECT line_items, created_at
      FROM orders
      WHERE created_at >= '2026-01-01T00:00:00.000Z'::timestamptz
        AND created_at <= NOW()
        AND created_at >= timezone('utc', now()) - interval '7 days'
        AND line_items IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 5000
    ) o,
    LATERAL jsonb_array_elements(
      CASE
        WHEN o.line_items IS NULL THEN '[]'::jsonb
        WHEN jsonb_typeof(o.line_items::jsonb) = 'array' THEN o.line_items::jsonb
        ELSE '[]'::jsonb
      END
    ) AS item
    GROUP BY 1
    ORDER BY units_sold DESC
    LIMIT 5
  ) t;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.erp_intelligence_product_trending()
RETURNS json
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  WITH this_week AS (
    SELECT
      COALESCE(NULLIF(trim(item->>'title'), ''), '(untitled)') AS product,
      SUM(GREATEST(COALESCE((item->>'quantity')::int, 0), 0))::bigint AS units
    FROM (
      SELECT line_items, created_at
      FROM orders
      WHERE created_at >= '2026-01-01T00:00:00.000Z'::timestamptz
        AND created_at <= NOW()
        AND created_at >= timezone('utc', now()) - interval '7 days'
        AND line_items IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 5000
    ) o,
    LATERAL jsonb_array_elements(
      CASE
        WHEN o.line_items IS NULL THEN '[]'::jsonb
        WHEN jsonb_typeof(o.line_items::jsonb) = 'array' THEN o.line_items::jsonb
        ELSE '[]'::jsonb
      END
    ) AS item
    GROUP BY 1
  ),
  last_week AS (
    SELECT
      COALESCE(NULLIF(trim(item->>'title'), ''), '(untitled)') AS product,
      SUM(GREATEST(COALESCE((item->>'quantity')::int, 0), 0))::bigint AS units
    FROM (
      SELECT line_items, created_at
      FROM orders
      WHERE created_at >= '2026-01-01T00:00:00.000Z'::timestamptz
        AND created_at <= NOW()
        AND created_at >= timezone('utc', now()) - interval '14 days'
        AND created_at < timezone('utc', now()) - interval '7 days'
        AND line_items IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 5000
    ) o,
    LATERAL jsonb_array_elements(
      CASE
        WHEN o.line_items IS NULL THEN '[]'::jsonb
        WHEN jsonb_typeof(o.line_items::jsonb) = 'array' THEN o.line_items::jsonb
        ELSE '[]'::jsonb
      END
    ) AS item
    GROUP BY 1
  )
  SELECT COALESCE(
    json_agg(row_to_json(t) ORDER BY t.pct_change DESC NULLS LAST),
    '[]'::json
  )
  INTO result
  FROM (
    SELECT
      tw.product,
      tw.units AS this_week,
      COALESCE(lw.units, 0)::bigint AS last_week,
      CASE
        WHEN lw.units IS NULL OR lw.units = 0 THEN NULL
        ELSE ROUND(((tw.units - lw.units)::numeric / lw.units) * 100)
      END AS pct_change
    FROM this_week tw
    LEFT JOIN last_week lw ON lw.product = tw.product
  ) t
  WHERE t.pct_change IS NOT NULL;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.erp_intelligence_product_never_discounted()
RETURNS json
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT COALESCE(
    json_agg(row_to_json(t) ORDER BY t.units_sold DESC NULLS LAST),
    '[]'::json
  )
  INTO result
  FROM (
    SELECT
      COALESCE(NULLIF(trim(item->>'title'), ''), '(untitled)') AS product,
      SUM(GREATEST(COALESCE((item->>'quantity')::int, 0), 0))::bigint AS units_sold
    FROM (
      SELECT line_items, created_at
      FROM orders
      WHERE created_at >= '2026-01-01T00:00:00.000Z'::timestamptz
        AND created_at <= NOW()
        AND created_at >= timezone('utc', now()) - interval '7 days'
        AND line_items IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 5000
    ) o,
    LATERAL jsonb_array_elements(
      CASE
        WHEN o.line_items IS NULL THEN '[]'::jsonb
        WHEN jsonb_typeof(o.line_items::jsonb) = 'array' THEN o.line_items::jsonb
        ELSE '[]'::jsonb
      END
    ) AS item
    WHERE jsonb_array_length(COALESCE(item->'discount_allocations', '[]'::jsonb)) = 0
    GROUP BY 1
    HAVING SUM(GREATEST(COALESCE((item->>'quantity')::int, 0), 0)) > 0
    ORDER BY units_sold DESC
    LIMIT 8
  ) t;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.erp_intelligence_customer_segments()
RETURNS json
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'vip',
    (
      COUNT(*) FILTER (
        WHERE c.total_spent > 1000
          AND c.total_orders >= 5
      )
    )::bigint,
    'loyal',
    (
      COUNT(*) FILTER (
        WHERE c.total_spent > 300
          AND c.total_orders >= 3
          AND NOT (c.total_spent > 1000 AND c.total_orders >= 5)
      )
    )::bigint,
    'one_time',
    (COUNT(*) FILTER (WHERE c.total_orders = 1))::bigint,
    'at_risk',
    (
      COUNT(*) FILTER (
        WHERE c.total_spent <= 300
          AND c.total_orders < 3
          AND c.total_orders > 1
      )
    )::bigint,
    'new_2026',
    (COUNT(*) FILTER (WHERE c.created_at >= '2026-01-01T00:00:00.000Z'::timestamptz AND c.created_at <= NOW()))::bigint,
    'churned',
    (
      COUNT(*) FILTER (
        WHERE c.total_orders = 0
          OR (c.total_spent = 0 AND c.total_orders <= 1)
      )
    )::bigint
  )
  INTO result
  FROM customers c
  WHERE c.created_at >= '2026-01-01T00:00:00.000Z'::timestamptz
    AND c.created_at <= NOW();
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.erp_intelligence_customer_avg_by_segment()
RETURNS json
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'vip',
    (
      SELECT COALESCE(AVG(c.total_spent / NULLIF(c.total_orders, 0)), 0)::numeric
      FROM customers c
      WHERE c.created_at >= '2026-01-01T00:00:00.000Z'::timestamptz
        AND c.created_at <= NOW()
        AND c.total_spent > 1000
        AND c.total_orders >= 5
    ),
    'loyal',
    (
      SELECT COALESCE(AVG(c.total_spent / NULLIF(c.total_orders, 0)), 0)::numeric
      FROM customers c
      WHERE c.created_at >= '2026-01-01T00:00:00.000Z'::timestamptz
        AND c.created_at <= NOW()
        AND c.total_spent > 300
        AND c.total_orders >= 3
        AND NOT (c.total_spent > 1000 AND c.total_orders >= 5)
    ),
    'at_risk',
    (
      SELECT COALESCE(AVG(c.total_spent / NULLIF(c.total_orders, 0)), 0)::numeric
      FROM customers c
      WHERE c.created_at >= '2026-01-01T00:00:00.000Z'::timestamptz
        AND c.created_at <= NOW()
        AND c.total_spent <= 300
        AND c.total_orders < 3
        AND c.total_orders > 1
    ),
    'one_time',
    (
      SELECT COALESCE(AVG(c.total_spent / NULLIF(c.total_orders, 0)), 0)::numeric
      FROM customers c
      WHERE c.created_at >= '2026-01-01T00:00:00.000Z'::timestamptz
        AND c.created_at <= NOW()
        AND c.total_orders = 1
    )
  )
  INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.erp_intelligence_customer_new_returning()
RETURNS json
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  ms timestamptz;
BEGIN
  ms := date_trunc('month', timezone('utc', now()));
  SELECT json_build_object(
    'this_month_orders',
    (
      SELECT COUNT(*)::bigint
      FROM customers c
      WHERE c.created_at >= ms
        AND c.created_at >= '2026-01-01T00:00:00.000Z'::timestamptz
        AND c.created_at <= NOW()
    ),
    'returning_customers',
    (
      SELECT COUNT(*)::bigint
      FROM customers c
      WHERE c.created_at >= ms
        AND c.created_at >= '2026-01-01T00:00:00.000Z'::timestamptz
        AND c.created_at <= NOW()
        AND c.total_orders > 1
    ),
    'new_customers',
    (
      SELECT COUNT(*)::bigint
      FROM customers c
      WHERE c.created_at >= ms
        AND c.created_at >= '2026-01-01T00:00:00.000Z'::timestamptz
        AND c.created_at <= NOW()
        AND c.total_orders = 1
    )
  )
  INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.erp_intelligence_customer_returning_trend()
RETURNS json
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  this_ms timestamptz;
  last_ms timestamptz;
  this_pct numeric;
  last_pct numeric;
  this_tot bigint;
  last_tot bigint;
  this_ret bigint;
  last_ret bigint;
BEGIN
  this_ms := date_trunc('month', timezone('utc', now()));
  last_ms := this_ms - interval '1 month';

  SELECT COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE total_orders > 1)::bigint
  INTO this_tot, this_ret
  FROM customers
  WHERE created_at >= this_ms
    AND created_at >= '2026-01-01T00:00:00.000Z'::timestamptz
    AND created_at <= NOW();

  SELECT COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE total_orders > 1)::bigint
  INTO last_tot, last_ret
  FROM customers
  WHERE created_at >= last_ms
    AND created_at < this_ms
    AND created_at >= '2026-01-01T00:00:00.000Z'::timestamptz
    AND created_at <= NOW();

  this_pct := CASE WHEN this_tot > 0 THEN ROUND(100.0 * this_ret / this_tot) ELSE NULL END;
  last_pct := CASE WHEN last_tot > 0 THEN ROUND(100.0 * last_ret / last_tot) ELSE NULL END;

  SELECT json_build_object(
    'this_month_returning_pct',
    this_pct,
    'last_month_returning_pct',
    last_pct,
    'delta_pct',
    CASE
      WHEN this_pct IS NOT NULL AND last_pct IS NOT NULL THEN ROUND(this_pct - last_pct)
      ELSE NULL
    END
  )
  INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.erp_intelligence_behavior_hours()
RETURNS json
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT COALESCE(json_agg(cnt ORDER BY hr), '[]'::json)
  INTO result
  FROM (
    SELECT
      gs.hr AS hr,
      COALESCE(s.cnt, 0)::bigint AS cnt
    FROM generate_series(0, 23) AS gs(hr)
    LEFT JOIN (
      SELECT
        EXTRACT(HOUR FROM o.created_at AT TIME ZONE 'UTC')::int AS hr,
        COUNT(*)::bigint AS cnt
      FROM (
        SELECT created_at
        FROM orders
        WHERE created_at >= '2026-01-01T00:00:00.000Z'::timestamptz
          AND created_at <= NOW()
        LIMIT 10000
      ) o
      GROUP BY 1
    ) s ON s.hr = gs.hr
  ) q;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.erp_intelligence_behavior_summary()
RETURNS json
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  WITH orders_2026 AS (
    SELECT id, total_price, created_at
    FROM orders
    WHERE created_at >= '2026-01-01T00:00:00.000Z'::timestamptz
      AND created_at <= NOW()
    LIMIT 10000
  ),
  today AS (
    SELECT
      COUNT(*)::bigint AS orders_today,
      COALESCE(SUM(o.total_price), 0)::numeric AS revenue_today,
      COALESCE(AVG(o.total_price), 0)::numeric AS avg_order_today
    FROM orders_2026 o
    WHERE to_char(o.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')
      = to_char(current_timestamp AT TIME ZONE 'UTC', 'YYYY-MM-DD')
  ),
  week AS (
    SELECT
      COUNT(*)::bigint AS orders_week,
      COALESCE(SUM(o.total_price), 0)::numeric AS revenue_week
    FROM orders_2026 o
    WHERE o.created_at >= date_trunc('week', timezone('utc', now()))
  ),
  avg2026 AS (
    SELECT COALESCE(AVG(o.total_price), 0)::numeric AS avg_order_2026
    FROM orders_2026 o
  ),
  best_day AS (
    SELECT
      CASE EXTRACT(ISODOW FROM timezone('UTC', o.created_at))::int
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
        WHEN 7 THEN 'Sunday'
      END AS day_name,
      COUNT(*)::bigint AS orders,
      COALESCE(SUM(o.total_price), 0)::numeric AS revenue
    FROM orders_2026 o
    GROUP BY EXTRACT(ISODOW FROM timezone('UTC', o.created_at))
    ORDER BY revenue DESC
    LIMIT 1
  )
  SELECT json_build_object(
    'orders_today',
    (SELECT orders_today FROM today),
    'revenue_today',
    (SELECT revenue_today FROM today),
    'avg_order_today',
    (SELECT avg_order_today FROM today),
    'orders_week',
    (SELECT orders_week FROM week),
    'revenue_week',
    (SELECT revenue_week FROM week),
    'avg_order_2026',
    (SELECT avg_order_2026 FROM avg2026),
    'best_day_name',
    (SELECT day_name FROM best_day),
    'best_day_orders',
    (SELECT orders FROM best_day),
    'best_day_revenue',
    (SELECT revenue FROM best_day)
  )
  INTO result;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.erp_intelligence_geo_by_state() TO service_role;
GRANT EXECUTE ON FUNCTION public.erp_intelligence_geo_top_cities() TO service_role;
GRANT EXECUTE ON FUNCTION public.erp_intelligence_product_top_week() TO service_role;
GRANT EXECUTE ON FUNCTION public.erp_intelligence_product_trending() TO service_role;
GRANT EXECUTE ON FUNCTION public.erp_intelligence_product_never_discounted() TO service_role;
GRANT EXECUTE ON FUNCTION public.erp_intelligence_customer_segments() TO service_role;
GRANT EXECUTE ON FUNCTION public.erp_intelligence_customer_avg_by_segment() TO service_role;
GRANT EXECUTE ON FUNCTION public.erp_intelligence_customer_new_returning() TO service_role;
GRANT EXECUTE ON FUNCTION public.erp_intelligence_customer_returning_trend() TO service_role;
GRANT EXECUTE ON FUNCTION public.erp_intelligence_behavior_hours() TO service_role;
GRANT EXECUTE ON FUNCTION public.erp_intelligence_behavior_summary() TO service_role;

COMMIT;
