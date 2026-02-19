'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@/firebase';
import { warehouseInventory, type WarehouseInventoryItem } from '@/lib/inventory-data';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function WMSInventoryDetailPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const params = useParams();
  const sku = params.sku as string;

  const item = warehouseInventory.find(i => i.sku === sku);

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

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 h-[calc(100vh-theme(spacing.14))]">
        <h2 className="text-2xl font-semibold">Inventory Item Not Found</h2>
        <Button asChild>
          <Link href="/inventory">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Inventory
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
       <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
            <Link href="/inventory">
                <ArrowLeft />
                <span className="sr-only">Back to Inventory</span>
            </Link>
        </Button>
        <div>
            <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
            <h1 className="font-headline text-3xl font-semibold tracking-tight">
                {item.productName} - WMS Details
            </h1>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Warehouse Stock Details</CardTitle>
          <CardDescription>Location: {item.warehouseLocation}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><p className="font-medium text-muted-foreground">Available</p><p className="text-2xl font-bold">{item.availableQty}</p></div>
            <div><p className="font-medium text-muted-foreground">Reserved</p><p className="text-2xl font-bold">{item.reservedQty}</p></div>
            <div><p className="font-medium text-muted-foreground">Inbound</p><p className="text-2xl font-bold">{item.inboundQty}</p></div>
            <div><p className="font-medium text-muted-foreground">Damaged</p><p className="text-2xl font-bold">{item.damagedQty}</p></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
