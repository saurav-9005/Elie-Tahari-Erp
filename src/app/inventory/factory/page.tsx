import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function FactoryInventoryPage() {
  return (
    <div className="flex h-[calc(100vh-theme(spacing.24))] flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-headline text-3xl font-semibold tracking-tight">
            Factory POs
          </h1>
          <p className="text-muted-foreground">
            Displaying content from Google Sheets.
          </p>
        </div>
        <Button asChild>
          <Link
            href="https://docs.google.com/spreadsheets/d/18y3-4sJHM8V08U67LD0Ryg-zrDVTa4Q3/edit?gid=942315704#gid=942315704"
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink />
            Edit in Google Sheets
          </Link>
        </Button>
      </div>
      <div className="flex-1 rounded-lg border">
        <iframe
          src="https://docs.google.com/spreadsheets/d/e/2PACX-1vRt8pFiwXal1MpXxq4RlaKmJcXoJs-t641S8s-GmVg1Dnya7t0tKw9SZ4zWAoPbOw/pubhtml?widget=true"
          className="h-full w-full rounded-lg"
          title="Factory POs"
        />
      </div>
    </div>
  );
}
