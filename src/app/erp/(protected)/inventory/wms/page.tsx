import { createServiceRoleClient } from '@/lib/supabase/admin';
import { getServerSession, hasRole } from '@/lib/supabase/session';
import { ErpForbidden } from '@/components/erp/erp-forbidden';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WmsClient } from './wms-client';

type Row = {
  sku: string;
  title: string;
  product_type: string | null;
  vendor: string | null;
  first_inventory_date: string | null;
  current_qty: number;
  units_sold: number;
  estimated_initial_qty: number;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'oversold';
};

function toNum(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export default async function WmsPage({ searchParams }: { searchParams: { page?: string } }) {
  const session = await getServerSession();
  if (!hasRole(session, ['admin', 'warehouse'])) {
    return <ErpForbidden />;
  }

  const page = Math.max(1, Number(searchParams.page ?? '1') || 1);
  const supabase = createServiceRoleClient();
  const { data } = await supabase.rpc('erp_wms_inventory', { p_page: page });

  const rows: Row[] = (Array.isArray(data) ? data : []).map((r) => {
    const o = r as Record<string, unknown>;
    return {
      sku: String(o.sku ?? ''),
      title: String(o.title ?? ''),
      product_type: o.product_type == null ? null : String(o.product_type),
      vendor: o.vendor == null ? null : String(o.vendor),
      first_inventory_date: o.first_inventory_date == null ? null : String(o.first_inventory_date),
      current_qty: toNum(o.current_qty),
      units_sold: toNum(o.units_sold),
      estimated_initial_qty: toNum(o.estimated_initial_qty),
      stock_status: (o.stock_status ?? 'in_stock') as Row['stock_status'],
    };
  });

  const summary = rows.reduce(
    (acc, r) => {
      acc.total += 1;
      if (r.stock_status === 'in_stock') acc.inStock += 1;
      if (r.stock_status === 'low_stock') acc.low += 1;
      if (r.stock_status === 'out_of_stock') acc.out += 1;
      return acc;
    },
    { total: 0, inStock: 0, low: 0, out: 0 }
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-headline text-2xl font-semibold tracking-tight">WMS — Warehouse Management</h1>
        <p className="text-sm text-muted-foreground">First order date and stock levels — 2026 data only</p>
      </div>
      <Badge variant="outline">Showing 2026 data only</Badge>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm">Total SKUs</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{summary.total}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">In Stock</CardTitle></CardHeader><CardContent className="text-2xl font-semibold text-emerald-400">{summary.inStock}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Low Stock</CardTitle></CardHeader><CardContent className="text-2xl font-semibold text-amber-400">{summary.low}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Out of Stock</CardTitle></CardHeader><CardContent className="text-2xl font-semibold text-red-400">{summary.out}</CardContent></Card>
      </div>

      <WmsClient rows={rows} page={page} hasNext={rows.length === 50} />
    </div>
  );
}
