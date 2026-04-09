/**
 * Admin invite via Edge Function. Protect with a shared secret header (not JWT) for simplicity.
 * Header: `x-invite-secret` must match INVITE_EDGE_SECRET.
 */
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const expected = Deno.env.get('INVITE_EDGE_SECRET');
  const sent = req.headers.get('x-invite-secret');
  if (!expected || sent !== expected) {
    return new Response('Forbidden', { status: 403 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return new Response('Misconfigured', { status: 500 });
  }

  let body: { email?: string; role?: string; invited_by?: string };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const role = body.role || 'viewer';
  if (!email) {
    return new Response('email required', { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const appUrl = Deno.env.get('APP_URL') || supabaseUrl.replace('.supabase.co', '.vercel.app');

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { role },
    redirectTo: `${appUrl}/auth/callback`,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (body.invited_by) {
    await supabase.from('invite_log').insert({
      email,
      role,
      sent_by: body.invited_by,
      status: 'sent',
    });
  }

  return new Response(JSON.stringify({ ok: true, userId: data.user?.id }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
