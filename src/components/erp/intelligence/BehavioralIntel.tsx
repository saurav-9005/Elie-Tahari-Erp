import { createServiceRoleClient } from '@/lib/supabase/admin';
import { formatInt, formatMoneyFull, formatMoneyShort } from '@/lib/erp/format-dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Summary = {
  orders_today: number;
  revenue_today: number;
  avg_order_today: number;
  orders_week: number;
  revenue_week: number;
  avg_order_2026: number;
  best_day_name: string | null;
  best_day_orders: number | null;
  best_day_revenue: number | null;
};

function hourCellLabel(h: number): string {
  if (h === 0) return '12a';
  if (h < 12) return `${h}a`;
  if (h === 12) return '12p';
  return `${h - 12}p`;
}

function lerpChannel(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function heatBg(count: number, max: number): string {
  if (max <= 0) return '#EEEDFE';
  const t = Math.min(1, count / max);
  const r = lerpChannel(0xee, 0x3c, t);
  const g = lerpChannel(0xed, 0x34, t);
  const b = lerpChannel(0xfe, 0x89, t);
  return `rgb(${r},${g},${b})`;
}

function peakLabel(counts: number[]): string {
  const max = Math.max(0, ...counts);
  if (max === 0) return '—';
  const strong = counts.map((c) => (max > 0 && c >= max * 0.85 ? 1 : 0));
  let start = -1;
  let end = -1;
  for (let i = 0; i < 24; i++) {
    if (strong[i]) {
      if (start < 0) start = i;
      end = i;
    }
  }
  if (start < 0) {
    const hi = counts.indexOf(max);
    return `${hourCellLabel(hi)} · Best for flash sales`;
  }
  if (start === end) {
    return `${hourCellLabel(start)} · Best for flash sales`;
  }
  return `${hourCellLabel(start)}–${hourCellLabel(end)} · Best for flash sales`;
}

export default async function BehavioralIntel() {
  const supabase = createServiceRoleClient();
  const [hoursRes, summaryRes] = await Promise.all([
    supabase.rpc('erp_intelligence_behavior_hours'),
    supabase.rpc('erp_intelligence_behavior_summary'),
  ]);

  const err = hoursRes.error?.message || summaryRes.error?.message;
  const counts = Array.isArray(hoursRes.data)
    ? (hoursRes.data as number[]).map((n) => Number(n) || 0)
    : Array(24).fill(0);

  while (counts.length < 24) counts.push(0);
  const hourCounts = counts.slice(0, 24);

  const summary = (summaryRes.data || {}) as Summary;
  const maxH = Math.max(0, ...hourCounts);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="border-border/80 bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Best hours to run promotions</CardTitle>
        </CardHeader>
        <CardContent>
          {err ? (
            <p className="text-sm text-destructive">{err}</p>
          ) : (
            <>
              <p className="mb-3 text-xs text-muted-foreground">Orders by hour — darker = more orders</p>
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-1">
                  {hourCounts.slice(0, 12).map((c, i) => (
                    <div
                      key={i}
                      className="flex aspect-square items-center justify-center rounded text-[10px] font-medium text-[#3C3489]/90"
                      style={{ backgroundColor: heatBg(c, maxH) }}
                    >
                      {hourCellLabel(i)}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-12 gap-1">
                  {hourCounts.slice(12, 24).map((c, i) => (
                    <div
                      key={i + 12}
                      className="flex aspect-square items-center justify-center rounded text-[10px] font-medium text-[#3C3489]/90"
                      style={{ backgroundColor: heatBg(c, maxH) }}
                    >
                      {hourCellLabel(i + 12)}
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Peak: {peakLabel(hourCounts)}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Daily summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {err ? (
            <p className="text-destructive">{err}</p>
          ) : (
            <>
              <div className="space-y-1 border-b border-border/80 pb-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Today (UTC)</p>
                <p className="text-foreground">
                  <span className="font-semibold">{formatInt(Number(summary.orders_today))}</span> orders ·{' '}
                  {formatMoneyFull(Number(summary.revenue_today))} revenue
                </p>
                <p className="text-muted-foreground">
                  Avg order today: {formatMoneyFull(Number(summary.avg_order_today))} · 2026 avg:{' '}
                  {formatMoneyFull(Number(summary.avg_order_2026))}
                </p>
              </div>
              <div className="space-y-1 border-b border-border/80 pb-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">This week</p>
                <p className="text-foreground">
                  <span className="font-semibold">{formatInt(Number(summary.orders_week))}</span> orders ·{' '}
                  {formatMoneyShort(Number(summary.revenue_week))} revenue
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Best day in 2026</p>
                <p className="text-foreground">
                  {summary.best_day_name ? (
                    <>
                      <span className="font-semibold">{summary.best_day_name}</span> is your best day (
                      {formatMoneyShort(Number(summary.best_day_revenue))} revenue,{' '}
                      {formatInt(Number(summary.best_day_orders))} orders)
                    </>
                  ) : (
                    '—'
                  )}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
