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
  first_inventory_date: string | null;
  current_qty: number;
  units_sold: number;
  estimated_initial_qty: number;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'oversold';
};

function csv(rows: Row[]) {
  const header = [
    'SKU',
    'Title',
    'Product Type',
    'Vendor',
    'First Order Date (2026)',
    'Estimated Initial Qty',
    'Units Sold (2026)',
    'Current Stock',
    'Status',
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
        esc(r.first_inventory_date),
        esc(r.estimated_initial_qty),
        esc(r.units_sold),
        esc(r.current_qty),
        esc(r.stock_status),
      ].join(',')
    ),
  ].join('\n');
}

export function WmsClient({
  rows,
  page,
  hasNext,
}: {
  rows: Row[];
  page: number;
  hasNext: boolean;
}) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [type, setType] = useState<string>('all');
  const [vendor, setVendor] = useState<string>('all');

  const types = useMemo(() => Array.from(new Set(rows.map((r) => r.product_type).filter(Boolean))) as string[], [rows]);
  const vendors = useMemo(() => Array.from(new Set(rows.map((r) => r.vendor).filter(Boolean))) as string[], [rows]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (s && !r.sku.toLowerCase().includes(s) && !r.title.toLowerCase().includes(s)) return false;
      if (status !== 'all' && r.stock_status !== status) return false;
      if (type !== 'all' && (r.product_type ?? '') !== type) return false;
      if (vendor !== 'all' && (r.vendor ?? '') !== vendor) return false;
      return true;
    });
  }, [rows, q, status, type, vendor]);

  const exportCsv = () => {
    const blob = new Blob([csv(filtered)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wms-2026-page-${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-muted-foreground">
        First inventory date = date of first order containing this SKU in 2026. Estimated initial qty
        = current stock + units sold in 2026.
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <Input placeholder="Search SKU or title" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="in_stock">In stock</SelectItem>
            <SelectItem value="low_stock">Low stock</SelectItem>
            <SelectItem value="out_of_stock">Out of stock</SelectItem>
            <SelectItem value="oversold">Oversold</SelectItem>
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
            <TableHead>Product title</TableHead>
            <TableHead>Type / Vendor</TableHead>
            <TableHead>First order date (2026)</TableHead>
            <TableHead className="text-right">Estimated initial qty</TableHead>
            <TableHead className="text-right">Units sold (2026)</TableHead>
            <TableHead className="text-right">Current stock</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((r) => (
            <TableRow key={`${r.sku}-${r.title}`}>
              <TableCell className="font-mono text-xs">{r.sku}</TableCell>
              <TableCell className="font-medium">{r.title}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{r.product_type ?? '—'} / {r.vendor ?? '—'}</TableCell>
              <TableCell className="text-xs">{r.first_inventory_date ? new Date(r.first_inventory_date).toLocaleDateString() : '—'}</TableCell>
              <TableCell className="text-right">{r.estimated_initial_qty.toLocaleString('en-US')}</TableCell>
              <TableCell className="text-right">{r.units_sold.toLocaleString('en-US')}</TableCell>
              <TableCell className="text-right">{r.current_qty.toLocaleString('en-US')}</TableCell>
              <TableCell>
                <Badge variant={r.stock_status === 'out_of_stock' || r.stock_status === 'oversold' ? 'destructive' : 'secondary'}>
                  {r.stock_status.replace('_', ' ')}
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
            <a href={`/erp/inventory/wms?page=${Math.max(1, page - 1)}`}>Previous</a>
          </Button>
          <Button asChild variant="outline" size="sm" disabled={!hasNext}>
            <a href={`/erp/inventory/wms?page=${page + 1}`}>Next</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
