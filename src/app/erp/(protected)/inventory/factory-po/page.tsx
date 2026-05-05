import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FactoryPoClient } from './factory-po-client';

export default function FactoryPoPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-headline text-2xl font-semibold tracking-tight">Factory POs</h1>
          <p className="text-sm text-muted-foreground">Garment delivery schedule</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href="https://docs.google.com/spreadsheets/d/1gz4TBAQiPxvAxx46KhsXSAn5KvXvJEaVp8eUOjDeIz8/edit" target="_blank" rel="noreferrer">
            <ExternalLink className="mr-1 h-4 w-4" />
            Open in Google Sheets
          </a>
        </Button>
      </div>
      <FactoryPoClient />
    </div>
  );
}
