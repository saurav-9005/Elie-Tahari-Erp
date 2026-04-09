import { createServiceRoleClient } from '@/lib/supabase/admin';
import { getServerSession, hasRole } from '@/lib/supabase/session';
import { ErpForbidden } from '@/components/erp/erp-forbidden';
import { AlertsEngine } from '@/components/erp/ceo/AlertsEngine';
import { GrowthSnapshot } from '@/components/erp/ceo/GrowthSnapshot';
import { RevenueTrend } from '@/components/erp/ceo/RevenueTrend';
import { ProductHealth } from '@/components/erp/ceo/ProductHealth';
import type {
  GrowthSnapshotData,
  ParetoRow,
  SellThroughRow,
  StockRiskRow,
} from '@/components/erp/ceo/ceo-types';
import { Button } from '@/components/ui/button';
import { revalidateCeoPage } from './actions';

function num(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const x = Number(v);
    return Number.isNaN(x) ? fallback : x;
  }
  return fallback;
}

function parseGrowthSnapshot(j: unknown): GrowthSnapshotData | null {
  if (!j || typeof j !== 'object') return null;
  const o = j as Record<string, unknown>;
  return {
    revenue_today: num(o.revenue_today),
    revenue_mtd: num(o.revenue_mtd),
    revenue_last_month: num(o.revenue_last_month),
    revenue_ytd: num(o.revenue_ytd),
    orders_today: num(o.orders_today),
    orders_mtd: num(o.orders_mtd),
    aov_mtd: num(o.aov_mtd),
    aov_last_month: num(o.aov_last_month),
    repeat_rate: num(o.repeat_rate),
    new_customers_mtd: num(o.new_customers_mtd),
  };
}

function parseStockRisk(j: unknown): StockRiskRow[] | null {
  if (!Array.isArray(j)) return null;
  return j.map((row) => {
    const o = row as Record<string, unknown>;
    return {
      title: String(o.title ?? ''),
      sku: o.sku != null ? String(o.sku) : null,
      stock: num(o.stock),
      daily_velocity: num(o.daily_velocity),
      days_remaining: o.days_remaining == null ? null : num(o.days_remaining),
      status: (o.status as StockRiskRow['status']) ?? 'healthy',
    };
  });
}

function parsePareto(j: unknown): ParetoRow[] | null {
  if (!Array.isArray(j)) return null;
  return j.map((row) => {
    const o = row as Record<string, unknown>;
    return {
      product: String(o.product ?? ''),
      revenue: num(o.revenue),
      units: num(o.units),
      pct_of_revenue: num(o.pct_of_revenue),
      cumulative_pct: num(o.cumulative_pct),
    };
  });
}

function parseSellThrough(j: unknown): SellThroughRow[] | null {
  if (!Array.isArray(j)) return null;
  return j.map((row) => {
    const o = row as Record<string, unknown>;
    return {
      title: String(o.title ?? ''),
      sku: o.sku != null ? String(o.sku) : null,
      units_sold: num(o.units_sold),
      current_stock: num(o.current_stock),
      sell_through: num(o.sell_through),
      category: (o.category as SellThroughRow['category']) ?? 'normal',
    };
  });
}

export default async function CeoControlTowerPage({
  searchParams,
}: {
  searchParams?: Promise<{ trend?: string }> | { trend?: string };
}) {
  const session = await getServerSession();
  if (!hasRole(session, ['admin'])) {
    return <ErpForbidden />;
  }

  const sp = searchParams instanceof Promise ? await searchParams : searchParams;
  const rawTrend = sp?.trend;
  const trendDays = [7, 30, 90].includes(Number(rawTrend)) ? Number(rawTrend) : 30;

  const supabase = createServiceRoleClient();

  const [
    alertsRes,
    growthRes,
    trendRes,
    stockRes,
    paretoRes,
    sellRes,
  ] = await Promise.all([
    supabase.rpc('erp_ceo_generate_alerts'),
    supabase.rpc('erp_ceo_growth_snapshot'),
    supabase.rpc('erp_ceo_revenue_trend', { p_days: trendDays }),
    supabase.rpc('erp_ceo_stock_risk'),
    supabase.rpc('erp_ceo_pareto_skus'),
    supabase.rpc('erp_ceo_sell_through'),
  ]);

  const growth = parseGrowthSnapshot(growthRes.data);
  const stockRisk = parseStockRisk(stockRes.data);
  const pareto = parsePareto(paretoRes.data);
  const sellThrough = parseSellThrough(sellRes.data);

  return (
    <div
      className="space-y-8 rounded-xl p-4 sm:p-6 lg:-mx-2"
      style={{ backgroundColor: 'var(--color-background-tertiary)' }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-headline text-2xl font-semibold tracking-tight">Control Tower</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Decision system — 2026 data only · Last updated just now
          </p>
        </div>
        <form action={revalidateCeoPage}>
          <Button type="submit" variant="outline" size="sm">
            Refresh all
          </Button>
        </form>
      </div>

      <section className="space-y-2">
        <AlertsEngine
          initialAlerts={alertsRes.data}
          errorMessage={alertsRes.error?.message ?? null}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Growth snapshot
        </h2>
        <GrowthSnapshot
          data={growth}
          errorMessage={growthRes.error?.message ?? null}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Revenue trend
        </h2>
        <RevenueTrend
          trendJson={trendRes.data}
          days={trendDays}
          errorMessage={trendRes.error?.message ?? null}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Product health
        </h2>
        <ProductHealth
          stockRisk={stockRisk}
          pareto={pareto}
          sellThrough={sellThrough}
          errors={{
            stock: stockRes.error?.message ?? null,
            pareto: paretoRes.error?.message ?? null,
            sell: sellRes.error?.message ?? null,
          }}
        />
      </section>
    </div>
  );
}
