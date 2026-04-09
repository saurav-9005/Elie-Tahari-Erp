/**
 * Optional Edge processor: forwards to your deployed Next.js API if CRON_SECRET + APP_URL are set,
 * or returns 501 so you use `/api/process-events` from Vercel Cron instead.
 */
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const appUrl = Deno.env.get('APP_URL')?.replace(/\/$/, '');
  const cronSecret = Deno.env.get('CRON_SECRET');

  if (!appUrl || !cronSecret) {
    return new Response(
      JSON.stringify({
        error:
          'Set APP_URL (e.g. https://your-app.vercel.app) and CRON_SECRET to forward to Next.js /api/process-events',
      }),
      { status: 501, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const res = await fetch(`${appUrl}/api/process-events`, {
    method: 'POST',
    headers: { 'x-cron-secret': cronSecret },
  });

  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/json' },
  });
});
