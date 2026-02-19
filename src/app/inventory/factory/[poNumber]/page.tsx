'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@/firebase';
import { factoryInventory, type FactoryInventoryItem } from '@/lib/inventory-data';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function FactoryInventoryDetailPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const params = useParams();
  const poNumber = params.poNumber as string;

  const item = factoryInventory.find(i => i.poNumber === poNumber);

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
            <p className="text-sm text-muted-foreground">PO Number: {item.poNumber}</p>
            <h1 className="font-headline text-3xl font-semibold tracking-tight">
                {item.styleName} - Factory Details
            </h1>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Product & Order Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div><p className="font-medium text-muted-foreground">Product</p><p>{item.styleName}</p></div>
            <div><p className="font-medium text-muted-foreground">SKU</p><p>{item.sku}</p></div>
            <div><p className="font-medium text-muted-foreground">Color</p><p>{item.color}</p></div>
            <div><p className="font-medium text-muted-foreground">Size</p><p>{item.size}</p></div>
            <div><p className="font-medium text-muted-foreground">PO Number</p><p>{item.poNumber}</p></div>
          </div>
        </CardContent>
      </Card>
       <Card>
        <CardHeader>
          <CardTitle>Production & Quantity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div><p className="font-medium text-muted-foreground">Quantity</p><p>{item.quantity}</p></div>
            <div><p className="font-medium text-muted-foreground">Cost per Unit</p><p>${item.cost.toFixed(2)}</p></div>
            <div><p className="font-medium text-muted-foreground">Total Cost</p><p>${(item.quantity * item.cost).toFixed(2)}</p></div>
            <div><p className="font-medium text-muted-foreground">Production Date</p><p>{item.productionDate}</p></div>
            <div><p className="font-medium text-muted-foreground">Production Status</p><p>{item.productionStatus}</p></div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Shipping & Logistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div><p className="font-medium text-muted-foreground">HTS Code</p><p>{item.htsCode}</p></div>
            <div><p className="font-medium text-muted-foreground">Country of Origin</p><p>{item.origin}</p></div>
            <div><p className="font-medium text-muted-foreground">Shipped from Factory</p><p>{item.shippedFromFactory ? 'Yes' : 'No'}</p></div>
            <div><p className="font-medium text-muted-foreground">Expected Arrival</p><p>{item.expectedArrivalDate}</p></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
