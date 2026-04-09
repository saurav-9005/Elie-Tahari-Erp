import { createServiceRoleClient } from '@/lib/supabase/admin';
import { getServerSession, hasRole } from '@/lib/supabase/session';
import { ErpForbidden } from '@/components/erp/erp-forbidden';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';

export default async function ErpCustomersPage({ searchParams }: { searchParams: { q?: string } }) {
  const session = await getServerSession();
  if (!hasRole(session, ['admin', 'finance'])) {
    return <ErpForbidden />;
  }

  const supabase = createServiceRoleClient();
  const { data: rows, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  const q = (searchParams.q || '').trim().toLowerCase();
  const filtered =
    !q || !rows
      ? rows
      : rows.filter(
          (c) =>
            (c.email && c.email.toLowerCase().includes(q)) ||
            (c.full_name && c.full_name.toLowerCase().includes(q)) ||
            c.shopify_customer_id.includes(q)
        );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-headline text-2xl font-semibold tracking-tight">Customers (Supabase)</h1>
        <p className="text-sm text-muted-foreground">Synced from customer webhooks.</p>
      </div>

      <form className="flex max-w-md flex-wrap items-end gap-2" method="get">
        <div className="min-w-0 flex-1">
          <Input name="q" placeholder="Search name, email, customer id…" defaultValue={searchParams.q} />
        </div>
        <button
          type="submit"
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          Search
        </button>
      </form>

      {error ? (
        <p className="text-sm text-destructive">{error.message}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="text-right">Spent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(filtered ?? []).map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.full_name || '—'}</TableCell>
                <TableCell>{c.email || '—'}</TableCell>
                <TableCell>{c.phone || '—'}</TableCell>
                <TableCell className="text-right">{c.total_orders}</TableCell>
                <TableCell className="text-right">${Number(c.total_spent).toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
