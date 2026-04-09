-- CEO Control Tower: alert storage + RPCs (2026 data focus; service role executes)

CREATE TABLE IF NOT EXISTS ceo_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'healthy')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  value NUMERIC,
  threshold NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_status TEXT;

CREATE OR REPLACE FUNCTION public.erp_ceo_generate_alerts()
RETURNS json
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alerts json[] := ARRAY[]::json[];
  this_week_rev NUMERIC;
  last_week_rev NUMERIC;
  wow_change NUMERIC;
  unfulfilled_count INT;
  oos_soon_count INT;
  refund_count INT;
BEGIN
  SELECT
    COALESCE(
      SUM(
        CASE
          WHEN o.created_at >= NOW() - INTERVAL '7 days' THEN o.total_price::numeric
          ELSE 0
        END
      ),
      0
    ),
    COALESCE(
      SUM(
        CASE
          WHEN
            o.created_at >= NOW() - INTERVAL '14 days'
            AND o.created_at < NOW() - INTERVAL '7 days'
            THEN o.total_price::numeric
          ELSE 0
        END
      ),
      0
    )
  INTO this_week_rev, last_week_rev
  FROM orders o
  WHERE o.created_at >= '2026-01-01'
    AND o.status != 'cancelled';

  IF last_week_rev > 0 THEN
    wow_change := ROUND((this_week_rev - last_week_rev) / last_week_rev * 100, 1);
    IF wow_change <= -10 THEN
      alerts := array_append(
        alerts,
        json_build_object(
          'type',
          'revenue_drop',
          'severity',
          'critical',
          'title',
          'Revenue down ' || ABS(wow_change) || '% WoW',
          'body',
          'This week $' || ROUND(this_week_rev) || ' vs last week $' || ROUND(last_week_rev)
          || '. Investigate channel performance immediately.',
          'value',
          wow_change,
          'threshold',
          -10
        )::json
      );
    ELSIF wow_change >= 10 THEN
      alerts := array_append(
        alerts,
        json_build_object(
          'type',
          'revenue_up',
          'severity',
          'healthy',
          'title',
          'Revenue up ' || wow_change || '% WoW',
          'body',
          'This week $' || ROUND(this_week_rev) || ' vs last week $' || ROUND(last_week_rev)
          || '. Identify what is working and scale it.',
          'value',
          wow_change,
          'threshold',
          10
        )::json
      );
    END IF;
  END IF;

  SELECT COUNT(*)::int
  INTO unfulfilled_count
  FROM orders o
  WHERE o.created_at >= '2026-01-01'
    AND o.created_at < NOW() - INTERVAL '24 hours'
    AND o.status != 'cancelled'
    AND (o.fulfillment_status IS NULL OR o.fulfillment_status = 'unfulfilled');

  IF unfulfilled_count > 0 THEN
    alerts := array_append(
      alerts,
      json_build_object(
        'type',
        'fulfillment_delay',
        'severity',
        CASE
          WHEN unfulfilled_count > 50 THEN 'critical'
          ELSE 'warning'
        END,
        'title',
        unfulfilled_count || ' orders not fulfilled in 24h',
        'body',
        'These orders are overdue for fulfillment. Customer satisfaction at risk.',
        'value',
        unfulfilled_count,
        'threshold',
        0
      )::json
    );
  END IF;

  WITH daily_velocity AS (
    SELECT
      item->>'title' AS product,
      SUM(COALESCE((item->>'quantity')::numeric, 1)) / GREATEST(
        DATE_PART('day', NOW() - '2026-01-01'::timestamptz)::numeric,
        1::numeric
      ) AS units_per_day
    FROM orders o,
      LATERAL jsonb_array_elements(COALESCE(o.line_items::jsonb, '[]'::jsonb)) AS item
    WHERE o.created_at >= '2026-01-01'
    GROUP BY product
  )
  SELECT COUNT(*)::int
  INTO oos_soon_count
  FROM inventory i
  JOIN daily_velocity v ON v.product = i.title
  WHERE i.quantity > 0
    AND v.units_per_day > 0
    AND i.quantity / v.units_per_day < 7;

  IF oos_soon_count > 0 THEN
    alerts := array_append(
      alerts,
      json_build_object(
        'type',
        'stock_risk',
        'severity',
        CASE
          WHEN oos_soon_count > 5 THEN 'critical'
          ELSE 'warning'
        END,
        'title',
        oos_soon_count || ' SKUs going OOS within 7 days',
        'body',
        'These products will stock out within a week at current sales velocity. Reorder or pause ads.',
        'value',
        oos_soon_count,
        'threshold',
        0
      )::json
    );
  END IF;

  SELECT COUNT(*)::int
  INTO refund_count
  FROM shopify_events e
  WHERE e.event_type = 'refunds/create'
    AND e.created_at >= NOW() - INTERVAL '7 days'
    AND e.created_at >= '2026-01-01';

  IF refund_count > 20 THEN
    alerts := array_append(
      alerts,
      json_build_object(
        'type',
        'refund_spike',
        'severity',
        'warning',
        'title',
        'Return rate spike — ' || refund_count || ' refunds this week',
        'body',
        'Higher than normal refund activity detected. Check product quality and sizing feedback.',
        'value',
        refund_count,
        'threshold',
        20
      )::json
    );
  END IF;

  IF COALESCE(cardinality(alerts), 0) = 0 THEN
    alerts := array_append(
      alerts,
      json_build_object(
        'type',
        'all_clear',
        'severity',
        'healthy',
        'title',
        'All systems healthy',
        'body',
        'No critical issues detected in your 2026 data.',
        'value',
        0,
        'threshold',
        0
      )::json
    );
  END IF;

  RETURN array_to_json(alerts);
END;
$$;

GRANT EXECUTE ON FUNCTION public.erp_ceo_generate_alerts() TO service_role;

CREATE OR REPLACE FUNCTION public.erp_ceo_growth_snapshot()
RETURNS json
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'revenue_today',
    (
      SELECT COALESCE(SUM(o.total_price::numeric), 0)
      FROM orders o
      WHERE o.created_at >= CURRENT_DATE
        AND o.created_at >= '2026-01-01'
        AND o.status != 'cancelled'
    ),
    'revenue_mtd',
    (
      SELECT COALESCE(SUM(o.total_price::numeric), 0)
      FROM orders o
      WHERE o.created_at >= DATE_TRUNC('month', NOW())
        AND o.created_at >= '2026-01-01'
        AND o.status != 'cancelled'
    ),
    'revenue_last_month',
    (
      SELECT COALESCE(SUM(o.total_price::numeric), 0)
      FROM orders o
      WHERE o.created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'
        AND o.created_at < DATE_TRUNC('month', NOW())
        AND o.created_at >= '2026-01-01'
        AND o.status != 'cancelled'
    ),
    'revenue_ytd',
    (
      SELECT COALESCE(SUM(o.total_price::numeric), 0)
      FROM orders o
      WHERE o.created_at >= '2026-01-01'
        AND o.status != 'cancelled'
    ),
    'orders_today',
    (
      SELECT COUNT(*)::int
      FROM orders o
      WHERE o.created_at >= CURRENT_DATE
        AND o.created_at >= '2026-01-01'
    ),
    'orders_mtd',
    (
      SELECT COUNT(*)::int
      FROM orders o
      WHERE o.created_at >= DATE_TRUNC('month', NOW())
        AND o.created_at >= '2026-01-01'
    ),
    'aov_mtd',
    (
      SELECT COALESCE(AVG(o.total_price::numeric), 0)
      FROM orders o
      WHERE o.created_at >= DATE_TRUNC('month', NOW())
        AND o.created_at >= '2026-01-01'
        AND o.status != 'cancelled'
    ),
    'aov_last_month',
    (
      SELECT COALESCE(AVG(o.total_price::numeric), 0)
      FROM orders o
      WHERE o.created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'
        AND o.created_at < DATE_TRUNC('month', NOW())
        AND o.created_at >= '2026-01-01'
        AND o.status != 'cancelled'
    ),
    'repeat_rate',
    (
      SELECT ROUND(
        COUNT(*) FILTER (WHERE c.total_orders > 1) * 100.0 / NULLIF(COUNT(*), 0),
        1
      )
      FROM customers c
    ),
    'new_customers_mtd',
    (
      SELECT COUNT(*)::int
      FROM customers c
      WHERE c.created_at >= DATE_TRUNC('month', NOW())
        AND c.created_at >= '2026-01-01'
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.erp_ceo_growth_snapshot() TO service_role;

CREATE OR REPLACE FUNCTION public.erp_ceo_revenue_trend(p_days integer DEFAULT 30)
RETURNS json
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'current',
    COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'date',
            TO_CHAR(d.dt, 'Mon DD'),
            'revenue',
            d.revenue,
            'orders',
            d.orders,
            'aov',
            d.aov
          )
          ORDER BY d.dt
        )
        FROM (
          SELECT
            DATE_TRUNC('day', o.created_at) AS dt,
            ROUND(SUM(o.total_price::numeric)) AS revenue,
            COUNT(*)::integer AS orders,
            ROUND(AVG(o.total_price::numeric)) AS aov
          FROM orders o
          WHERE o.created_at >= GREATEST((NOW() - (p_days || ' days')::interval), '2026-01-01'::timestamptz)
            AND o.created_at < NOW()
            AND o.status != 'cancelled'
          GROUP BY DATE_TRUNC('day', o.created_at)
        ) d
      ),
      '[]'::json
    ),
    'previous',
    COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'date',
            TO_CHAR(p.dt, 'Mon DD'),
            'revenue',
            p.revenue,
            'orders',
            p.orders,
            'aov',
            p.aov
          )
          ORDER BY p.dt
        )
        FROM (
          SELECT
            DATE_TRUNC('day', o.created_at) AS dt,
            ROUND(SUM(o.total_price::numeric)) AS revenue,
            COUNT(*)::integer AS orders,
            ROUND(AVG(o.total_price::numeric)) AS aov
          FROM orders o
          WHERE o.created_at
            >= GREATEST((NOW() - (2 * p_days || ' days')::interval), '2026-01-01'::timestamptz)
            AND o.created_at < GREATEST((NOW() - (p_days || ' days')::interval), '2026-01-01'::timestamptz)
            AND o.status != 'cancelled'
          GROUP BY DATE_TRUNC('day', o.created_at)
        ) p
      ),
      '[]'::json
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.erp_ceo_revenue_trend(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.erp_ceo_stock_risk()
RETURNS json
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'title',
        t.title,
        'sku',
        t.sku,
        'stock',
        t.stock,
        'daily_velocity',
        t.daily_velocity,
        'days_remaining',
        t.days_remaining,
        'status',
        t.status
      )
      ORDER BY t.days_remaining ASC NULLS LAST
    ),
    '[]'::json
  )
  FROM (
    WITH daily_sales AS (
      SELECT
        item->>'title' AS title,
        SUM(COALESCE((item->>'quantity')::numeric, 1)) / GREATEST(
          DATE_PART('day', NOW() - '2026-01-01'::timestamptz)::numeric,
          1::numeric
        ) AS units_per_day
      FROM orders o,
        LATERAL jsonb_array_elements(COALESCE(o.line_items::jsonb, '[]'::jsonb)) AS item
      WHERE o.created_at >= '2026-01-01'
      GROUP BY title
    )
    SELECT
      i.title,
      i.sku,
      i.quantity AS stock,
      ROUND(d.units_per_day::numeric, 1) AS daily_velocity,
      ROUND((i.quantity::numeric / NULLIF(d.units_per_day::numeric, 0)), 0) AS days_remaining,
      CASE
        WHEN (i.quantity::numeric / NULLIF(d.units_per_day::numeric, 0)) < 3 THEN 'critical'
        WHEN (i.quantity::numeric / NULLIF(d.units_per_day::numeric, 0)) < 7 THEN 'warning'
        ELSE 'healthy'
      END AS status
    FROM inventory i
    JOIN daily_sales d ON d.title = i.title
    WHERE i.quantity < 100
    ORDER BY (i.quantity::numeric / NULLIF(d.units_per_day::numeric, 0)) ASC NULLS LAST
    LIMIT 10
  ) t;
$$;

GRANT EXECUTE ON FUNCTION public.erp_ceo_stock_risk() TO service_role;

CREATE OR REPLACE FUNCTION public.erp_ceo_pareto_skus()
RETURNS json
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT json_agg(row_to_json(s) ORDER BY s.revenue DESC)
      FROM (
        WITH sku_rev AS (
          SELECT
            item->>'title' AS product,
            ROUND(
              SUM(
                COALESCE(NULLIF(trim(item->>'price'), '')::numeric, 0)
                * COALESCE((item->>'quantity')::numeric, 0)
              )
            ) AS revenue,
            SUM(COALESCE((item->>'quantity')::numeric, 0)) AS units
          FROM orders o,
            LATERAL jsonb_array_elements(COALESCE(o.line_items::jsonb, '[]'::jsonb)) AS item
          WHERE o.created_at >= '2026-01-01'
          GROUP BY item->>'title'
          ORDER BY revenue DESC NULLS LAST
          LIMIT 20
        ),
        total AS (
          SELECT COALESCE(SUM(sku_rev.revenue), 0) AS t
          FROM sku_rev
        )
        SELECT
          sr.product,
          sr.revenue,
          sr.units,
          ROUND(sr.revenue / NULLIF(tt.t, 0) * 100, 1) AS pct_of_revenue,
          ROUND(
            SUM(sr.revenue) OVER (
              ORDER BY sr.revenue DESC
              ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) / NULLIF(tt.t, 0) * 100,
            1
          ) AS cumulative_pct
        FROM sku_rev sr
        CROSS JOIN total tt
      ) s
    ),
    '[]'::json
  );
$$;

GRANT EXECUTE ON FUNCTION public.erp_ceo_pareto_skus() TO service_role;

CREATE OR REPLACE FUNCTION public.erp_ceo_sell_through()
RETURNS json
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT json_agg(row_to_json(t) ORDER BY t.sell_through DESC)
      FROM (
        WITH units_sold AS (
          SELECT
            item->>'title' AS title,
            SUM(COALESCE((item->>'quantity')::numeric, 0)) AS sold
          FROM orders o,
            LATERAL jsonb_array_elements(COALESCE(o.line_items::jsonb, '[]'::jsonb)) AS item
          WHERE o.created_at >= '2026-01-01'
          GROUP BY item->>'title'
        )
        SELECT
          i.title,
          i.sku,
          COALESCE(u.sold, 0) AS units_sold,
          i.quantity AS current_stock,
          CASE
            WHEN COALESCE(u.sold, 0) + i.quantity = 0 THEN 0
            ELSE ROUND(
              COALESCE(u.sold, 0) / NULLIF(COALESCE(u.sold, 0) + i.quantity, 0) * 100,
              1
            )
          END AS sell_through,
          CASE
            WHEN COALESCE(u.sold, 0) = 0
            AND i.quantity > 0 THEN 'dead_stock'
            WHEN COALESCE(u.sold, 0) / NULLIF(COALESCE(u.sold, 0) + i.quantity, 0) > 0.8 THEN 'fast_seller'
            WHEN COALESCE(u.sold, 0) / NULLIF(COALESCE(u.sold, 0) + i.quantity, 0) < 0.2 THEN 'slow_mover'
            ELSE 'normal'
          END AS category
        FROM inventory i
        LEFT JOIN units_sold u ON u.title = i.title
        WHERE i.quantity > 0
          OR COALESCE(u.sold, 0) > 0
        ORDER BY
          CASE
            WHEN COALESCE(u.sold, 0) + i.quantity = 0 THEN 0
            ELSE COALESCE(u.sold, 0) / NULLIF(COALESCE(u.sold, 0) + i.quantity, 0)
          END DESC NULLS LAST
        LIMIT 15
      ) t
    ),
    '[]'::json
  );
$$;

GRANT EXECUTE ON FUNCTION public.erp_ceo_sell_through() TO service_role;
