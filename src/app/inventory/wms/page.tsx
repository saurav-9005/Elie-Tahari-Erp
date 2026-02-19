'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { warehouseInventory, type WarehouseInventoryItem } from '@/lib/inventory-data';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function WMSInventoryPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

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
            Live inventory data from the warehouse management system.
          </p>
        </div>
      </div>
      <Card>
        <CardContent className="pt-6">
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
    </div>
  );
}
