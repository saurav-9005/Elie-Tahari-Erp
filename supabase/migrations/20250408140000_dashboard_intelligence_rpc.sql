-- Dashboard intelligence RPCs (called from Next.js with service role).
-- All order-based analytics are bounded at 2026-01-01 UTC.

BEGIN;

CREATE OR REPLACE FUNCTION public.erp_intelligence_geo_by_state()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    json_agg(row_to_json(t) ORDER BY t.revenue DESC NULLS LAST),
    '[]'::json
  )
  FROM (
    SELECT
      COALESCE(o.shipping_address->>'province', '(unknown)') AS state,
      COALESCE(o.shipping_address->>'province_code', '') AS state_code,
      COUNT(*)::bigint AS orders,
      COALESCE(SUM(o.total_price), 0)::numeric AS revenue
    FROM orders o
    WHERE o.created_at >= '2026-01-01T00:00:00.000Z'::timestamptz
      AND lower(trim(coalesce(o.status, ''))) NOT IN ('cancelled', 'canceled', 'voided')
      AND o.shipping_address IS NOT NULL
    GROUP BY 1, 2
    ORDER BY revenue DESC NULLS LAST
    LIMIT 10
  ) t;
$$;

CREATE OR REPLACE FUNCTION public.erp_intelligence_geo_top_cities()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    json_agg(row_to_json(t) ORDER BY t.revenue DESC NULLS LAST),
    '[]'::json
  )
  FROM (
    SELECT
      COALESCE(o.shipping_address->>'city', '(unknown)') AS city,
      COALESCE(SUM(o.total_price), 0)::numeric AS revenue
    FROM orders o
    WHERE o.created_at >= '2026-01-01T00:00:00.000Z'::timestamptz
      AND lower(trim(coalesce(o.status, ''))) NOT IN ('cancelled', 'canceled', 'voided')
      AND o.shipping_address IS NOT NULL
    GROUP BY 1
    ORDER BY revenue DESC NULLS LAST
    LIMIT 7
  ) t;
$$;

CREATE OR REPLACE FUNCTION public.erp_intelligence_product_top_week()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    json_agg(row_to_json(t) ORDER BY t.units_sold DESC NULLS LAST),
    '[]'::json
  )
  FROM (
    SELECT
      COALESCE(NULLIF(trim(item->>'title'), ''), '(untitled)') AS product,
      SUM(GREATEST(COALESCE((item->>'quantity')::int, 0), 0))::bigint AS units_sold
    FROM orders o,
    LATERAL jsonb_array_elements(
      CASE
        WHEN o.line_items IS NULL THEN '[]'::jsonb
        WHEN jsonb_typeof(o.line_items::jsonb) = 'array' THEN o.line_items::jsonb
        ELSE '[]'::jsonb
      END
    ) AS item
    WHERE o.created_at >= timezone('utc', now()) - interval '7 days'
      AND o.created_at >= '2026-01-01T00:00:00.000Z'::timestamptz
      AND o.line_items IS NOT NULL
    GROUP BY 1
    ORDER BY units_sold DESC
    LIMIT 5
  ) t;
$$;

CREATE OR REPLACE FUNCTION public.erp_intelligence_product_trending()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH this_week AS (
    SELECT
      COALESCE(NULLIF(trim(item->>'title'), ''), '(untitled)') AS product,
      SUM(GREATEST(COALESCE((item->>'quantity')::int, 0), 0))::bigint AS units
    FROM orders o,
    LATERAL jsonb_array_elements(
      CASE
        WHEN o.line_items IS NULL THEN '[]'::jsonb
        WHEN jsonb_typeof(o.line_items::jsonb) = 'array' THEN o.line_items::jsonb
        ELSE '[]'::jsonb
      END
    ) AS item
    WHERE o.created_at >= timezone('utc', now()) - interval '7 days'
      AND o.created_at >= '2026-01-01T00:00:00.000Z'::timestamptz
      AND o.line_items IS NOT NULL
    GROUP BY 1
  ),
  last_week AS (
    SELECT
      COALESCE(NULLIF(trim(item->>'title'), ''), '(untitled)') AS product,
      SUM(GREATEST(COALESCE((item->>'quantity')::int, 0), 0))::bigint AS units
    FROM orders o,
    LATERAL jsonb_array_elements(
      CASE
        WHEN o.line_items IS NULL THEN '[]'::jsonb
        WHEN jsonb_typeof(o.line_items::jsonb) = 'array' THEN o.line_items::jsonb
        ELSE '[]'::jsonb
      END
    ) AS item
    WHERE o.created_at >= timezone('utc', now()) - interval '14 days'
      AND o.created_at < timezone('utc', now()) - interval '7 days'
      AND o.created_at >= '2026-01-01T00:00:00.000Z'::timestamptz
      AND o.line_items IS NOT NULL
    GROUP BY 1
  )
  SELECT COALESCE(
    json_agg(row_to_json(t) ORDER BY t.pct_change DESC NULLS LAST),
    '[]'::json
  )
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
$$;

CREATE OR REPLACE FUNCTION public.erp_intelligence_product_never_discounted()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    json_agg(row_to_json(t) ORDER BY t.units_sold DESC NULLS LAST),
    '[]'::json
  )
  FROM (
    SELECT
      COALESCE(NULLIF(trim(item->>'title'), ''), '(untitled)') AS product,
      SUM(GREATEST(COALESCE((item->>'quantity')::int, 0), 0))::bigint AS units_sold
    FROM orders o,
    LATERAL jsonb_array_elements(
      CASE
        WHEN o.line_items IS NULL THEN '[]'::jsonb
        WHEN jsonb_typeof(o.line_items::jsonb) = 'array' THEN o.line_items::jsonb
        ELSE '[]'::jsonb
      END
    ) AS item
    WHERE o.created_at >= timezone('utc', now()) - interval '7 days'
      AND o.created_at >= '2026-01-01T00:00:00.000Z'::timestamptz
      AND o.line_items IS NOT NULL
      AND jsonb_array_length(COALESCE(item->'discount_allocations', '[]'::jsonb)) = 0
    GROUP BY 1
    HAVING SUM(GREATEST(COALESCE((item->>'quantity')::int, 0), 0)) > 0
    ORDER BY units_sold DESC
    LIMIT 8
  ) t;
$$;

CREATE OR REPLACE FUNCTION public.erp_intelligence_customer_segments()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    (COUNT(*) FILTER (WHERE c.created_at >= '2026-01-01T00:00:00.000Z'::timestamptz))::bigint,
    'churned',
    (
      COUNT(*) FILTER (
        WHERE c.total_orders = 0
          OR (c.total_spent = 0 AND c.total_orders <= 1)
      )
    )::bigint
  )
  FROM customers c;
$$;

CREATE OR REPLACE FUNCTION public.erp_intelligence_customer_avg_by_segment()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'vip',
    (
      SELECT COALESCE(AVG(c.total_spent / NULLIF(c.total_orders, 0)), 0)::numeric
      FROM customers c
      WHERE c.total_spent > 1000
        AND c.total_orders >= 5
    ),
    'loyal',
    (
      SELECT COALESCE(AVG(c.total_spent / NULLIF(c.total_orders, 0)), 0)::numeric
      FROM customers c
      WHERE c.total_spent > 300
        AND c.total_orders >= 3
        AND NOT (c.total_spent > 1000 AND c.total_orders >= 5)
    ),
    'at_risk',
    (
      SELECT COALESCE(AVG(c.total_spent / NULLIF(c.total_orders, 0)), 0)::numeric
      FROM customers c
      WHERE c.total_spent <= 300
        AND c.total_orders < 3
        AND c.total_orders > 1
    ),
    'one_time',
    (
      SELECT COALESCE(AVG(c.total_spent / NULLIF(c.total_orders, 0)), 0)::numeric
      FROM customers c
      WHERE c.total_orders = 1
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.erp_intelligence_customer_new_returning()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH y2026 AS (
    SELECT '2026-01-01T00:00:00.000Z'::timestamptz AS t0
  ),
  month_start AS (
    SELECT date_trunc('month', timezone('utc', now())) AS ms
  ),
  prior_emails AS (
    SELECT DISTINCT o.customer_email AS email
    FROM orders o, y2026, month_start ms
    WHERE o.customer_email IS NOT NULL
      AND o.created_at < ms.ms
      AND o.created_at >= y2026.t0
  ),
  this_month AS (
    SELECT o.customer_email, o.created_at
    FROM orders o, month_start ms
    WHERE o.created_at >= ms.ms
      AND o.created_at >= (SELECT t0 FROM y2026)
  )
  SELECT json_build_object(
    'this_month_orders',
    (SELECT COUNT(*)::bigint FROM this_month),
    'returning_customers',
    (
      SELECT COUNT(DISTINCT tm.customer_email)::bigint
      FROM this_month tm
      INNER JOIN prior_emails p ON p.email = tm.customer_email
    ),
    'new_customers',
    (
      SELECT COUNT(DISTINCT tm.customer_email)::bigint
      FROM this_month tm
      LEFT JOIN prior_emails p ON p.email = tm.customer_email
      WHERE p.email IS NULL
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.erp_intelligence_customer_returning_trend()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH y2026 AS (
    SELECT '2026-01-01T00:00:00.000Z'::timestamptz AS t0
  ),
  bounds AS (
    SELECT
      date_trunc('month', timezone('utc', now())) AS this_ms,
      date_trunc('month', timezone('utc', now())) - interval '1 month' AS last_ms
  ),
  prior_this AS (
    SELECT DISTINCT o.customer_email AS email
    FROM orders o, bounds b, y2026
    WHERE o.customer_email IS NOT NULL
      AND o.created_at < b.this_ms
      AND o.created_at >= y2026.t0
  ),
  prior_last AS (
    SELECT DISTINCT o.customer_email AS email
    FROM orders o, bounds b, y2026
    WHERE o.customer_email IS NOT NULL
      AND o.created_at < b.last_ms
      AND o.created_at >= y2026.t0
  ),
  this_month_o AS (
    SELECT o.customer_email
    FROM orders o, bounds b, y2026
    WHERE o.created_at >= b.this_ms
      AND o.created_at >= y2026.t0
      AND o.customer_email IS NOT NULL
  ),
  last_month_o AS (
    SELECT o.customer_email
    FROM orders o, bounds b, y2026
    WHERE o.created_at >= b.last_ms
      AND o.created_at < b.this_ms
      AND o.created_at >= y2026.t0
      AND o.customer_email IS NOT NULL
  ),
  this_stats AS (
    SELECT
      COUNT(DISTINCT tm.customer_email) FILTER (
        WHERE EXISTS (SELECT 1 FROM prior_this p WHERE p.email = tm.customer_email)
      )::numeric AS ret,
      COUNT(DISTINCT tm.customer_email)::numeric AS total
    FROM this_month_o tm
  ),
  last_stats AS (
    SELECT
      COUNT(DISTINCT lm.customer_email) FILTER (
        WHERE EXISTS (SELECT 1 FROM prior_last p WHERE p.email = lm.customer_email)
      )::numeric AS ret,
      COUNT(DISTINCT lm.customer_email)::numeric AS total
    FROM last_month_o lm
  )
  SELECT json_build_object(
    'this_month_returning_pct',
    CASE WHEN ts.total > 0 THEN ROUND(100 * ts.ret / ts.total) ELSE NULL END,
    'last_month_returning_pct',
    CASE WHEN ls.total > 0 THEN ROUND(100 * ls.ret / ls.total) ELSE NULL END,
    'delta_pct',
    CASE
      WHEN ts.total > 0
        AND ls.total > 0 THEN ROUND(
          (100 * ts.ret / ts.total) - (100 * ls.ret / ls.total)
        )
      ELSE NULL
    END
  )
  FROM this_stats ts
  CROSS JOIN last_stats ls;
$$;

CREATE OR REPLACE FUNCTION public.erp_intelligence_behavior_hours()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(json_agg(cnt ORDER BY hr), '[]'::json)
  FROM (
    SELECT
      gs.hr AS hr,
      COALESCE(s.cnt, 0)::bigint AS cnt
    FROM generate_series(0, 23) AS gs(hr)
    LEFT JOIN (
      SELECT
        EXTRACT(HOUR FROM o.created_at AT TIME ZONE 'UTC')::int AS hr,
        COUNT(*)::bigint AS cnt
      FROM orders o
      WHERE o.created_at >= '2026-01-01T00:00:00.000Z'::timestamptz
      GROUP BY 1
    ) s ON s.hr = gs.hr
  ) q;
$$;

CREATE OR REPLACE FUNCTION public.erp_intelligence_behavior_summary()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH y2026 AS (
    SELECT '2026-01-01T00:00:00.000Z'::timestamptz AS t0
  ),
  today AS (
    SELECT
      COUNT(*)::bigint AS orders_today,
      COALESCE(SUM(o.total_price), 0)::numeric AS revenue_today,
      COALESCE(AVG(o.total_price), 0)::numeric AS avg_order_today
    FROM orders o, y2026
    WHERE to_char(o.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')
      = to_char(current_timestamp AT TIME ZONE 'UTC', 'YYYY-MM-DD')
      AND o.created_at >= y2026.t0
  ),
  week AS (
    SELECT
      COUNT(*)::bigint AS orders_week,
      COALESCE(SUM(o.total_price), 0)::numeric AS revenue_week
    FROM orders o, y2026
    WHERE o.created_at >= date_trunc('week', timezone('utc', now()))
      AND o.created_at >= y2026.t0
  ),
  avg2026 AS (
    SELECT COALESCE(AVG(o.total_price), 0)::numeric AS avg_order_2026
    FROM orders o, y2026
    WHERE o.created_at >= y2026.t0
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
    FROM orders o, y2026
    WHERE o.created_at >= y2026.t0
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
  );
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
