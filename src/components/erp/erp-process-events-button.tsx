'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export function ErpProcessEventsButton() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const res = await fetch('/api/process-events', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: 'destructive',
          title: 'Processor failed',
          description: data.error || res.statusText,
        });
        return;
      }
      toast({
        title: 'Processed batch',
        description: `ok: ${data.processed}, failed: ${data.failed}, rows: ${data.batch}`,
      });
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Request failed',
        description: e instanceof Error ? e.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="button" variant="secondary" disabled={loading} onClick={run}>
      {loading ? 'Running…' : 'Process pending webhook events'}
    </Button>
  );
}
