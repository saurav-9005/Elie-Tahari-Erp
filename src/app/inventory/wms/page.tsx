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
import { warehouseInventory, type WarehouseInventoryItem, shopifyInventory } from '@/lib/inventory-data';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

type ReceiptItem = {
    sku: string;
    productName: string;
    location: string;
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

  const receipts: ReceiptItem[] = shopifyInventory.flatMap(product => 
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
            WMS Inventory
          </h1>
          <p className="text-muted-foreground">
            Live inventory data and reports from the warehouse management system.
          </p>
        </div>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>WMS Inventory Levels</CardTitle>
            <CardDescription>Live inventory data from the warehouse management system.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right">Reserved</TableHead>
                <TableHead className="text-right">Inbound</TableHead>
                <TableHead className="text-right">Damaged</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {warehouseInventory.map((item: WarehouseInventoryItem) => (
                <TableRow key={item.sku}>
                  <TableCell className="font-medium">{item.productName}</TableCell>
                  <TableCell>{item.sku}</TableCell>
                  <TableCell>{item.warehouseLocation}</TableCell>
                  <TableCell className="text-right">{item.availableQty}</TableCell>
                  <TableCell className="text-right">{item.reservedQty}</TableCell>
                  <TableCell className="text-right">{item.inboundQty}</TableCell>
                  <TableCell className="text-right">{item.damagedQty}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/inventory/wms/${item.sku}`}>View More</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="space-y-8">
        <h2 className="font-headline text-2xl font-semibold tracking-tight pt-4 border-t">
            First Receipts Report
        </h2>
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
