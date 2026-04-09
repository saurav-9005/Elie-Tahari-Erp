import { createServiceRoleClientWithStatementTimeout } from '@/lib/supabase/admin';
import { getServerSession, hasRole } from '@/lib/supabase/session';

export const runtime = 'nodejs';
/** Allow up to 120s for RPC + response (e.g. Vercel). */
export const maxDuration = 120;

export async function GET() {
  const session = await getServerSession();
  if (!session?.profile || !hasRole(session, ['admin'])) {
    return new Response('Forbidden', { status: 403 });
  }

  const supabaseAdmin = createServiceRoleClientWithStatementTimeout(120_000);

  const { data, error } = await supabaseAdmin.rpc('erp_inventory_export_csv');

  if (error) {
    return new Response(`Export failed: ${error.message}`, { status: 500 });
  }

  if (data == null) {
    return new Response('Export failed: empty response', { status: 500 });
  }

  return new Response(data, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="inventory-report.csv"',
    },
  });
}
