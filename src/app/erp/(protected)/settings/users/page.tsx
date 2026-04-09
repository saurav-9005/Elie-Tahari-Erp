import { createServiceRoleClient } from '@/lib/supabase/admin';
import { getServerSession, hasRole } from '@/lib/supabase/session';
import { ErpForbidden } from '@/components/erp/erp-forbidden';
import { ErpInviteForm } from '@/components/erp/erp-invite-form';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default async function ErpSettingsUsersPage() {
  const session = await getServerSession();
  if (!hasRole(session, ['admin'])) {
    return <ErpForbidden />;
  }

  const supabase = createServiceRoleClient();
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-2xl font-semibold tracking-tight">Users & invites</h1>
        <p className="text-sm text-muted-foreground">
          Invite teammates via Supabase Auth. They receive an email with a link to set a password /
          sign in with Google (per your Supabase settings).
        </p>
      </div>

      <ErpInviteForm />

      <div>
        <h2 className="mb-2 text-lg font-medium">Profiles</h2>
        {error ? (
          <p className="text-sm text-destructive">{error.message}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(profiles ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.email}</TableCell>
                  <TableCell>{p.full_name || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{p.role}</Badge>
                  </TableCell>
                  <TableCell>{p.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
