'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export function ErpSignOutButton() {
  const router = useRouter();
  const { toast } = useToast();

  async function signOut() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/erp/login');
      router.refresh();
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Sign out failed',
        description: e instanceof Error ? e.message : 'Unknown error',
      });
    }
  }

  return (
    <Button type="button" variant="ghost" size="sm" onClick={signOut}>
      Sign out (Supabase)
    </Button>
  );
}
