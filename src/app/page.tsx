import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/supabase/session';

/** `/` — middleware also redirects; this keeps direct RSC navigation consistent. */
export default async function RootPage() {
  const session = await getServerSession();
  if (session) {
    redirect('/erp/dashboard');
  }
  redirect('/erp/login');
}
