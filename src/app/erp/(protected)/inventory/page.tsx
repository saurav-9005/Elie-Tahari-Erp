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

export default async function ErpInventoryPage({ searchParams }: { searchParams: { q?: string } }) {
  const session = await getServerSession();
  if (!hasRole(session, ['admin', 'warehouse'])) {
    return <ErpForbidden />;
  }

  const supabase = createServiceRoleClient();
  const { data: rows, error } = await supabase
    .from('inventory')
    .select('*')
    .order('title', { ascending: true })
    .limit(200);

  const q = (searchParams.q || '').trim().toLowerCase();
  const filtered =
    !q || !rows
      ? rows
      : rows.filter(
          (r) =>
            r.title.toLowerCase().includes(q) ||
            (r.sku && r.sku.toLowerCase().includes(q)) ||
            r.shopify_product_id.includes(q)
        );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-headline text-2xl font-semibold tracking-tight">Inventory (Supabase)</h1>
        <p className="text-sm text-muted-foreground">Synced from product webhooks.</p>
      </div>

      <form className="flex max-w-md flex-wrap items-end gap-2" method="get">
        <div className="min-w-0 flex-1">
          <Input name="q" placeholder="Search title, SKU, product id…" defaultValue={searchParams.q} />
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
              <TableHead>Title</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Synced</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(filtered ?? []).map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.title}</TableCell>
                <TableCell>{r.sku || '—'}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={r.quantity < 5 ? 'destructive' : 'secondary'}>{r.quantity}</Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">{r.shopify_product_id}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(r.last_synced_at).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
