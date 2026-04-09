import { createServiceRoleClient } from '@/lib/supabase/admin';
import { formatInt } from '@/lib/erp/format-dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const TEAL = '#1D9E75';

type TopRow = { product: string; units_sold: number };
type TrendRow = { product: string; this_week: number; last_week: number; pct_change: number };
type NoDiscRow = { product: string; units_sold: number };

export default async function ProductIntel() {
  const supabase = createServiceRoleClient();
  const [topRes, trendRes, noDiscRes] = await Promise.all([
    supabase.rpc('erp_intelligence_product_top_week'),
    supabase.rpc('erp_intelligence_product_trending'),
    supabase.rpc('erp_intelligence_product_never_discounted'),
  ]);

  const top = (Array.isArray(topRes.data) ? topRes.data : []) as TopRow[];
  const trending = (Array.isArray(trendRes.data) ? trendRes.data : []) as TrendRow[];
  const noDisc = (Array.isArray(noDiscRes.data) ? noDiscRes.data : []) as NoDiscRow[];

  const err = topRes.error?.message || trendRes.error?.message || noDiscRes.error?.message;
  const maxUnits = Math.max(0, ...top.map((r) => Number(r.units_sold) || 0));

  const rising = trending.filter((t) => t.pct_change != null && Number(t.pct_change) > 10);
  const declining = trending.filter((t) => t.pct_change != null && Number(t.pct_change) < -10);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="border-border/80 bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Top selling products this week</CardTitle>
        </CardHeader>
        <CardContent>
          {err ? (
            <p className="text-sm text-destructive">{err}</p>
          ) : top.length === 0 ? (
            <p className="text-sm text-muted-foreground">No 2026 line items in the last 7 days.</p>
          ) : (
            <div className="space-y-4">
              {top.map((row) => {
                const u = Number(row.units_sold) || 0;
                const pct = maxUnits > 0 ? (u / maxUnits) * 100 : 0;
                return (
                  <div key={row.product} className="flex items-center gap-3">
                    <span className="w-40 shrink-0 truncate text-sm font-medium text-foreground md:w-48">
                      {row.product}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div
                        className="h-3 rounded-sm"
                        style={{ width: `${pct}%`, backgroundColor: TEAL, minWidth: u > 0 ? '4px' : 0 }}
                      />
                    </div>
                    <span className="w-16 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                      {formatInt(u)} sold
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
          <CardTitle className="text-base font-medium">Trending this week</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {err ? (
            <p className="text-sm text-destructive">{err}</p>
          ) : (
            <>
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Rising</p>
                <div className="flex flex-wrap gap-2">
                  {rising.length === 0 ? (
                    <span className="text-sm text-muted-foreground">None &gt; +10%</span>
                  ) : (
                    rising.slice(0, 8).map((t) => (
                      <span
                        key={t.product}
                        className="rounded-full bg-[#1D9E75]/20 px-3 py-1 text-xs font-medium text-[#1D9E75]"
                      >
                        {t.product} +{Number(t.pct_change)}%
                      </span>
                    ))
                  )}
                </div>
              </div>
              <div className="border-t border-border/80 pt-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Declining</p>
                <div className="flex flex-wrap gap-2">
                  {declining.length === 0 ? (
                    <span className="text-sm text-muted-foreground">None &lt; −10%</span>
                  ) : (
                    declining.slice(0, 8).map((t) => (
                      <span
                        key={t.product}
                        className="rounded-full bg-[#E24B4A]/20 px-3 py-1 text-xs font-medium text-[#E24B4A]"
                      >
                        {t.product} {Number(t.pct_change)}%
                      </span>
                    ))
                  )}
                </div>
              </div>
              <div className="border-t border-border/80 pt-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Never discounted but always sold</p>
                <div className="flex flex-wrap gap-2">
                  {noDisc.length === 0 ? (
                    <span className="text-sm text-muted-foreground">No products without discount allocations.</span>
                  ) : (
                    noDisc.map((n) => (
                      <span
                        key={n.product}
                        className="rounded-full px-3 py-1 text-xs font-medium text-[#534AB7]"
                        style={{ backgroundColor: 'rgba(83, 74, 183, 0.15)' }}
                      >
                        {n.product}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
