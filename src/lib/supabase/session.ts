import { createClient } from '@/lib/supabase/server';
import type { AppRole, Database } from '@/lib/database.types';

export type ServerSession = {
  user: { id: string; email?: string | null };
  profile: Database['public']['Tables']['profiles']['Row'] | null;
};

export async function getServerSession(): Promise<ServerSession | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    return {
      user: { id: user.id, email: user.email },
      profile: profile ?? null,
    };
  } catch {
    return null;
  }
}

export function hasRole(session: ServerSession | null, roles: AppRole[]): boolean {
  if (!session?.profile) return false;
  return roles.includes(session.profile.role);
}
