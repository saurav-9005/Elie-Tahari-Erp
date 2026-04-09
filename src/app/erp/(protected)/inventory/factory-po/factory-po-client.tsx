'use client';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const SHEETS = {
  deliveries: {
    label: 'Spring 2026 Deliveries',
    embed:
      'https://docs.google.com/spreadsheets/d/18y3-4sJHM8V08U67LD0Ryg-zrDVTa4Q3/preview?gid=942315704',
    edit:
      'https://docs.google.com/spreadsheets/d/18y3-4sJHM8V08U67LD0Ryg-zrDVTa4Q3/edit?gid=942315704',
  },
  second: {
    label: 'Delivery Sheet 2',
    embed: 'https://docs.google.com/spreadsheets/d/1lT90cUfJRlfy3MKhsmNR4A91UiIt5MKsU2AXDooAClg/preview?gid=0',
    edit: 'https://docs.google.com/spreadsheets/d/1lT90cUfJRlfy3MKhsmNR4A91UiIt5MKsU2AXDooAClg/edit?gid=0',
  },
} as const;

export function FactoryPoClient() {
  return (
    <Tabs defaultValue="deliveries" className="space-y-4">
      <TabsList>
        <TabsTrigger value="deliveries">{SHEETS.deliveries.label}</TabsTrigger>
        <TabsTrigger value="second">{SHEETS.second.label}</TabsTrigger>
      </TabsList>

      <TabsContent value="deliveries" className="space-y-3">
        <Button asChild variant="outline" size="sm">
          <a href={SHEETS.deliveries.edit} target="_blank" rel="noreferrer">
            Edit in Google Sheets
          </a>
        </Button>
        <iframe title={SHEETS.deliveries.label} src={SHEETS.deliveries.embed} className="h-[80vh] w-full border-0" />
      </TabsContent>

      <TabsContent value="second" className="space-y-3">
        <Button asChild variant="outline" size="sm">
          <a href={SHEETS.second.edit} target="_blank" rel="noreferrer">
            Edit in Google Sheets
          </a>
        </Button>
        <iframe title={SHEETS.second.label} src={SHEETS.second.embed} className="h-[80vh] w-full border-0" />
      </TabsContent>
    </Tabs>
  );
}
