import { Suspense } from 'react';
import { createServiceRoleClientWithStatementTimeout } from '@/lib/supabase/admin';
import { getServerSession, hasRole } from '@/lib/supabase/session';
import { ErpForbidden } from '@/components/erp/erp-forbidden';
import { InventoryReportClient } from '@/components/erp/reports/inventory-report-client';
import { Skeleton } from '@/components/ui/skeleton';
import { parsePagedRpcPayload } from '@/lib/erp/inventory-report-rows';
import type { InventoryReportSummary } from '@/lib/erp/inventory-report-types';

const REPORT_PAGE_SIZE = 50;

function parseSummary(data: unknown): InventoryReportSummary | null {
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  return {
    total_skus: Number(o.total_skus ?? 0),
    gross_before_july: Number(o.gross_before_july ?? 0),
    gross_after_july: Number(o.gross_after_july ?? 0),
    net_before_july: Number(o.net_before_july ?? 0),
    net_after_july: Number(o.net_after_july ?? 0),
    total_discount: Number(o.total_discount ?? 0),
  };
}

async function ReportBody() {
  const supabase = createServiceRoleClientWithStatementTimeout(30_000);

  const [{ data: rpcData, error: rpcError }, summaryRes, dateCountRes] = await Promise.all([
    supabase.rpc('erp_inventory_report_pre_july', {
      p_page: 1,
      p_page_size: REPORT_PAGE_SIZE,
    }),
    supabase.rpc('erp_inventory_report_summary'),
    supabase
      .from('inventory')
      .select('id', { count: 'exact', head: true })
      .not('product_created_at', 'is', null),
  ]);

  if (rpcError) {
    return (
      <p className="text-sm text-destructive">
        Failed to load report: {rpcError.message}
      </p>
    );
  }

  const { rows } = parsePagedRpcPayload(rpcData);
  const withDates = dateCountRes.error ? 0 : (dateCountRes.count ?? 0);
  const showPopulateHint = withDates === 0;
  const reportSummary = summaryRes.error ? null : parseSummary(summaryRes.data);
  const totalProductCount =
    reportSummary?.total_skus ?? parsePagedRpcPayload(rpcData).total;

  return (
    <InventoryReportClient
      initialRows={rows}
      totalProductCount={totalProductCount}
      pageSize={REPORT_PAGE_SIZE}
      showPopulateHint={showPopulateHint}
      reportSummary={reportSummary}
      summaryError={summaryRes.error?.message ?? null}
    />
  );
}

function ReportFallback() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Loading inventory report — this may take up to 30 seconds...
      </p>
      <Skeleton className="h-4 w-full max-w-xl" />
      <div className="flex gap-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-24" />
      </div>
      <Skeleton className="h-[420px] w-full" />
    </div>
  );
}

export default async function InventoryReportPage() {
  const session = await getServerSession();
  if (!hasRole(session, ['admin'])) {
    return <ErpForbidden />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-2xl font-semibold tracking-tight">Inventory report</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Products created before Jul 1, 2025 — sales split before and after that date (all order
          history).
        </p>
      </div>

      <Suspense fallback={<ReportFallback />}>
        <ReportBody />
      </Suspense>
    </div>
  );
}
