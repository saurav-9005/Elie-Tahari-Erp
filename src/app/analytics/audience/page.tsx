import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function AudiencePage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-headline text-3xl font-semibold tracking-tight">
        Audience Analytics
      </h1>
      <p className="text-muted-foreground">
        View customer audience data from Looker Studio.
      </p>
      <div className="pt-4">
        <Button asChild>
          <Link
            href="https://lookerstudio.google.com/s/rBUDdD0wnwY"
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink />
            Open Audience Report
          </Link>
        </Button>
      </div>
    </div>
  );
}
