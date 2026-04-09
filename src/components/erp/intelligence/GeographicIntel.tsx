import { createServiceRoleClient } from '@/lib/supabase/admin';
import { formatInt, formatMoneyShort } from '@/lib/erp/format-dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type StateRow = { state: string; state_code: string; orders: number; revenue: number };
type CityRow = { city: string; revenue: number };

const PURPLE = '#534AB7';

export default async function GeographicIntel() {
  const supabase = createServiceRoleClient();
  const [statesRes, citiesRes] = await Promise.all([
    supabase.rpc('erp_intelligence_geo_by_state'),
    supabase.rpc('erp_intelligence_geo_top_cities'),
  ]);

  const states = (Array.isArray(statesRes.data) ? statesRes.data : []) as StateRow[];
  const cities = (Array.isArray(citiesRes.data) ? citiesRes.data : []) as CityRow[];

  const err = statesRes.error?.message || citiesRes.error?.message;
  const empty = !err && states.length === 0 && cities.length === 0;

  const top5 = states.slice(0, 5);
  const maxRev = Math.max(0, ...cities.map((c) => Number(c.revenue) || 0));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="border-border/80 bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Orders by state</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {err ? (
            <p className="text-sm text-destructive">{err}</p>
          ) : empty ? (
            <p className="text-sm text-muted-foreground">No 2026 shipping data yet.</p>
          ) : (
            <>
              <div className="flex h-28 items-center justify-center rounded-md bg-[#888780]/20 text-center text-xs text-muted-foreground">
                US heatmap — darker = more orders
              </div>
              <div className="divide-y divide-border/80">
                {top5.map((row) => (
                  <div key={`${row.state}-${row.state_code}`} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 text-sm first:pt-0 last:pb-0">
                    <span className="font-medium text-foreground">{row.state || row.state_code || '—'}</span>
                    <span className="text-muted-foreground">
                      {formatInt(Number(row.orders))} orders · {formatMoneyShort(Number(row.revenue))}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Top cities by revenue</CardTitle>
        </CardHeader>
        <CardContent>
          {err ? (
            <p className="text-sm text-destructive">{err}</p>
          ) : cities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No 2026 city data yet.</p>
          ) : (
            <div className="space-y-4">
              {cities.map((row, i) => {
                const rev = Number(row.revenue) || 0;
                const pct = maxRev > 0 ? (rev / maxRev) * 100 : 0;
                const shade = 1 - (i / Math.max(cities.length - 1, 1)) * 0.45;
                const barAlpha = 0.35 + shade * 0.65;
                return (
                  <div key={row.city} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 truncate text-sm font-medium text-foreground">{row.city}</span>
                    <div className="min-w-0 flex-1">
                      <div
                        className="h-3 rounded-sm transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: PURPLE,
                          opacity: barAlpha,
                        }}
                      />
                    </div>
                    <span className="w-20 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                      {formatMoneyShort(rev)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
