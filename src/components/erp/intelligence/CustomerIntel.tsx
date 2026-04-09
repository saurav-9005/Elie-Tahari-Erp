import { createServiceRoleClient } from '@/lib/supabase/admin';
import { formatInt, formatMoneyFull } from '@/lib/erp/format-dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Segments = {
  vip: number;
  loyal: number;
  one_time: number;
  at_risk: number;
  new_2026: number;
  churned: number;
};

type AvgSeg = {
  vip: number;
  loyal: number;
  at_risk: number;
  one_time: number;
};

type NewRet = {
  this_month_orders: number;
  returning_customers: number;
  new_customers: number;
};

type Trend = {
  this_month_returning_pct: number | null;
  last_month_returning_pct: number | null;
  delta_pct: number | null;
};

const TEAL = '#1D9E75';
const PURPLE = '#534AB7';
const AMBER = '#BA7517';
const GRAY = '#888780';
const RED = '#E24B4A';

export default async function CustomerIntel() {
  const supabase = createServiceRoleClient();
  const [segRes, avgRes, nrRes, trendRes] = await Promise.all([
    supabase.rpc('erp_intelligence_customer_segments'),
    supabase.rpc('erp_intelligence_customer_avg_by_segment'),
    supabase.rpc('erp_intelligence_customer_new_returning'),
    supabase.rpc('erp_intelligence_customer_returning_trend'),
  ]);

  const err =
    segRes.error?.message || avgRes.error?.message || nrRes.error?.message || trendRes.error?.message;

  const segments = (segRes.data || {}) as Segments;
  const avgs = (avgRes.data || {}) as AvgSeg;
  const nr = (nrRes.data || {}) as NewRet;
  const trend = (trendRes.data || {}) as Trend;

  const segmentRows: { key: keyof Segments; label: string; color: string }[] = [
    { key: 'vip', label: 'VIP', color: TEAL },
    { key: 'loyal', label: 'Loyal', color: PURPLE },
    { key: 'at_risk', label: 'At risk', color: AMBER },
    { key: 'one_time', label: 'One-time', color: GRAY },
    { key: 'new_2026', label: 'New in 2026', color: TEAL },
    { key: 'churned', label: 'Churned', color: RED },
  ];

  const maxSeg = Math.max(
    1,
    ...segmentRows.map((r) => Number(segments[r.key]) || 0)
  );

  const avgRows: { key: keyof AvgSeg; label: string }[] = [
    { key: 'vip', label: 'VIP' },
    { key: 'loyal', label: 'Loyal' },
    { key: 'at_risk', label: 'At risk' },
    { key: 'one_time', label: 'One-time' },
  ];
  const maxAvg = Math.max(1, ...avgRows.map((r) => Number(avgs[r.key]) || 0));

  const ret = Number(nr.returning_customers) || 0;
  const neu = Number(nr.new_customers) || 0;
  const dist = ret + neu;
  const pctReturning = dist > 0 ? Math.round((100 * ret) / dist) : 0;
  const pctNew = dist > 0 ? 100 - pctReturning : 0;

  const delta = trend.delta_pct;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="border-border/80 bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Customer segments</CardTitle>
        </CardHeader>
        <CardContent>
          {err ? (
            <p className="text-sm text-destructive">{err}</p>
          ) : (
            <div className="space-y-3">
              {segmentRows.map((row) => {
                const n = Number(segments[row.key]) || 0;
                const w = (n / maxSeg) * 100;
                return (
                  <div key={row.key}>
                    <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                      <span>{row.label}</span>
                    </div>
                    <div className="h-8 w-full overflow-hidden rounded-md bg-muted/40">
                      <div
                        className="flex h-full items-center justify-end px-2 text-xs font-semibold text-white"
                        style={{
                          width: `${Math.max(w, n > 0 ? 12 : 0)}%`,
                          backgroundColor: row.color,
                          minWidth: n > 0 ? '2.5rem' : 0,
                        }}
                      >
                        {n > 0 ? formatInt(n) : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Avg order value by segment</CardTitle>
        </CardHeader>
        <CardContent>
          {err ? (
            <p className="text-sm text-destructive">{err}</p>
          ) : (
            <div className="space-y-4">
              {avgRows.map((row) => {
                const v = Number(avgs[row.key]) || 0;
                const pct = (v / maxAvg) * 100;
                return (
                  <div key={row.key} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-sm text-foreground">{row.label}</span>
                    <div className="min-w-0 flex-1">
                      <div
                        className="h-3 rounded-sm"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: PURPLE,
                          minWidth: v > 0 ? '4px' : 0,
                        }}
                      />
                    </div>
                    <span className="w-24 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                      {formatMoneyFull(v)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">New vs returning this month</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {err ? (
            <p className="text-sm text-destructive">{err}</p>
          ) : dist === 0 ? (
            <p className="text-sm text-muted-foreground">No 2026 orders this month yet.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-3xl font-semibold tabular-nums text-[#534AB7]">{pctReturning}%</p>
                  <p className="text-xs text-muted-foreground">Returning</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-semibold tabular-nums text-[#1D9E75]">{pctNew}%</p>
                  <p className="text-xs text-muted-foreground">New</p>
                </div>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div className="flex h-full w-full">
                  <div
                    className="h-full bg-[#534AB7]"
                    style={{ width: `${pctReturning}%` }}
                  />
                  <div
                    className="h-full bg-[#1D9E75]"
                    style={{ width: `${pctNew}%` }}
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {delta == null ? (
                  'Returning rate trend vs last month — not enough data.'
                ) : (
                  <>
                    Returning rate {delta >= 0 ? 'up' : 'down'}{' '}
                    <span className="font-medium text-foreground">{Math.abs(delta)}%</span> vs last month
                  </>
                )}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
