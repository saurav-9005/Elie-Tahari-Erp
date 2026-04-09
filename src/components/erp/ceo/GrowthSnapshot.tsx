import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { GrowthSnapshotData } from './ceo-types';

function fmtMoney(n: number) {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

function fmtPctChange(cur: number, prev: number) {
  if (prev === 0) return null;
  return ((cur - prev) / prev) * 100;
}

type Props = {
  data: GrowthSnapshotData | null;
  errorMessage?: string | null;
};

export function GrowthSnapshot({ data, errorMessage }: Props) {
  if (errorMessage) {
    return (
      <Card className="bg-card border-destructive/40">
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">{errorMessage}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data || (data.revenue_ytd === 0 && data.orders_mtd === 0)) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className="bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">—</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No 2026 data found for this metric</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const revChange = fmtPctChange(data.revenue_mtd, data.revenue_last_month);
  const aovChange = fmtPctChange(data.aov_mtd, data.aov_last_month);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card className="bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Revenue MTD</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="font-headline text-3xl font-bold tracking-tight">
            {fmtMoney(data.revenue_mtd)}
          </p>
          <p className="text-xs text-muted-foreground">
            vs last month {fmtMoney(data.revenue_last_month)}
          </p>
          {revChange !== null && (
            <p
              className={`text-sm font-medium ${revChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}
            >
              {revChange >= 0 ? '▲' : '▼'} {Math.abs(revChange).toFixed(1)}%
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Revenue today</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="font-headline text-3xl font-bold tracking-tight">
            {fmtMoney(data.revenue_today)}
          </p>
          <p className="text-xs text-muted-foreground">
            {data.orders_today.toLocaleString('en-US')} orders today
          </p>
          <p className="text-xs text-muted-foreground">YTD {fmtMoney(data.revenue_ytd)}</p>
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">AOV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="font-headline text-3xl font-bold tracking-tight">
            {fmtMoney(data.aov_mtd)}
          </p>
          <p className="text-xs text-muted-foreground">
            vs last month {fmtMoney(data.aov_last_month)}
          </p>
          {aovChange !== null && (
            <p
              className={`text-sm font-medium ${aovChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}
            >
              {aovChange >= 0 ? '▲' : '▼'} {Math.abs(aovChange).toFixed(1)}%
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Repeat purchase rate
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="font-headline text-3xl font-bold tracking-tight">
            {data.repeat_rate.toLocaleString('en-US', {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}
            %
          </p>
          <p className="text-xs text-muted-foreground">
            {data.new_customers_mtd.toLocaleString('en-US')} new customers this month
          </p>
          <p className="text-xs text-muted-foreground">Loyalty health indicator</p>
        </CardContent>
      </Card>
    </div>
  );
}
