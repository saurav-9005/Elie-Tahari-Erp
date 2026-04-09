import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

/** Server-only: bypasses RLS. Never import from client components. */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Same as {@link createServiceRoleClient} but requests a longer Postgres statement timeout
 * (ms) on each request — for heavy RPCs that exceed the default.
 */
export function createServiceRoleClientWithStatementTimeout(statementTimeoutMs = 60_000) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient<Database>(url, key, {
    db: { schema: 'public' },
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        'statement-timeout': String(statementTimeoutMs),
      },
    },
  });
}
