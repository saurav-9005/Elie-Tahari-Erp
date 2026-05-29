'use client';

import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

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
      .eq('product_status', 'active')
      .gt('quantity', 0)
      .order('sku', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    allRows.push(...(data as typeof allRows));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return allRows.filter((row) => {
    if (row.sku == null || row.sku === '') return false;
    const sku = row.sku.toLowerCase().trim();
    return (
      !sku.startsWith('protect-') &&
      !sku.startsWith('gift-card') &&
      !sku.startsWith('gift-card-')
    );
  });
}

async function fetchNegativeInventory(supabase: ReturnType<typeof createClient>) {
  const allRows: ShopifyRawRow[] = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('inventory' as never)
      .select('sku,quantity')
      .eq('product_status', 'active')
      .lt('quantity', 0)
      .order('sku', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    allRows.push(...(data as typeof allRows));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return allRows.filter((row) => {
    if (!row.sku) return false;
    const sku = String(row.sku).toLowerCase().trim();
    return (
      !sku.startsWith('protect-') &&
      !sku.startsWith('gift-card') &&
      !sku.startsWith('gift-card-') &&
      !sku.startsWith('giftcard')
    );
  });
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

export function ReconciliationMetrics() {
  const [rows, setRows] = useState<Row[]>([]);
  const [shopifyNotInWmsRows, setShopifyNotInWmsRows] = useState<Array<{ sku: string; shopify_qty: number }>>([]);
  const [negativeShopifyRows, setNegativeShopifyRows] = useState<Array<{ sku: string; shopify_qty: number }>>([]);
  const [mismatches, setMismatches] = useState<MismatchRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    (async () => {
      try {
        const atsRows = await fetchAllAtsInventory(supabase);
        const atsSkus = Array.from(new Set(atsRows.map((row) => asText(row.sku)).filter((sku): sku is string => Boolean(sku))));
        const [shopifyRows, positiveInventoryRows, negativeInventoryRows, atsMismatchRows, variantMismatchRows] = await Promise.all([
          fetchAllProductVariants(supabase, atsSkus),
          fetchInventoryPositiveQty(supabase),
          fetchNegativeInventory(supabase),
          fetchAllAtsForMismatch(supabase),
          fetchAllProductVariantsForMismatch(supabase),
        ]);
        if (cancelled) return;

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
        const filtered = joined.filter((row) => !shouldExcludeSku(row.sku) && !(row.ats_qty === 0 && row.shopify_qty === 0));
        filtered.sort((a, b) => b.difference - a.difference);
        setRows(filtered);

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
        setShopifyNotInWmsRows(shopifyOnlyList);

        const negativeList = negativeInventoryRows
          .map((row) => ({ sku: row.sku, shopify_qty: row.quantity }))
          .filter((row) => {
            if (!row.sku) return false;
            const sku = String(row.sku).toLowerCase().trim();
            return (
              !sku.startsWith('protect-') &&
              !sku.startsWith('gift-card') &&
              !sku.startsWith('gift-card-') &&
              !sku.startsWith('giftcard')
            );
          })
          .sort((a, b) => (a.sku ?? '').localeCompare(b.sku ?? ''));
        setNegativeShopifyRows(negativeList);

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
          const pvKey = atsItem ? `${atsItem.style.toLowerCase()}__${atsItem.size.toLowerCase()}__${atsItem.color.toLowerCase()}` : '';
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
        setMismatches(mismatchRows);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const wmsNotOnShopifyRows = useMemo(() => rows.filter((row) => row.ats_qty > 0 && row.shopify_qty === 0), [rows]);
  const wmsNotOnShopifyCount = useMemo(() => wmsNotOnShopifyRows.length, [wmsNotOnShopifyRows]);
  const shopifyNotInWmsCount = shopifyNotInWmsRows.length;
  const negativeShopifyCount = negativeShopifyRows.length;
  const styleSizeMismatchCount = mismatches.length;

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
    const sheet = XLSX.utils.json_to_sheet(exportRows, { header: ['SKU', 'Color', 'Color Desc', 'Size', 'WMS Qty', 'Shopify Qty', 'Difference'] });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'WMS Not On Shopify');
    XLSX.writeFile(workbook, 'wms-not-on-shopify.xlsx');
  };

  const exportShopifyNotInWmsToExcel = () => {
    const exportRows = shopifyNotInWmsRows.map((row) => ({ SKU: row.sku, 'Shopify Qty': row.shopify_qty }));
    const sheet = XLSX.utils.json_to_sheet(exportRows, { header: ['SKU', 'Shopify Qty'] });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Shopify Not In WMS');
    XLSX.writeFile(workbook, 'shopify-not-in-wms.xlsx');
  };

  const exportNegativeShopifyToExcel = () => {
    const exportRows = negativeShopifyRows
      .filter((row) => {
        if (!row.sku) return false;
        const sku = String(row.sku).toLowerCase().trim();
        return (
          !sku.startsWith('protect-') &&
          !sku.startsWith('gift-card') &&
          !sku.startsWith('gift-card-') &&
          !sku.startsWith('giftcard')
        );
      })
      .map((row) => ({ SKU: row.sku, 'Shopify Qty': row.shopify_qty }));
    const sheet = XLSX.utils.json_to_sheet(exportRows, { header: ['SKU', 'Shopify Qty'] });
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

  const metricCardClass =
    'rounded-2xl border border-[#E5E5EA] bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] dark:rounded-lg dark:border-border dark:bg-card dark:shadow-none dark:hover:translate-y-0 dark:hover:shadow-none';
  const metricTitleClass =
    'text-[12px] font-medium tracking-[0.05em] text-[#6E6E73] [font-variant:small-caps] dark:text-sm dark:tracking-normal dark:font-normal dark:text-muted-foreground';
  const metricValueClass =
    'mt-1 text-[48px] font-bold leading-none tabular-nums text-[#1D1D1F] dark:mt-0 dark:text-3xl dark:font-semibold dark:leading-normal dark:text-foreground';
  const metricSubtitleClass = 'mt-2 text-xs text-[#6E6E73] dark:mt-0 dark:text-sm dark:text-muted-foreground';
  const metricExportClass =
    'mt-3 inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-sm font-medium text-[#0071E3] transition hover:opacity-80 dark:text-sm dark:text-muted-foreground dark:hover:text-foreground';

  return (
    <div className="flex flex-wrap gap-4">
      {loading ? (
        Array.from({ length: 4 }).map((_, i) => (
          <div key={`metric-skel-${i}`} className={cn(metricCardClass, 'w-full md:w-[calc(50%-8px)] lg:w-[calc(25%-12px)]')}>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-2 h-9 w-24" />
            <Skeleton className="mt-3 h-3 w-40" />
          </div>
        ))
      ) : (
        <>
      <div className={cn(metricCardClass, 'w-full md:w-[calc(50%-8px)] lg:w-[calc(25%-12px)]')}>
        <p className={metricTitleClass}>In WMS, Not on Shopify</p>
        <p className={metricValueClass}>{wmsNotOnShopifyCount.toLocaleString('en-US')}</p>
        <p className={metricSubtitleClass}>SKUs with warehouse stock but 0 Shopify inventory</p>
        <button type="button" className={metricExportClass} onClick={exportWmsNotOnShopifyToExcel}>Export to Excel <span aria-hidden>→</span></button>
      </div>
      <div className={cn(metricCardClass, 'w-full md:w-[calc(50%-8px)] lg:w-[calc(25%-12px)]')}>
        <p className={metricTitleClass}>In Shopify, Not in WMS</p>
        <p className={metricValueClass}>{shopifyNotInWmsCount.toLocaleString('en-US')}</p>
        <p className={metricSubtitleClass}>SKUs with Shopify inventory but no WMS record</p>
        <button type="button" className={metricExportClass} onClick={exportShopifyNotInWmsToExcel}>Export to Excel <span aria-hidden>→</span></button>
      </div>
      <div className={cn(metricCardClass, 'w-full md:w-[calc(50%-8px)] lg:w-[calc(25%-12px)]')}>
        <p className={metricTitleClass}>Negative Shopify Inventory</p>
        <p className={metricValueClass}>{negativeShopifyCount.toLocaleString('en-US')}</p>
        <p className={metricSubtitleClass}>SKUs with negative inventory in Shopify</p>
        <button type="button" className={metricExportClass} onClick={exportNegativeShopifyToExcel}>Export to Excel <span aria-hidden>→</span></button>
      </div>
      <div className={cn(metricCardClass, 'w-full md:w-[calc(50%-8px)] lg:w-[calc(25%-12px)]')}>
        <p className={metricTitleClass}>Barcode Mismatch</p>
        <p className={metricValueClass}>{styleSizeMismatchCount.toLocaleString('en-US')}</p>
        <p className={metricSubtitleClass}>Same style+color+size, different barcode</p>
        <button type="button" className={metricExportClass} onClick={exportStyleSizeMismatchesToExcel}>Export to Excel <span aria-hidden>→</span></button>
      </div>
        </>
      )}
    </div>
  );
}
