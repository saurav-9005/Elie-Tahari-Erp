import {
  getLegacyProductsInventoryAnalytics,
  getSkuNetSalesBeforeAndAfterProcessedAt,
  LEGACY_PRODUCT_ANALYTICS_SHOPIFY_SEARCH,
  LEGACY_PRODUCT_CREATED_FROM,
  SHOPIFY_ORDER_NET_SALES_CAP_PER_PERIOD,
} from '@/lib/inventory-data';
import ShopifyApiError from '@/components/shopify-api-error';
import { format, parseISO } from 'date-fns';
import { AnalyticsInventorySalesTable } from './analytics-inventory-sales-table';
import type { AnalyticsInventoryFlatRow } from './types';

const CUTOFF_LABEL = 'July 1, 2025';
const PRODUCT_LIMIT = 5;

const PRODUCT_FROM_LABEL = format(parseISO(LEGACY_PRODUCT_CREATED_FROM), 'MMMM d, yyyy');

function formatCreatedAt(iso: string) {
  try {
    return format(parseISO(iso), 'MMM d, yyyy');
  } catch {
    return iso;
  }
}

export default async function AnalyticsInventoryPage() {
  try {
    const rows = await getLegacyProductsInventoryAnalytics(PRODUCT_LIMIT);
    const skus = rows.map((r) => r.sku);
    const netSales = await getSkuNetSalesBeforeAndAfterProcessedAt(skus);

    const flatRows: AnalyticsInventoryFlatRow[] = rows.map((product) => {
      const totalAvailable = product.inventory.reduce((sum, loc) => {
        const q = Number(loc?.available);
        return sum + (Number.isFinite(q) ? q : 0);
      }, 0);
      return {
        key: product.sku,
        productName: product.productName,
        sku: product.sku,
        createdAtLabel: formatCreatedAt(product.createdAt),
        price: product.price,
        vendor: product.vendor,
        channel: product.channel,
        totalAvailable,
        netSalesBefore: netSales.beforeCutoff[product.sku] ?? 0,
        netSalesAfter: netSales.afterCutoff[product.sku] ?? 0,
      };
    });

    return (
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="font-headline text-3xl font-semibold tracking-tight">
            Analytics · Inventory
          </h1>
          <p className="mt-2 text-muted-foreground">
            Up to {PRODUCT_LIMIT} Shopify products created from {PRODUCT_FROM_LABEL} through before{' '}
            {CUTOFF_LABEL} (skips pre-2023), sorted by oldest created date first, with total available
            units per SKU, vendor and channel, and net sales from orders (before vs after {CUTOFF_LABEL}{' '}
            by order processed date).
          </p>
        </div>

        <AnalyticsInventorySalesTable
          rows={flatRows}
          currencyCode={netSales.currencyCode}
          totalNetBefore={netSales.totalBefore}
          totalNetAfter={netSales.totalAfter}
          cutoffLabel={CUTOFF_LABEL}
          productFromLabel={PRODUCT_FROM_LABEL}
          productShopifySearch={LEGACY_PRODUCT_ANALYTICS_SHOPIFY_SEARCH}
          ordersLoadedBefore={netSales.ordersLoadedBefore}
          ordersLoadedAfter={netSales.ordersLoadedAfter}
          paginationLimitedBefore={netSales.paginationLimitedBefore}
          paginationLimitedAfter={netSales.paginationLimitedAfter}
          maxOrdersPerPeriod={SHOPIFY_ORDER_NET_SALES_CAP_PER_PERIOD}
        />
      </div>
    );
  } catch (error: unknown) {
    const err = error as { name?: string; errors?: unknown; message?: string };
    if (err.name === 'ShopifyFetchError') {
      const errorDetails = err.errors
        ? JSON.stringify(err.errors, null, 2)
        : 'No further details available.';
      return (
        <div className="flex flex-col gap-4">
          <h1 className="font-headline text-3xl font-semibold tracking-tight">
            Analytics · Inventory
          </h1>
          <ShopifyApiError details={errorDetails} />
        </div>
      );
    }
    throw error;
  }
}
