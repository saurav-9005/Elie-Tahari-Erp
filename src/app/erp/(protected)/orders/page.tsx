import { createServiceRoleClient } from '@/lib/supabase/admin';
import { getServerSession, hasRole } from '@/lib/supabase/session';
import { ErpForbidden } from '@/components/erp/erp-forbidden';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';

export default async function ErpOrdersPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string };
}) {
  const session = await getServerSession();
  if (!hasRole(session, ['admin', 'finance'])) {
    return <ErpForbidden />;
  }

  const supabase = createServiceRoleClient();
  let query = supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (searchParams.status) {
    query = query.eq('status', searchParams.status);
  }

  const { data: rows, error } = await query;

  const q = (searchParams.q || '').trim().toLowerCase();
  const filtered =
    !q || !rows
      ? rows
      : rows.filter(
          (o) =>
            (o.customer_email && o.customer_email.toLowerCase().includes(q)) ||
            (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
            o.shopify_order_id.includes(q)
        );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-headline text-2xl font-semibold tracking-tight">Orders (Supabase)</h1>
        <p className="text-sm text-muted-foreground">Synced from Shopify webhooks.</p>
      </div>

      <form className="flex max-w-xl flex-wrap gap-2" method="get">
        <Input name="q" placeholder="Search email, name, Shopify order id…" defaultValue={searchParams.q} />
        <Input name="status" placeholder="status filter" defaultValue={searchParams.status} />
        <button
          type="submit"
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          Filter
        </button>
      </form>

      {error ? (
        <p className="text-sm text-destructive">{error.message}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Shopify ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(filtered ?? []).map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-xs">{o.shopify_order_id}</TableCell>
                <TableCell>
                  <div className="font-medium">{o.customer_name || '—'}</div>
                  <div className="text-xs text-muted-foreground">{o.customer_email || '—'}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{o.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {o.total_price != null ? `${o.currency} ${Number(o.total_price).toFixed(2)}` : '—'}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(o.created_at).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
