import { Badge } from '@/components/ui/badge';
import { FactoryPoClient } from './factory-po-client';

export default function FactoryPoPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-headline text-2xl font-semibold tracking-tight">Factory POs</h1>
        <p className="text-sm text-muted-foreground">Spring 2026 delivery schedules</p>
      </div>
      <Badge variant="outline">Showing 2026 data only</Badge>
      <FactoryPoClient />
    </div>
  );
}
