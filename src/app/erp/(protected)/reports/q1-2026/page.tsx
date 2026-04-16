import { createServiceRoleClientWithStatementTimeout } from '@/lib/supabase/admin';
import { getServerSession, hasRole } from '@/lib/supabase/session';
import { ErpForbidden } from '@/components/erp/erp-forbidden';
import { Q12026ReportClient, type Q1ReportRow, type Q1Summary } from './q1-2026-client';

const PAGE_SIZE = 50;

function toNum(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function asUnknownArray(data: unknown): unknown[] {
  if (data == null) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'string') {
    try {
      const p = JSON.parse(data);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseRows(data: unknown): Q1ReportRow[] {
  return asUnknownArray(data).map((r) => {
    const o = r as Record<string, unknown>;
    const qty =
      o.quantity ??
      o.qty ??
      o.line_quantity ??
      (typeof o.quantity_sold === 'number' ? o.quantity_sold : null);
    return {
      shopify_order_id: String(o.shopify_order_id ?? ''),
      sales_channel: String(o.sales_channel ?? 'Online Store'),
      product_variant_sku: String(o.product_variant_sku ?? ''),
      product_title: o.product_title == null ? null : String(o.product_title),
      order_name: o.order_name == null ? null : String(o.order_name).replace(/^#/, ''),
      quantity: toNum(qty),
      gross_sales: toNum(o.gross_sales),
      net_sales: toNum(o.net_sales),
      discount: toNum(o.discount ?? o.total_discount),
      return_amount: toNum(o.return_amount),
    };
  });
}

function parseSummary(data: unknown): Q1Summary {
  const o = data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
  return {
    total_orders: toNum(o.total_orders),
    total_skus: toNum(o.total_skus),
    gross_sales: toNum(o.gross_sales),
    net_sales: toNum(o.net_sales),
    total_units: toNum(o.total_units),
    total_returned: toNum(o.total_returned ?? o.total_return_amount),
  };
}

export default async function Q12026ReportPage() {
  const session = await getServerSession();
  if (!hasRole(session, ['admin'])) return <ErpForbidden />;

  const supabase = createServiceRoleClientWithStatementTimeout(30_000);
  const rpc = (supabase as any).rpc.bind(supabase as any);
  const [{ data: rowsData }, { data: summaryData }, { data: countData }] = await Promise.all([
    rpc('erp_q1_2026_report', { p_page: 1, p_page_size: PAGE_SIZE }),
    rpc('erp_q1_2026_summary'),
    rpc('erp_q1_2026_report_count'),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-2xl font-semibold tracking-tight">Q1 2026 Sales Report</h1>
        <p className="text-sm text-muted-foreground">January 1 - March 31, 2026</p>
      </div>
      <Q12026ReportClient
        initialRows={parseRows(rowsData)}
        summary={parseSummary(summaryData)}
        initialTotalLineItems={toNum(countData)}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
