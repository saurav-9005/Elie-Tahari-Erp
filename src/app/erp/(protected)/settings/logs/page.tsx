import { createServiceRoleClient } from '@/lib/supabase/admin';
import { getServerSession, hasRole } from '@/lib/supabase/session';
import { ErpForbidden } from '@/components/erp/erp-forbidden';
import { ErpProcessEventsButton } from '@/components/erp/erp-process-events-button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default async function ErpSettingsLogsPage() {
  const session = await getServerSession();
  if (!hasRole(session, ['admin'])) {
    return <ErpForbidden />;
  }

  const supabase = createServiceRoleClient();
  const { data: logs, error } = await supabase
    .from('sync_logs')
    .select('*')
    .order('synced_at', { ascending: false })
    .limit(100);

  const { count: pending } = await supabase
    .from('shopify_events')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-2xl font-semibold tracking-tight">Sync logs</h1>
        <p className="text-sm text-muted-foreground">
          Audit trail from the webhook processor. Pending events:{' '}
          <span className="font-medium text-foreground">{pending ?? '—'}</span>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border p-4">
        <ErpProcessEventsButton />
        <p className="text-xs text-muted-foreground">
          When <code className="rounded bg-muted px-1">CRON_SECRET</code> is set in production, call
          this API from cron with header <code className="rounded bg-muted px-1">x-cron-secret</code>{' '}
          instead of using the button.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-destructive">{error.message}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>OK</TableHead>
              <TableHead>Error</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(logs ?? []).map((l) => (
              <TableRow key={l.id}>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(l.synced_at).toLocaleString()}
                </TableCell>
                <TableCell>{l.action || '—'}</TableCell>
                <TableCell>{l.success === null ? '—' : l.success ? 'yes' : 'no'}</TableCell>
                <TableCell className="max-w-md truncate text-xs text-muted-foreground">
                  {l.error_message || '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
