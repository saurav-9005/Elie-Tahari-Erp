'use client';

import { useCallback, useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const CHUNK = 1000;
const CREATED_AT_MIN = '2026-01-01';

type OrderRow = {
  shopify_order_id: string;
  order_name: string | null;
  customer_email: string | null;
  customer_name: string | null;
  total_price: number | null;
  currency: string;
  fulfillment_status: string | null;
  status: string;
  created_at: string;
};

type OverdueOrder = OrderRow & { businessHoursElapsed: number };

function businessHoursElapsed(createdAt: Date): number {
  let hours = 0;
  const current = new Date(createdAt);
  const now = new Date();

  while (current < now) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      hours++;
    }
    current.setHours(current.getHours() + 1);
  }
  return hours;
}

function toOverdueOrders(rows: OrderRow[]): OverdueOrder[] {
  const overdue: OverdueOrder[] = [];
  for (const row of rows) {
    const elapsed = businessHoursElapsed(new Date(row.created_at));
    if (elapsed >= 30) {
      overdue.push({ ...row, businessHoursElapsed: elapsed });
    }
  }
  return overdue;
}

const ORDER_SELECT =
  'shopify_order_id, order_name, customer_email, customer_name, total_price, currency, fulfillment_status, status, created_at';

function exportOrdersToXlsx(orders: OverdueOrder[], fileName: string, sheetName: string) {
  const sheetData: (string | number)[][] = [
    [
      'Order Name',
      'Customer Name',
      'Email',
      'Total Price',
      'Currency',
      'Fulfillment Status',
      'Created At',
      'Business Hours Elapsed',
    ],
    ...orders.map((o) => [
      o.order_name ?? '',
      o.customer_name ?? '',
      o.customer_email ?? '',
      o.total_price != null ? Number(o.total_price) : '',
      o.currency ?? '',
      o.fulfillment_status ?? '',
      new Date(o.created_at).toLocaleString(),
      o.businessHoursElapsed,
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName);
}

const cardFlexStyle = { flex: '1 1 calc(50% - 8px)' } as const;
const cardsRowStyle = { display: 'flex', gap: '16px', flexWrap: 'wrap' as const };

export function DashboardClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overdueOrders, setOverdueOrders] = useState<OverdueOrder[]>([]);
  const [partialOverdueOrders, setPartialOverdueOrders] = useState<OverdueOrder[]>([]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const all: OrderRow[] = [];
      let from = 0;
      for (;;) {
        const { data, error: qErr } = await supabase
          .from('orders')
          .select(ORDER_SELECT)
          .neq('status', 'cancelled')
          .gte('created_at', CREATED_AT_MIN)
          .or('fulfillment_status.is.null,fulfillment_status.eq.unfulfilled,fulfillment_status.eq.partial')
          .range(from, from + CHUNK - 1);
        if (qErr) throw new Error(qErr.message);
        const batch = (data ?? []) as OrderRow[];
        all.push(...batch);
        if (batch.length < CHUNK) break;
        from += CHUNK;
      }
      setOverdueOrders(toOverdueOrders(all));

      const partialAll: OrderRow[] = [];
      from = 0;
      for (;;) {
        const { data, error: partialErr } = await supabase
          .from('orders')
          .select(ORDER_SELECT)
          .neq('status', 'cancelled')
          .gte('created_at', CREATED_AT_MIN)
          .eq('fulfillment_status', 'partial')
          .range(from, from + CHUNK - 1);
        if (partialErr) throw new Error(partialErr.message);
        const batch = (data ?? []) as OrderRow[];
        partialAll.push(...batch);
        if (batch.length < CHUNK) break;
        from += CHUNK;
      }
      setPartialOverdueOrders(toOverdueOrders(partialAll));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load orders');
      setOverdueOrders([]);
      setPartialOverdueOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  const exportXlsx = () => {
    exportOrdersToXlsx(overdueOrders, 'unfulfilled-orders.xlsx', 'Unfulfilled');
  };

  const exportPartialXlsx = () => {
    exportOrdersToXlsx(partialOverdueOrders, 'partial-fulfilled-orders.xlsx', 'Partial');
  };

  const count = overdueOrders.length;
  const partialCount = partialOverdueOrders.length;

  if (loading) {
    return (
      <div style={cardsRowStyle}>
        {[1, 2].map((k) => (
          <Card key={k} className="border-border" style={cardFlexStyle}>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="mt-2 h-4 w-full max-w-xs" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-9 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <div style={cardsRowStyle}>
        <Card className="border-border" style={cardFlexStyle}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Not Fulfilled Within 30 Hrs</CardTitle>
            <p className="text-xs text-muted-foreground">
              Weekday hours only, warehouse closed Sat-Sun
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <p
              className={cn(
                'font-headline text-4xl font-bold tabular-nums',
                count > 0 ? 'text-red-400' : 'text-emerald-400'
              )}
            >
              {count}
            </p>
            <Button type="button" variant="outline" className="border-border" onClick={exportXlsx}>
              Export to Excel
            </Button>
          </CardContent>
        </Card>
        <Card className="border-border" style={cardFlexStyle}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Partially Fulfilled Within 30 Hrs</CardTitle>
            <p className="text-xs text-muted-foreground">
              Weekday hours only, warehouse closed Sat-Sun
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <p
              className={cn(
                'font-headline text-4xl font-bold tabular-nums',
                partialCount > 0 ? 'text-amber-400' : 'text-emerald-400'
              )}
            >
              {partialCount}
            </p>
            <Button type="button" variant="outline" className="border-border" onClick={exportPartialXlsx}>
              Export to Excel
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
