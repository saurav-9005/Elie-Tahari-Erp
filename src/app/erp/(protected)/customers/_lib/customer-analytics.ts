export type CustomerAnalyticsTab = 'channel' | 'product' | 'segments' | 'promo';

export type ChannelRow = {
  channel: string;
  customers: number;
  avg_orders: number;
  avg_ltv: number;
  total_revenue: number;
  avg_order_value: number;
  channelLabel: string;
};

export type ProductRow = {
  style: string;
  customers: number;
  avg_ltv: number;
  avg_orders: number;
  return_rate_pct: number;
};

export type SegmentRow = {
  customer_name: string | null;
  email: string | null;
  segment_key: string;
  order_count: number;
  total_spent: number;
  avg_discount_pct: number;
};

export type CohortMetrics = {
  cohort?: string;
  customers?: number;
  repeat_rate_pct?: number;
  avg_ltv?: number;
  avg_orders?: number;
  avg_discount_pct?: number;
};

export const TIMEOUT_HELP =
  'Data is loading, this may take a moment. Please refresh.';

export function isTimeoutLike(message: string, status?: number) {
  if (status === 504 || status === 408) return true;
  const m = message.toLowerCase();
  return (
    m.includes('timeout') ||
    m.includes('statement') ||
    m.includes('57014') ||
    m.includes('canceling statement') ||
    m.includes('query canceled') ||
    m.includes('etimedout') ||
    m.includes('gateway time-out') ||
    m.includes('upstream request timeout')
  );
}

export const chartChannel = {
  avg_ltv: { label: 'Avg LTV', color: 'hsl(var(--chart-1))' },
};

export const chartProduct = {
  avg_ltv: { label: 'Avg LTV', color: 'hsl(var(--chart-2))' },
};

export const donutChartConfig = {
  value: { label: 'Customers', color: 'hsl(var(--chart-1))' },
};

export const SEGMENT_COLORS: Record<string, string> = {
  big_spenders: '#a855f7',
  loyal_browsers: '#3b82f6',
  promo_hunters: '#f59e0b',
  brand_loyalists: '#22c55e',
  other: '#64748b',
};

export function toNum(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function parseJson<T>(raw: unknown): T | null {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
  return raw as T;
}

export function asArray(raw: unknown): unknown[] {
  const p = parseJson<unknown[]>(raw);
  if (Array.isArray(p)) return p;
  if (Array.isArray(raw)) return raw;
  return [];
}

export function channelLabel(ch: string) {
  if (ch === 'null' || ch === '' || ch == null) return 'Unknown';
  if (ch === 'web') return 'Web';
  if (ch === 'pos') return 'POS';
  if (ch === 'shopify_draft_order') return 'Draft order';
  return ch;
}

export function parseChannelRows(data: unknown): ChannelRow[] {
  return asArray(data).map((r) => {
    const o = (r ?? {}) as Record<string, unknown>;
    const channel = String(o.channel ?? 'null');
    return {
      channel,
      customers: toNum(o.customers),
      avg_orders: toNum(o.avg_orders),
      avg_ltv: toNum(o.avg_ltv),
      total_revenue: toNum(o.total_revenue),
      avg_order_value: toNum(o.avg_order_value),
      channelLabel: channelLabel(channel),
    };
  });
}

export function parseProductRows(data: unknown): ProductRow[] {
  return asArray(data).map((r) => {
    const o = (r ?? {}) as Record<string, unknown>;
    return {
      style: String(o.style ?? ''),
      customers: toNum(o.customers),
      avg_ltv: toNum(o.avg_ltv),
      avg_orders: toNum(o.avg_orders),
      return_rate_pct: toNum(o.return_rate_pct),
    };
  });
}

export function parseSegmentCounts(raw: unknown): Record<string, number> {
  const arr = asArray(raw);
  const out: Record<string, number> = {};
  for (const row of arr) {
    const o = (row ?? {}) as Record<string, unknown>;
    const k = String(o.segment_key ?? '');
    out[k] = toNum(o.count);
  }
  return out;
}

export function parseSegmentRows(data: unknown): SegmentRow[] {
  const obj = parseJson<{ rows?: unknown }>(data);
  const rows = obj && typeof obj === 'object' && 'rows' in obj ? (obj as { rows: unknown }).rows : data;
  return asArray(rows).map((r) => {
    const o = (r ?? {}) as Record<string, unknown>;
    return {
      customer_name: o.customer_name == null ? null : String(o.customer_name),
      email: o.email == null ? null : String(o.email),
      segment_key: String(o.segment_key ?? 'other'),
      order_count: Math.floor(toNum(o.order_count)),
      total_spent: toNum(o.total_spent),
      avg_discount_pct: toNum(o.avg_discount_pct),
    };
  });
}

export function parseSegmentsPayload(data: unknown): { counts: Record<string, number>; rows: SegmentRow[] } {
  const obj = parseJson<{ counts?: unknown; rows?: unknown }>(data);
  if (obj && typeof obj === 'object') {
    return {
      counts: parseSegmentCounts(obj.counts),
      rows: parseSegmentRows({ rows: obj.rows }),
    };
  }
  return { counts: {}, rows: [] };
}

function parseCohort(o: unknown): CohortMetrics {
  const x = (o ?? {}) as Record<string, unknown>;
  return {
    cohort: o == null ? undefined : String(x.cohort ?? ''),
    customers: toNum(x.customers),
    repeat_rate_pct: toNum(x.repeat_rate_pct),
    avg_ltv: toNum(x.avg_ltv),
    avg_orders: toNum(x.avg_orders),
    avg_discount_pct: toNum(x.avg_discount_pct),
  };
}

export function parsePromoPayload(data: unknown): {
  discount: CohortMetrics | null;
  fullPrice: CohortMetrics | null;
  repeat_rate_delta_pct: number;
} {
  const obj = parseJson<Record<string, unknown>>(data);
  if (!obj) return { discount: null, fullPrice: null, repeat_rate_delta_pct: 0 };
  return {
    discount: parseCohort(obj.discount_buyers),
    fullPrice: parseCohort(obj.full_price_buyers),
    repeat_rate_delta_pct: toNum(obj.repeat_rate_delta_pct),
  };
}

export function escCsv(v: string | number | null) {
  return `"${String(v ?? '').replace(/"/g, '""')}"`;
}

export function segmentBadge(segment: string) {
  switch (segment) {
    case 'big_spenders':
      return { label: 'Big Spenders', className: 'border-purple-500/40 bg-purple-500/15 text-purple-300' };
    case 'loyal_browsers':
      return { label: 'Loyal Browsers', className: 'border-blue-500/40 bg-blue-500/15 text-blue-300' };
    case 'promo_hunters':
      return { label: 'Promo Hunters', className: 'border-amber-500/40 bg-amber-500/15 text-amber-300' };
    case 'brand_loyalists':
      return { label: 'Brand Loyalists', className: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300' };
    default:
      return { label: 'Other', className: 'border-border bg-muted text-muted-foreground' };
  }
}

export function downloadCsv(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
