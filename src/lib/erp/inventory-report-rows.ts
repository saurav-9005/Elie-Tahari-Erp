import type { InventoryReportRow } from '@/lib/erp/inventory-report-types';

/** Maps one RPC / API row object to `InventoryReportRow`. */
export function parseInventoryReportRow(o: Record<string, unknown>): InventoryReportRow {
  const grossBefore = Number(o.gross_before_july ?? o.revenue_before_july ?? 0);
  const grossAfter = Number(o.gross_after_july ?? o.revenue_after_july ?? 0);
  const discBefore = Number(o.discount_before_july ?? 0);
  const discAfter = Number(o.discount_after_july ?? 0);
  const netBefore = Number(o.net_before_july ?? (grossBefore - discBefore));
  const netAfter = Number(o.net_after_july ?? (grossAfter - discAfter));
  const totalGross = Number(o.total_gross ?? o.total_revenue ?? grossBefore + grossAfter);
  const totalNet = Number(o.total_net ?? netBefore + netAfter);
  const totalDisc = Number(o.total_discount ?? discBefore + discAfter);
  return {
    title: String(o.title ?? ''),
    sku: o.sku != null ? String(o.sku) : null,
    current_stock: Number(o.current_stock ?? 0),
    product_created_at: o.product_created_at != null ? String(o.product_created_at) : null,
    product_type: o.product_type != null ? String(o.product_type) : null,
    vendor: o.vendor != null ? String(o.vendor) : null,
    qty_before_july: Number(o.qty_before_july ?? o.qty_sold_before_july ?? 0),
    gross_before_july: grossBefore,
    net_before_july: netBefore,
    discount_before_july: discBefore,
    qty_after_july: Number(o.qty_after_july ?? o.qty_sold_after_july ?? 0),
    gross_after_july: grossAfter,
    net_after_july: netAfter,
    discount_after_july: discAfter,
    total_qty: Number(o.total_qty ?? o.total_qty_sold ?? 0),
    total_gross: totalGross,
    total_net: totalNet,
    total_discount: totalDisc,
  };
}

export function parseInventoryReportRows(data: unknown): InventoryReportRow[] {
  if (!Array.isArray(data)) return [];
  return data.map((r) => parseInventoryReportRow(r as Record<string, unknown>));
}

export function parsePagedRpcPayload(data: unknown): {
  total: number;
  rows: InventoryReportRow[];
} {
  if (data && typeof data === 'object' && !Array.isArray(data) && 'rows' in data) {
    const o = data as { total?: unknown; rows?: unknown };
    return {
      total: Number(o.total ?? 0),
      rows: parseInventoryReportRows(o.rows),
    };
  }
  const rows = parseInventoryReportRows(data);
  return { total: rows.length, rows };
}
