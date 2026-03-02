'use server';

import { getShopifyInventory, type ShopifyInventoryItem } from '@/lib/inventory-data';
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
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

type ReceiptItem = {
    sku: string;
    productName: string;
    location: string;
    first_inventory_added_at: string;
    first_inventory_added_qty: number;
}

export default async function FirstReceiptsPage() {
  const shopifyInventoryData = await getShopifyInventory();

  const receipts: ReceiptItem[] = shopifyInventoryData.flatMap(product => 
    product.inventory
      .filter(inv => inv.first_inventory_added_at && inv.first_inventory_added_qty)
      .map(inv => ({
        sku: product.sku,
        productName: product.productName,
        location: inv.location,
        first_inventory_added_at: inv.first_inventory_added_at!,
        first_inventory_added_qty: inv.first_inventory_added_qty!,
      }))
  ).sort((a, b) => new Date(a.first_inventory_added_at).getTime() - new Date(b.first_inventory_added_at).getTime());

  const receiptsByMonth = receipts.reduce((acc, receipt) => {
    const month = format(new Date(receipt.first_inventory_added_at), 'MMMM yyyy');
    if (!acc[month]) {
      acc[month] = [];
    }
    acc[month].push(receipt);
    return acc;
  }, {} as Record<string, ReceiptItem[]>);
  
  const sortedMonths = Object.keys(receiptsByMonth).sort((a,b) => new Date(a).getTime() - new Date(b).getTime());

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
            First Receipts Report
          </h1>
          <p className="text-muted-foreground">
            Tracking when inventory is first received at a location.
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
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>First Received Date</TableHead>
                      <TableHead className="text-right">Initial Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receiptsByMonth[month].map(item => (
                      <TableRow key={`${item.sku}-${item.location}`}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell>{item.sku}</TableCell>
                        <TableCell>{item.location}</TableCell>
                        <TableCell>{format(new Date(item.first_inventory_added_at), 'PPP p')}</TableCell>
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
