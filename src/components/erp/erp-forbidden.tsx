import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function ErpForbidden() {
  return (
    <div className="mx-auto max-w-md space-y-4 rounded-lg border p-6 text-center">
      <h2 className="font-headline text-xl font-semibold">Access denied</h2>
      <p className="text-sm text-muted-foreground">
        Your role does not allow this section. Use the Shopify tools in the main nav, or ask an admin
        to update your profile.
      </p>
      <Button asChild variant="outline">
        <Link href="/erp/dashboard">Back to Supabase dashboard</Link>
      </Button>
    </div>
  );
}
