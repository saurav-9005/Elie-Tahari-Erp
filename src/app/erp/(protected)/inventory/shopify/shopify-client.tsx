'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Row = {
  sku: string;
  title: string;
  product_type: string | null;
  vendor: string | null;
  current_stock: number;
  qty_sold: number;
  qty_returned: number;
  net_sold: number;
  gross_revenue: number;
  order_count: number;
  return_rate_pct: number;
};

function bucket(rate: number) {
  if (rate < 5) return 'low';
  if (rate <= 15) return 'mid';
  return 'high';
}

function csv(rows: Row[]) {
  const header = [
    'SKU',
    'Title',
    'Type',
    'Vendor',
    'Current stock',
    'Qty sold',
    'Qty returned',
    'Net sold',
    'Gross revenue',
    'Orders',
    'Return rate %',
  ];
  const esc = (v: string | number | null) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [
    header.join(','),
    ...rows.map((r) =>
      [
        esc(r.sku),
        esc(r.title),
        esc(r.product_type),
        esc(r.vendor),
        esc(r.current_stock),
        esc(r.qty_sold),
        esc(r.qty_returned),
        esc(r.net_sold),
        esc(r.gross_revenue),
        esc(r.order_count),
        esc(r.return_rate_pct),
      ].join(',')
    ),
  ].join('\n');
}

export function ShopifyInventoryClient({
  rows,
  page,
  hasNext,
}: {
  rows: Row[];
  page: number;
  hasNext: boolean;
}) {
  const [q, setQ] = useState('');
  const [rateFilter, setRateFilter] = useState('all');
  const [type, setType] = useState('all');
  const [vendor, setVendor] = useState('all');

  const types = useMemo(() => Array.from(new Set(rows.map((r) => r.product_type).filter(Boolean))) as string[], [rows]);
  const vendors = useMemo(() => Array.from(new Set(rows.map((r) => r.vendor).filter(Boolean))) as string[], [rows]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (s && !r.sku.toLowerCase().includes(s) && !r.title.toLowerCase().includes(s)) return false;
      if (rateFilter !== 'all' && bucket(r.return_rate_pct) !== rateFilter) return false;
      if (type !== 'all' && (r.product_type ?? '') !== type) return false;
      if (vendor !== 'all' && (r.vendor ?? '') !== vendor) return false;
      return true;
    });
  }, [rows, q, rateFilter, type, vendor]);

  const exportCsv = () => {
    const blob = new Blob([csv(filtered)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shopify-inventory-2026-page-${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <Input placeholder="Search SKU or title" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={rateFilter} onValueChange={setRateFilter}>
          <SelectTrigger><SelectValue placeholder="Return rate" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All return rates</SelectItem>
            <SelectItem value="low">Green {'<'} 5%</SelectItem>
            <SelectItem value="mid">Amber 5-15%</SelectItem>
            <SelectItem value="high">Red {'>'} 15%</SelectItem>
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger><SelectValue placeholder="Product type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={vendor} onValueChange={setVendor}>
          <SelectTrigger><SelectValue placeholder="Vendor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All vendors</SelectItem>
            {vendors.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportCsv}>Export CSV</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>SKU</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Type / Vendor</TableHead>
            <TableHead className="text-right">Current stock</TableHead>
            <TableHead className="text-right">Qty sold</TableHead>
            <TableHead className="text-right">Qty returned</TableHead>
            <TableHead className="text-right">Net sold</TableHead>
            <TableHead className="text-right">Gross revenue</TableHead>
            <TableHead className="text-right">Orders</TableHead>
            <TableHead className="text-right">Return rate %</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((r) => (
            <TableRow key={`${r.sku}-${r.title}`}>
              <TableCell className="font-mono text-xs">{r.sku}</TableCell>
              <TableCell className="font-medium">{r.title}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{r.product_type ?? '—'} / {r.vendor ?? '—'}</TableCell>
              <TableCell className="text-right">{r.current_stock.toLocaleString('en-US')}</TableCell>
              <TableCell className="text-right">{r.qty_sold.toLocaleString('en-US')}</TableCell>
              <TableCell className="text-right">{r.qty_returned.toLocaleString('en-US')}</TableCell>
              <TableCell className="text-right">{r.net_sold.toLocaleString('en-US')}</TableCell>
              <TableCell className="text-right">${r.gross_revenue.toLocaleString('en-US', { maximumFractionDigits: 2 })}</TableCell>
              <TableCell className="text-right">{r.order_count.toLocaleString('en-US')}</TableCell>
              <TableCell className="text-right">
                <Badge variant={bucket(r.return_rate_pct) === 'high' ? 'destructive' : 'secondary'}>
                  {r.return_rate_pct.toLocaleString('en-US', { maximumFractionDigits: 1 })}%
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Page {page} · 50 per page</p>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" disabled={page <= 1}>
            <a href={`/erp/inventory/shopify?page=${Math.max(1, page - 1)}`}>Previous</a>
          </Button>
          <Button asChild variant="outline" size="sm" disabled={!hasNext}>
            <a href={`/erp/inventory/shopify?page=${page + 1}`}>Next</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
