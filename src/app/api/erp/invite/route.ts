import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { getServerSession, hasRole } from '@/lib/supabase/session';
import type { AppRole } from '@/lib/database.types';

export const runtime = 'nodejs';

const ROLES: AppRole[] = ['admin', 'finance', 'warehouse', 'viewer'];

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session?.profile || !hasRole(session, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { email?: string; role?: AppRole };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const role = body.role;
  if (!email || !role || !ROLES.includes(role)) {
    return NextResponse.json({ error: 'email and valid role required' }, { status: 400 });
  }

  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { role },
      redirectTo: `${new URL(request.url).origin}/auth/callback`,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await admin.from('invite_log').insert({
      email,
      role,
      sent_by: session.user.id,
      status: 'sent',
    });

    return NextResponse.json({ ok: true, userId: data.user?.id });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
