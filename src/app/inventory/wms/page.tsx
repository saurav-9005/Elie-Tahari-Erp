'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { staticShopifyInventory, factoryInventory } from '@/lib/inventory-data';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

type ReceiptItem = {
    sku: string;
    color: string;
    first_inventory_added_at: string;
    first_inventory_added_qty: number;
}

export default function WMSInventoryPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const factoryColorMap = new Map(factoryInventory.map(item => [item.sku, item.color]));

  const receipts: ReceiptItem[] = staticShopifyInventory.flatMap(product => 
    product.inventory
      .filter(inv => inv.first_inventory_added_at && inv.first_inventory_added_qty)
      .map(inv => ({
        sku: product.sku,
        color: factoryColorMap.get(product.sku) || 'N/A',
        first_inventory_added_at: inv.first_inventory_added_at!,
        first_inventory_added_qty: inv.first_inventory_added_qty!,
      }))
  ).sort((a, b) => new Date(b.first_inventory_added_at).getTime() - new Date(a.first_inventory_added_at).getTime());

  const receiptsByMonth = receipts.reduce((acc, receipt) => {
    const month = format(new Date(receipt.first_inventory_added_at), 'MMMM yyyy');
    if (!acc[month]) {
      acc[month] = [];
    }
    acc[month].push(receipt);
    return acc;
  }, {} as Record<string, ReceiptItem[]>);
  
  const sortedMonths = Object.keys(receiptsByMonth).sort((a,b) => new Date(b).getTime() - new Date(a).getTime());

  if (isUserLoading || !user) {
    return (
      <div className="flex h-[calc(100vh-theme(spacing.14))] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/inventory">
            <ArrowLeft />
            <span className="sr-only">Back to Inventory</span>
          </Link>
        </Button>
        <div>
          <h1 className="font-headline text-3xl font-semibold tracking-tight">
            WMS First Receipts Report
          </h1>
          <p className="text-muted-foreground">
            Inventory of products by the month they were first received.
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {sortedMonths.length > 0 ? (
          sortedMonths.map(month => (
            <Card key={month}>
              <CardHeader>
                <CardTitle>{month}</CardTitle>
                <CardDescription>
                  SKUs that were first received in {month}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Color</TableHead>
                      <TableHead className="text-right">Initial Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receiptsByMonth[month].map((item, index) => (
                      <TableRow key={`${item.sku}-${index}`}>
                        <TableCell className="font-medium">{item.sku}</TableCell>
                        <TableCell>{item.color}</TableCell>
                        <TableCell className="text-right">{item.first_inventory_added_qty}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">No first receipt data available.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
