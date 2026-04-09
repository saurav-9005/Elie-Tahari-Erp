import { createServiceRoleClient } from '@/lib/supabase/admin';
import { getServerSession, hasRole } from '@/lib/supabase/session';
import { ErpForbidden } from '@/components/erp/erp-forbidden';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShopifyInventoryClient } from './shopify-client';

type Row = {
  sku: string;
  title: string;
  product_type: string | null;
  vendor: string | null;
  current_stock: number;
  qty_sold: number;
  qty_returned: number;
  net_sold: number;
  gross_revenue: number;
  order_count: number;
  return_rate_pct: number;
};

function toNum(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export default async function ShopifyInventoryPage({ searchParams }: { searchParams: { page?: string } }) {
  const session = await getServerSession();
  if (!hasRole(session, ['admin', 'warehouse'])) {
    return <ErpForbidden />;
  }

  const page = Math.max(1, Number(searchParams.page ?? '1') || 1);
  const supabase = createServiceRoleClient();
  const { data } = await supabase.rpc('erp_shopify_inventory', { p_page: page });

  const rows: Row[] = (Array.isArray(data) ? data : []).map((r) => {
    const o = r as Record<string, unknown>;
    return {
      sku: String(o.sku ?? ''),
      title: String(o.title ?? ''),
      product_type: o.product_type == null ? null : String(o.product_type),
      vendor: o.vendor == null ? null : String(o.vendor),
      current_stock: toNum(o.current_stock),
      qty_sold: toNum(o.qty_sold),
      qty_returned: toNum(o.qty_returned),
      net_sold: toNum(o.net_sold),
      gross_revenue: toNum(o.gross_revenue),
      order_count: toNum(o.order_count),
      return_rate_pct: toNum(o.return_rate_pct),
    };
  });

  const summary = rows.reduce(
    (acc, r) => {
      acc.totalSkus += 1;
      acc.totalSold += r.qty_sold;
      acc.totalReturned += r.qty_returned;
      return acc;
    },
    { totalSkus: 0, totalSold: 0, totalReturned: 0 }
  );
  const returnRate = summary.totalSold > 0 ? (summary.totalReturned / summary.totalSold) * 100 : 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-headline text-2xl font-semibold tracking-tight">Shopify Inventory</h1>
        <p className="text-sm text-muted-foreground">Units sold vs returned — 2026 data only</p>
      </div>
      <Badge variant="outline">Showing 2026 data only</Badge>
      <Card>
        <CardHeader><CardTitle className="text-sm">Summary</CardTitle></CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-4">
          <p>Total SKUs: <span className="font-semibold">{summary.totalSkus.toLocaleString('en-US')}</span></p>
          <p>Total sold: <span className="font-semibold">{summary.totalSold.toLocaleString('en-US')}</span></p>
          <p>Total returned: <span className="font-semibold">{summary.totalReturned.toLocaleString('en-US')}</span></p>
          <p>Overall return rate: <span className="font-semibold">{returnRate.toLocaleString('en-US', { maximumFractionDigits: 1 })}%</span></p>
        </CardContent>
      </Card>

      <ShopifyInventoryClient rows={rows} page={page} hasNext={rows.length === 50} />
    </div>
  );
}
