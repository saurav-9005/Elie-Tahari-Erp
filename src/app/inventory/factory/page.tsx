'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { factoryInventory, type FactoryInventoryItem } from '@/lib/inventory-data';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function FactoryInventoryPage() {
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
            Factory Inventory
          </h1>
          <p className="text-muted-foreground">
            All inventory in production or transit from the factory.
          </p>
        </div>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Production Status</TableHead>
                <TableHead>Expected Arrival</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {factoryInventory.map((order: FactoryInventoryItem) => (
                <TableRow key={order.poNumber}>
                  <TableCell className="font-medium">{order.poNumber}</TableCell>
                  <TableCell>{order.styleName} ({order.color}, {order.size})</TableCell>
                  <TableCell>{order.sku}</TableCell>
                  <TableCell>{order.quantity}</TableCell>
                  <TableCell><Badge variant={order.productionStatus === 'Shipped' ? 'default' : 'secondary'}>{order.productionStatus}</Badge></TableCell>
                  <TableCell>{order.expectedArrivalDate}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/inventory/factory/${order.poNumber}`}>View More</Link>
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
