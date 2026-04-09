import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ParetoRow, SellThroughRow, StockRiskRow } from './ceo-types';
import { ProductHealthParetoChart } from './ProductHealthParetoChart';

function rowTint(status: string) {
  if (status === 'critical') return 'bg-red-500/10';
  if (status === 'warning') return 'bg-amber-500/10';
  return '';
}

function sellBarClass(cat: SellThroughRow['category']) {
  if (cat === 'fast_seller') return 'bg-emerald-500';
  if (cat === 'slow_mover') return 'bg-red-500';
  if (cat === 'dead_stock') return 'bg-muted-foreground/40';
  return 'bg-primary/70';
}

type Props = {
  stockRisk: StockRiskRow[] | null;
  pareto: ParetoRow[] | null;
  sellThrough: SellThroughRow[] | null;
  errors?: {
    stock?: string | null;
    pareto?: string | null;
    sell?: string | null;
  };
};

export function ProductHealth({ stockRisk, pareto, sellThrough, errors }: Props) {
  const fast = sellThrough?.filter((r) => r.category === 'fast_seller').length ?? 0;
  const slow = sellThrough?.filter((r) => r.category === 'slow_mover').length ?? 0;
  const dead = sellThrough?.filter((r) => r.category === 'dead_stock').length ?? 0;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="bg-card lg:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Stock-out risk</CardTitle>
        </CardHeader>
        <CardContent>
          {errors?.stock ? (
            <p className="text-sm text-destructive">{errors.stock}</p>
          ) : !stockRisk?.length ? (
            <p className="text-sm text-muted-foreground">No 2026 data found for this metric</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Daily sales</TableHead>
                  <TableHead className="text-right">Days left</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockRisk.map((r) => (
                  <TableRow key={`${r.sku ?? r.title}`} className={rowTint(r.status)}>
                    <TableCell className="max-w-[140px] truncate font-medium">
                      <Link
                        href={`/erp/inventory?q=${encodeURIComponent(r.title)}`}
                        className="hover:underline"
                      >
                        {r.title}
                      </Link>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {r.status === 'critical' && (
                          <Badge variant="destructive" className="text-[10px]">
                            Reorder now
                          </Badge>
                        )}
                        {r.status === 'warning' && (
                          <Badge
                            variant="outline"
                            className="border-amber-600/50 text-[10px] text-amber-600"
                          >
                            Watch
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{r.stock.toLocaleString('en-US')}</TableCell>
                    <TableCell className="text-right">
                      {r.daily_velocity.toLocaleString('en-US', { maximumFractionDigits: 1 })}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.days_remaining == null ? '—' : r.days_remaining.toLocaleString('en-US')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ProductHealthParetoChart rows={pareto ?? []} emptyMessage={errors?.pareto ?? undefined} />

      <Card className="bg-card lg:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Sell-through by product</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {errors?.sell ? (
            <p className="text-sm text-destructive">{errors.sell}</p>
          ) : !sellThrough?.length ? (
            <p className="text-sm text-muted-foreground">No 2026 data found for this metric</p>
          ) : (
            <>
              <ul className="max-h-[260px] space-y-3 overflow-y-auto pr-1">
                {sellThrough.map((r) => (
                  <li key={`${r.sku ?? r.title}`} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-medium">{r.title}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {r.sell_through.toLocaleString('en-US', { maximumFractionDigits: 1 })}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${sellBarClass(r.category)}`}
                        style={{ width: `${Math.min(100, Math.max(0, r.sell_through))}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {r.category === 'fast_seller' && (
                        <span className="text-emerald-600">Fast seller</span>
                      )}
                      {r.category === 'slow_mover' && <span className="text-red-500">Slow mover</span>}
                      {r.category === 'dead_stock' && <span className="text-muted-foreground">Dead stock</span>}
                      {r.category === 'normal' && <span>Normal</span>}
                    </p>
                  </li>
                ))}
              </ul>
              <p className="border-t border-border pt-2 text-xs text-muted-foreground">
                {fast.toLocaleString('en-US')} fast sellers · {slow.toLocaleString('en-US')} slow movers
                · {dead.toLocaleString('en-US')} dead stock
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
