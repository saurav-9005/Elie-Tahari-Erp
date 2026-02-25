import { Suspense } from 'react';
import { getSheetTabs, getSheetData } from '@/lib/google-sheets';
import { FactoryDeliveriesClient } from './components';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

export default async function FactoryDeliveriesPage() {
  const sheetTabs = await getSheetTabs();

  if (!sheetTabs || sheetTabs.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="font-headline text-3xl font-semibold tracking-tight">
            Factory Deliveries
          </h1>
          <p className="text-muted-foreground">
            Live factory delivery data from Google Sheets.
          </p>
        </div>
        <Alert>
            <Terminal className="h-4 w-4" />
            <AlertTitle>Configuration Needed</AlertTitle>
            <AlertDescription>
                Could not load data from Google Sheets. Please ensure the following environment variables are set correctly: `GOOGLE_SHEET_ID`, `GOOGLE_SHEETS_CLIENT_EMAIL`, and `GOOGLE_SHEETS_PRIVATE_KEY`. Also, ensure the service account email has read access to the sheet.
            </AlertDescription>
        </Alert>
      </div>
    );
  }


  // Fetch data for the latest month by default
  const latestMonthTab = sheetTabs[sheetTabs.length - 1];
  const initialData = await getSheetData(latestMonthTab.key);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-headline text-3xl font-semibold tracking-tight">
          Factory Deliveries
        </h1>
        <p className="text-muted-foreground">
          Live factory delivery data from Google Sheets.
        </p>
      </div>
      <Suspense fallback={<Card><CardContent className="pt-6 flex justify-center items-center h-64"><Loader2 className="animate-spin"/></CardContent></Card>}>
        <FactoryDeliveriesClient sheetTabs={sheetTabs} initialData={initialData} initialTabKey={latestMonthTab.key} />
      </Suspense>
    </div>
  );
}
