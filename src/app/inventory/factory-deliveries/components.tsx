'use client';

import { useState, useTransition } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type DeliveryRow } from '@/lib/google-sheets';
import { getSheetDataAction } from './actions';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type SheetTab = {
  label: string;
  key: string;
  month: number;
};

type FactoryDeliveriesClientProps = {
  sheetTabs: SheetTab[];
  initialData: DeliveryRow[];
  initialTabKey: string;
};

export function FactoryDeliveriesClient({ sheetTabs, initialData, initialTabKey }: FactoryDeliveriesClientProps) {
  const [data, setData] = useState<DeliveryRow[]>(initialData);
  const [activeTab, setActiveTab] = useState(initialTabKey);
  const [isPending, startTransition] = useTransition();
  const [lastSynced, setLastSynced] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');

  const handleTabChange = (tabKey: string) => {
    setActiveTab(tabKey);
    startTransition(async () => {
      const newData = await getSheetDataAction(tabKey);
      setData(newData);
      setLastSynced(new Date());
    });
  };

  const handleRefresh = () => {
      handleTabChange(activeTab);
  }

  const filteredData = data.filter(row => 
    row.styleNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <TabsList>
            {sheetTabs.map(tab => (
            <TabsTrigger key={tab.key} value={tab.key}>
                {tab.label}
            </TabsTrigger>
            ))}
        </TabsList>
        <div className="flex items-center gap-2 ml-auto">
            <Input 
                placeholder="Search by Style..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 w-48"
            />
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={handleRefresh} disabled={isPending}>
                <RefreshCw className={cn('h-4 w-4', isPending && 'animate-spin')} />
            </Button>
            <p className="text-xs text-muted-foreground">
                Last synced: {lastSynced.toLocaleTimeString()}
            </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isPending ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Style Number</TableHead>
                  <TableHead className="text-right">Projected</TableHead>
                  <TableHead className="text-right">Shipped</TableHead>
                  <TableHead>ETA</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length > 0 ? filteredData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{row.styleNumber}</TableCell>
                    <TableCell className="text-right">{row.projectedUnits}</TableCell>
                    <TableCell className="text-right">{row.actualShippedUnits}</TableCell>
                    <TableCell>{row.etaDate}</TableCell>
                    <TableCell>
                        <Badge variant={
                            row.status === 'Received' ? 'default' : 
                            row.status === 'In Transit' ? 'secondary' : 'destructive'
                        }>{row.status}</Badge>
                    </TableCell>
                  </TableRow>
                )) : (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center h-24">
                            No data found for this month.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Tabs>
  );
}
