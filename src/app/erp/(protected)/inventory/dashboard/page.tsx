import { createServiceRoleClient } from '@/lib/supabase/admin';
import { getServerSession, hasRole } from '@/lib/supabase/session';
import { ErpForbidden } from '@/components/erp/erp-forbidden';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InventoryDashboardClient } from './dashboard-client';

type Stats = {
  total_skus: number;
  in_stock: number;
  low_stock: number;
  out_of_stock: number;
  oversold: number;
  total_units: number;
};

function toNum(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export default async function InventoryDashboardPage() {
  const session = await getServerSession();
  if (!hasRole(session, ['admin', 'warehouse'])) {
    return <ErpForbidden />;
  }

  const supabase = createServiceRoleClient();
  const [{ data: statsData }, { data: topData }, { data: alertData }] = await Promise.all([
    supabase.rpc('erp_inventory_dashboard_stats'),
    supabase.rpc('erp_inventory_top_sellers', { p_page: 1 }),
    supabase.rpc('erp_inventory_stock_alerts', { p_page: 1 }),
  ]);

  const s = (statsData ?? {}) as Record<string, unknown>;
  const stats: Stats = {
    total_skus: toNum(s.total_skus),
    in_stock: toNum(s.in_stock),
    low_stock: toNum(s.low_stock),
    out_of_stock: toNum(s.out_of_stock),
    oversold: toNum(s.oversold),
    total_units: toNum(s.total_units),
  };

  const topSellers = (Array.isArray(topData) ? topData : []).map((r) => {
    const o = r as Record<string, unknown>;
    return {
      sku: String(o.sku ?? ''),
      title: String(o.title ?? ''),
      units_sold: toNum(o.units_sold),
      revenue: toNum(o.revenue),
      current_stock: o.current_stock == null ? null : toNum(o.current_stock),
    };
  });

  const stockAlerts = (Array.isArray(alertData) ? alertData : []).map((r) => {
    const o = r as Record<string, unknown>;
    return {
      sku: String(o.sku ?? ''),
      title: String(o.title ?? ''),
      current_stock: toNum(o.current_stock),
      daily_velocity: toNum(o.daily_velocity),
      days_remaining: o.days_remaining == null ? null : toNum(o.days_remaining),
      alert_level: (o.alert_level ?? 'ok') as 'critical' | 'warning' | 'ok',
    };
  });

  const topTen = topSellers.slice(0, 10);
  const alertTen = stockAlerts.slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-2xl font-semibold tracking-tight">Inventory Overview</h1>
        <p className="text-sm text-muted-foreground">Stock health and movement — 2026 data</p>
      </div>
      <Badge variant="outline">Showing 2026 data only</Badge>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card><CardHeader><CardTitle className="text-sm">Total SKUs</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{stats.total_skus.toLocaleString('en-US')}</CardContent></Card>
        <Card className="border-emerald-500/30"><CardHeader><CardTitle className="text-sm">In Stock</CardTitle></CardHeader><CardContent className="text-2xl font-semibold text-emerald-400">{stats.in_stock.toLocaleString('en-US')}</CardContent></Card>
        <Card className="border-amber-500/30"><CardHeader><CardTitle className="text-sm">Low Stock</CardTitle></CardHeader><CardContent className="text-2xl font-semibold text-amber-400">{stats.low_stock.toLocaleString('en-US')}</CardContent></Card>
        <Card className="border-red-500/30"><CardHeader><CardTitle className="text-sm">Out of Stock</CardTitle></CardHeader><CardContent className="text-2xl font-semibold text-red-400">{stats.out_of_stock.toLocaleString('en-US')}</CardContent></Card>
        <Card className="border-red-900/50"><CardHeader><CardTitle className="text-sm">Oversold</CardTitle></CardHeader><CardContent className="text-2xl font-semibold text-red-500">{stats.oversold.toLocaleString('en-US')}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Total Units In Warehouse</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{stats.total_units.toLocaleString('en-US')}</CardContent></Card>
      </div>

      <InventoryDashboardClient topSellers={topTen} stockAlerts={alertTen} />
    </div>
  );
}
