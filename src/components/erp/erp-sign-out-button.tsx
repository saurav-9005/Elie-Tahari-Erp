'use client';

import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/button';
import type { Database } from '@/lib/database.types';
import { useToast } from '@/hooks/use-toast';

function createSupabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createBrowserClient<Database>(url, key);
}

export function ErpSignOutButton() {
  const { toast } = useToast();

  async function handleSignOut() {
    const supabase = createSupabaseBrowser();
    if (!supabase) {
      toast({
        variant: 'destructive',
        title: 'Sign out failed',
        description: 'Supabase is not configured.',
      });
      return;
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast({ variant: 'destructive', title: 'Sign out failed', description: error.message });
        return;
      }
      window.location.href = '/erp/login';
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Sign out failed',
        description: e instanceof Error ? e.message : 'Unknown error',
      });
    }
  }

  return (
    <Button type="button" variant="ghost" size="sm" onClick={() => void handleSignOut()}>
      Sign out
    </Button>
  );
}
