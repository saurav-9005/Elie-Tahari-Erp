'use client';

import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createClient } from '@/lib/supabase/client';

type Row = {
  sku: string;
  color: string | null;
  color_desc: string | null;
  size: string | null;
  ats_qty: number;
  shopify_qty: number;
  difference: number;
};

type MismatchRow = {
  style: string;
  color: string;
  size: string;
  wms_barcode: string;
  shopify_barcode: string;
};

type AtsRawRow = { sku: string; color: string | null; color_desc: string | null; size: string | null; ots_qoh: number };
type ShopifyRawRow = { sku: string; quantity: number };
type ProductVariantMismatchRow = { sku: string; size: string | null; color: string | null };

function asText(v: unknown): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t.length > 0 ? t : null;
}

function asNum(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function normalizeSkuKey(sku: string): string {
  return sku.trim().toLowerCase();
}

function shouldExcludeSku(sku: string): boolean {
  const s = sku.toLowerCase();
  return s.startsWith('protect-') || s.startsWith('gift-card') || s === 'whseserv-190553878680';
}

function splitSkuParts(sku: string): { style: string; barcode: string } {
  const [styleRaw, barcodeRaw] = sku.split('-');
  return {
    style: (styleRaw ?? '').trim(),
    barcode: (barcodeRaw ?? '').trim(),
  };
}

async function fetchAllProductVariants(supabase: ReturnType<typeof createClient>, atsSkus: string[]) {
  const allRows: ShopifyRawRow[] = [];
  const chunkSize = 200;
  if (atsSkus.length === 0) return allRows;

  for (let i = 0; i < atsSkus.length; i += chunkSize) {
    const skuChunk = atsSkus.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('inventory' as never)
      .select('sku,quantity')
      .in('sku', skuChunk);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) continue;
    allRows.push(...(data as typeof allRows));
  }
  return allRows;
}

async function fetchProductVariantsForMismatch(
  supabase: ReturnType<typeof createClient>,
  atsSkus: string[]
) {
  const allRows: ProductVariantMismatchRow[] = [];
  const chunkSize = 200;
  if (atsSkus.length === 0) return allRows;

  for (let i = 0; i < atsSkus.length; i += chunkSize) {
    const skuChunk = atsSkus.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('product_variants' as never)
      .select('sku,size,color')
      .in('sku', skuChunk);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) continue;
    allRows.push(...(data as typeof allRows));
  }
  return allRows;
}

async function fetchAllAtsInventory(supabase: ReturnType<typeof createClient>) {
  const allRows: AtsRawRow[] = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('ats_inventory_wms' as never)
      .select('sku,color,color_desc,size,ots_qoh')
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    allRows.push(...(data as typeof allRows));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return allRows;
}

async function fetchInventoryPositiveQty(supabase: ReturnType<typeof createClient>) {
  const allRows: ShopifyRawRow[] = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('inventory' as never)
      .select('sku,quantity')
      .gt('quantity', 0)
      .order('sku', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    allRows.push(...(data as typeof allRows));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return allRows.filter((row) => row.sku != null && row.sku !== '');
}

async function fetchNegativeInventory(supabase: ReturnType<typeof createClient>) {
  const allRows: ShopifyRawRow[] = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('inventory' as never)
      .select('sku,quantity')
      .lt('quantity', 0)
      .order('sku', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    allRows.push(...(data as typeof allRows));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return allRows.filter((row) => row.sku != null && row.sku !== '');
}

async function fetchAllAtsForMismatch(supabase: ReturnType<typeof createClient>) {
  const allRows: Array<{ sku: string; color_desc: string | null; size: string | null }> = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('ats_inventory_wms' as never)
      .select('sku,color_desc,size')
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    allRows.push(...(data as typeof allRows));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return allRows.filter((row) => row.sku != null && row.sku !== '');
}

async function fetchAllProductVariantsForMismatch(supabase: ReturnType<typeof createClient>) {
  const allRows: Array<{ sku: string; color: string | null; size: string | null }> = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('product_variants' as never)
      .select('sku,color,size')
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    allRows.push(...(data as typeof allRows));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return allRows.filter((row) => row.sku != null && row.sku !== '');
}

export function ReconciliationClient() {
  const PAGE_SIZE = 50;
  const [rows, setRows] = useState<Row[]>([]);
  const [joinedRowsBeforeFilter, setJoinedRowsBeforeFilter] = useState<Row[]>([]);
  const [atsRawRows, setAtsRawRows] = useState<AtsRawRow[]>([]);
  const [productVariantRows, setProductVariantRows] = useState<ProductVariantMismatchRow[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shopifyNotInWmsRows, setShopifyNotInWmsRows] = useState<Array<{ sku: string; shopify_qty: number }>>([]);
  const [negativeShopifyRows, setNegativeShopifyRows] = useState<Array<{ sku: string; shopify_qty: number }>>([]);
  const [mismatches, setMismatches] = useState<MismatchRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    (async () => {
      try {
        const atsRows = await fetchAllAtsInventory(supabase);
        const atsSkus = Array.from(
          new Set(
            atsRows
              .map((row) => asText(row.sku))
              .filter((sku): sku is string => Boolean(sku))
          )
        );
        const [shopifyRows, productVariantRows, positiveInventoryRows, negativeInventoryRows, atsMismatchRows, variantMismatchRows] = await Promise.all([
          fetchAllProductVariants(supabase, atsSkus),
          fetchProductVariantsForMismatch(supabase, atsSkus),
          fetchInventoryPositiveQty(supabase),
          fetchNegativeInventory(supabase),
          fetchAllAtsForMismatch(supabase),
          fetchAllProductVariantsForMismatch(supabase),
        ]);

        if (cancelled) return;
        setAtsRawRows(atsRows);
        setProductVariantRows(productVariantRows);

        const atsMap = new Map<string, { sku: string; color: string | null; color_desc: string | null; size: string | null; ats_qty: number }>();
        for (const item of atsRows) {
          const row = (item ?? {}) as Record<string, unknown>;
          const sku = asText(row.sku);
          if (!sku) continue;
          const normalizedSku = normalizeSkuKey(sku);
          const existingAts = atsMap.get(normalizedSku);
          const nextQty = (existingAts?.ats_qty ?? 0) + asNum(row.ots_qoh);
          atsMap.set(normalizedSku, {
            sku,
            color: existingAts?.color ?? asText(row.color),
            color_desc: existingAts?.color_desc ?? asText(row.color_desc),
            size: existingAts?.size ?? asText(row.size),
            ats_qty: nextQty,
          });
        }

        const shopifyMap = new Map<string, { original_sku: string; shopify_qty: number }>();
        for (const item of shopifyRows) {
          const row = (item ?? {}) as Record<string, unknown>;
          const sku = asText(row.sku);
          if (!sku) continue;
          const normalizedSku = normalizeSkuKey(sku);
          const existingShopify = shopifyMap.get(normalizedSku);
          const nextQty = (existingShopify?.shopify_qty ?? 0) + asNum(row.quantity);
          shopifyMap.set(normalizedSku, {
            original_sku: existingShopify?.original_sku ?? sku,
            shopify_qty: nextQty,
          });
        }
        console.log('Shopify has E4018206:', shopifyMap.has('e4018206-190553002153'));
        console.log('Shopify qty:', shopifyMap.get('e4018206-190553002153'));

        const positiveByNorm = new Map<string, { sku: string; shopify_qty: number }>();
        for (const item of positiveInventoryRows) {
          const row = (item ?? {}) as Record<string, unknown>;
          const sku = asText(row.sku);
          if (!sku) continue;
          const key = normalizeSkuKey(sku);
          const qty = asNum(row.quantity);
          if (qty <= 0) continue;
          const existing = positiveByNorm.get(key);
          positiveByNorm.set(key, {
            sku: existing?.sku ?? sku,
            shopify_qty: (existing?.shopify_qty ?? 0) + qty,
          });
        }
        const shopifyOnlyList: Array<{ sku: string; shopify_qty: number }> = [];
        for (const [key, v] of positiveByNorm) {
          if (shouldExcludeSku(v.sku)) continue;
          if (atsMap.has(key)) continue;
          shopifyOnlyList.push({ sku: v.sku, shopify_qty: v.shopify_qty });
        }
        shopifyOnlyList.sort((a, b) => (a.sku ?? '').localeCompare(b.sku ?? ''));
        if (!cancelled) setShopifyNotInWmsRows(shopifyOnlyList);
        const negativeList = negativeInventoryRows
          .map((row) => ({
            sku: row.sku,
            shopify_qty: row.quantity,
          }))
          .sort((a, b) => (a.sku ?? '').localeCompare(b.sku ?? ''));
        if (!cancelled) setNegativeShopifyRows(negativeList);

        const atsMismatchMap = new Map<string, { style: string; color: string; size: string; barcode: string }>();
        for (const row of atsMismatchRows) {
          const sku = (row.sku ?? '').trim();
          if (!sku || !sku.includes('-')) continue;
          const [styleRaw, barcodeRaw] = sku.split('-');
          const style = (styleRaw ?? '').trim();
          const barcode = (barcodeRaw ?? '').trim();
          const color = (row.color_desc ?? '').trim();
          const size = (row.size ?? '').trim();
          if (!style || !barcode || !size) continue;
          const key = `${style.toLowerCase()}__${size.toLowerCase()}__${color.toLowerCase()}`;
          if (!atsMismatchMap.has(key)) {
            atsMismatchMap.set(key, { style, color, size, barcode });
          }
        }

        const variantMismatchMap = new Map<string, { style: string; color: string; size: string; barcode: string }>();
        for (const row of variantMismatchRows) {
          const sku = (row.sku ?? '').trim();
          if (!sku || !sku.includes('-')) continue;
          const [styleRaw, barcodeRaw] = sku.split('-');
          const style = (styleRaw ?? '').trim();
          const barcode = (barcodeRaw ?? '').trim();
          const color = (row.color ?? '').trim();
          const size = (row.size ?? '').trim();
          if (!style || !barcode || !size) continue;
          const key = `${style.toLowerCase()}__${size.toLowerCase()}__${color.toLowerCase()}`;
          if (!variantMismatchMap.has(key)) {
            variantMismatchMap.set(key, { style, color, size, barcode });
          }
        }

        const mismatchRows: MismatchRow[] = [];
        for (const key of atsMismatchMap.keys()) {
          const atsItem = atsMismatchMap.get(key);
          const pvKey = atsItem
            ? `${atsItem.style.toLowerCase()}__${atsItem.size.toLowerCase()}__${atsItem.color.toLowerCase()}`
            : '';
          const variantItem = variantMismatchMap.get(pvKey);
          if (atsItem && variantItem && atsItem.barcode !== variantItem.barcode) {
            mismatchRows.push({
              style: atsItem.style,
              color: variantItem.color,
              size: atsItem.size,
              wms_barcode: atsItem.barcode,
              shopify_barcode: variantItem.barcode,
            });
          }
        }
        mismatchRows.sort((a, b) => {
          const styleCmp = (a.style ?? '').localeCompare(b.style ?? '');
          if (styleCmp !== 0) return styleCmp;
          return (a.size ?? '').localeCompare(b.size ?? '');
        });
        if (!cancelled) setMismatches(mismatchRows);

        const allSkus = new Set<string>([...atsMap.keys(), ...shopifyMap.keys()]);
        const joined: Row[] = [];
        for (const normalizedKey of allSkus) {
          const ats = atsMap.get(normalizedKey);
          const shopify = shopifyMap.get(normalizedKey);
          const ats_qty = ats?.ats_qty ?? 0;
          const shopify_qty = shopify?.shopify_qty ?? 0;
          joined.push({
            sku: ats?.sku ?? shopify?.original_sku ?? normalizedKey,
            color: ats?.color ?? null,
            color_desc: ats?.color_desc ?? null,
            size: ats?.size ?? null,
            ats_qty,
            shopify_qty,
            difference: ats_qty - shopify_qty,
          });
        }
        setJoinedRowsBeforeFilter(joined);

        const filtered = joined.filter((row) => {
          return !shouldExcludeSku(row.sku) && !(row.ats_qty === 0 && row.shopify_qty === 0);
        });
        filtered.sort((a, b) => b.difference - a.difference);
        setRows(filtered);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => row.sku.toLowerCase().includes(term));
  }, [rows, search]);

  const wmsNotOnShopifyCount = useMemo(
    () => rows.filter((row) => row.ats_qty > 0 && row.shopify_qty === 0).length,
    [rows]
  );
  const wmsNotOnShopifyRows = useMemo(
    () => rows.filter((row) => row.ats_qty > 0 && row.shopify_qty === 0),
    [rows]
  );
  const shopifyNotInWmsCount = shopifyNotInWmsRows.length;
  const negativeShopifyCount = negativeShopifyRows.length;
  const styleSizeMismatchCount = mismatches.length;

  useEffect(() => {
    setPage(1);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, currentPage, PAGE_SIZE]);

  const exportToExcel = () => {
    const exportRows = rows.map((row) => ({
      SKU: row.sku,
      Color: row.color ?? '',
      'Color Desc': row.color_desc ?? '',
      Size: row.size ?? '',
      'WMS Qty': row.ats_qty,
      'Shopify Qty': row.shopify_qty,
      Difference: row.difference,
    }));
    const sheet = XLSX.utils.json_to_sheet(exportRows, {
      header: ['SKU', 'Color', 'Color Desc', 'Size', 'WMS Qty', 'Shopify Qty', 'Difference'],
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Reconciliation');
    XLSX.writeFile(workbook, 'inventory-reconciliation-export.xlsx');
  };

  const exportWmsNotOnShopifyToExcel = () => {
    const exportRows = wmsNotOnShopifyRows.map((row) => ({
      SKU: row.sku,
      Color: row.color ?? '',
      'Color Desc': row.color_desc ?? '',
      Size: row.size ?? '',
      'WMS Qty': row.ats_qty,
      'Shopify Qty': row.shopify_qty,
      Difference: row.difference,
    }));
    const sheet = XLSX.utils.json_to_sheet(exportRows, {
      header: ['SKU', 'Color', 'Color Desc', 'Size', 'WMS Qty', 'Shopify Qty', 'Difference'],
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'WMS Not On Shopify');
    XLSX.writeFile(workbook, 'wms-not-on-shopify.xlsx');
  };

  const exportShopifyNotInWmsToExcel = () => {
    const exportRows = shopifyNotInWmsRows.map((row) => ({
      SKU: row.sku,
      'Shopify Qty': row.shopify_qty,
    }));
    const sheet = XLSX.utils.json_to_sheet(exportRows, {
      header: ['SKU', 'Shopify Qty'],
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Shopify Not In WMS');
    XLSX.writeFile(workbook, 'shopify-not-in-wms.xlsx');
  };

  const exportNegativeShopifyToExcel = () => {
    const exportRows = negativeShopifyRows.map((row) => ({
      SKU: row.sku,
      'Shopify Qty': row.shopify_qty,
    }));
    const sheet = XLSX.utils.json_to_sheet(exportRows, {
      header: ['SKU', 'Shopify Qty'],
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Negative Shopify Inventory');
    XLSX.writeFile(workbook, 'negative-shopify-inventory.xlsx');
  };

  const exportStyleSizeMismatchesToExcel = () => {
    const exportRows = mismatches.map((row) => ({
      Style: row.style,
      Color: row.color,
      Size: row.size,
      'WMS Barcode': row.wms_barcode,
      'Shopify Barcode': row.shopify_barcode,
    }));
    const sheet = XLSX.utils.json_to_sheet(exportRows, {
      header: ['Style', 'Color', 'Size', 'WMS Barcode', 'Shopify Barcode'],
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Style Size Mismatches');
    XLSX.writeFile(workbook, 'style-size-mismatches.xlsx');
  };

  return (
    <section className="space-y-4">
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <div className="rounded-lg border border-border bg-card p-4" style={{ width: 'calc(25% - 12px)' }}>
          <p className="text-sm text-muted-foreground">In WMS, Not on Shopify</p>
          <p className="text-3xl font-semibold tabular-nums">{wmsNotOnShopifyCount.toLocaleString('en-US')}</p>
          <p className="text-sm text-muted-foreground">SKUs with warehouse stock but 0 Shopify inventory</p>
          <div className="mt-3">
            <Button variant="ghost" size="sm" className="h-auto px-0 text-sm text-muted-foreground hover:text-foreground" onClick={exportWmsNotOnShopifyToExcel}>
              Export to Excel
            </Button>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4" style={{ width: 'calc(25% - 12px)' }}>
          <p className="text-sm text-muted-foreground">In Shopify, Not in WMS</p>
          <p className="text-3xl font-semibold tabular-nums">{shopifyNotInWmsCount.toLocaleString('en-US')}</p>
          <p className="text-sm text-muted-foreground">SKUs with Shopify inventory but no WMS record</p>
          <div className="mt-3">
            <Button variant="ghost" size="sm" className="h-auto px-0 text-sm text-muted-foreground hover:text-foreground" onClick={exportShopifyNotInWmsToExcel}>
              Export to Excel
            </Button>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4" style={{ width: 'calc(25% - 12px)' }}>
          <p className="text-sm text-muted-foreground">Negative Shopify Inventory</p>
          <p className="text-3xl font-semibold tabular-nums">{negativeShopifyCount.toLocaleString('en-US')}</p>
          <p className="text-sm text-muted-foreground">SKUs with negative inventory in Shopify</p>
          <div className="mt-3">
            <Button variant="ghost" size="sm" className="h-auto px-0 text-sm text-muted-foreground hover:text-foreground" onClick={exportNegativeShopifyToExcel}>
              Export to Excel
            </Button>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4" style={{ width: 'calc(25% - 12px)' }}>
          <p className="text-sm text-muted-foreground">Style Size Mismatches</p>
          <p className="text-3xl font-semibold tabular-nums">{styleSizeMismatchCount.toLocaleString('en-US')}</p>
          <p className="text-sm text-muted-foreground">Same style+color+size, different barcode</p>
          <div className="mt-3">
            <Button variant="ghost" size="sm" className="h-auto px-0 text-sm text-muted-foreground hover:text-foreground" onClick={exportStyleSizeMismatchesToExcel}>
              Export to Excel
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="w-full max-w-sm space-y-2">
          <label htmlFor="recon-sku-search" className="text-sm font-medium">
            Search by SKU
          </label>
          <Input
            id="recon-sku-search"
            placeholder="Type SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={exportToExcel}>
          Export to Excel
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      ) : null}

      <div className="relative rounded-lg border border-border" style={{ overflowY: 'auto', overflowX: 'auto', height: '600px' }}>
        {loading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/30">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : null}

        <Table style={{ minWidth: '900px', borderCollapse: 'collapse', width: '100%' }}>
          <TableHeader>
            <TableRow>
              <TableHead style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: '#111111' }}>SKU</TableHead>
              <TableHead style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: '#111111' }}>Color</TableHead>
              <TableHead style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: '#111111' }}>Color Desc</TableHead>
              <TableHead style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: '#111111' }}>Size</TableHead>
              <TableHead className="text-right" style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: '#111111' }}>
                WMS Qty
              </TableHead>
              <TableHead className="text-right" style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: '#111111' }}>
                Shopify Qty
              </TableHead>
              <TableHead className="text-right" style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: '#111111' }}>
                Difference
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No rows found.
                </TableCell>
              </TableRow>
            ) : (
              pagedRows.map((row) => (
                <TableRow key={row.sku}>
                  <TableCell>{row.sku}</TableCell>
                  <TableCell>{row.color ?? '—'}</TableCell>
                  <TableCell>{row.color_desc ?? '—'}</TableCell>
                  <TableCell>{row.size ?? '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.ats_qty.toLocaleString('en-US')}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.shopify_qty.toLocaleString('en-US')}</TableCell>
                  <TableCell
                    className={
                      row.difference === 0
                        ? 'text-right tabular-nums text-emerald-400'
                        : row.difference > 0
                          ? 'text-right tabular-nums text-amber-400'
                          : 'text-right tabular-nums text-red-400'
                    }
                  >
                    {row.difference > 0 ? `+${row.difference.toLocaleString('en-US')}` : row.difference.toLocaleString('en-US')}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
          Previous
        </Button>
        <p className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          Next
        </Button>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Style Size Mismatch Details</h3>
        <div
          className="relative rounded-lg border border-border"
          style={{ overflowY: 'auto', overflowX: 'auto', height: '400px' }}
        >
          <Table style={{ minWidth: '700px', borderCollapse: 'collapse', width: '100%' }}>
            <TableHeader>
              <TableRow>
                <TableHead style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: '#111111' }}>Style</TableHead>
                <TableHead style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: '#111111' }}>Color</TableHead>
                <TableHead style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: '#111111' }}>Size</TableHead>
                <TableHead style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: '#111111' }}>WMS Barcode</TableHead>
                <TableHead style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: '#111111' }}>Shopify Barcode</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mismatches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No rows found.
                  </TableCell>
                </TableRow>
              ) : (
                mismatches.map((row, idx) => (
                  <TableRow key={`${row.style}-${row.color ?? 'c'}-${row.size ?? 'size'}-${row.wms_barcode}-${row.shopify_barcode}-${idx}`}>
                    <TableCell>{row.style}</TableCell>
                    <TableCell>{row.color}</TableCell>
                    <TableCell>{row.size}</TableCell>
                    <TableCell>{row.wms_barcode}</TableCell>
                    <TableCell>{row.shopify_barcode}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </section>
  );
}

