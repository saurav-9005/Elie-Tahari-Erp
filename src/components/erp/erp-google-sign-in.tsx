'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

type Props = {
  nextPath: string;
};

export function ErpGoogleSignIn({ nextPath }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      if (error) {
        toast({ variant: 'destructive', title: 'Sign-in failed', description: error.message });
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Could not start Google sign-in';
      toast({ variant: 'destructive', title: 'Configuration error', description: message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="button" size="lg" className="w-full max-w-sm" disabled={loading} onClick={signIn}>
      {loading ? 'Redirecting…' : 'Continue with Google'}
    </Button>
  );
}
