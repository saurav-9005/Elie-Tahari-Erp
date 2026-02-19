'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@/firebase';
import { shopifyInventory, type ShopifyInventoryItem } from '@/lib/inventory-data';
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
import { Badge } from '@/components/ui/badge';

export default function ShopifyInventoryDetailPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const params = useParams();
  const sku = params.sku as string;
  const location = decodeURIComponent(params.location as string);

  const product = shopifyInventory.find(p => p.sku === sku);
  const inventoryItem = product?.inventory.find(i => i.location === location);

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

  if (!product || !inventoryItem) {
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
            <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
            <h1 className="font-headline text-3xl font-semibold tracking-tight">
                {product.productName} - Shopify Details
            </h1>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Shopify Inventory at <Badge variant="outline">{inventoryItem.location}</Badge></CardTitle>
          <CardDescription>Live inventory levels for this specific location.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div><p className="font-medium text-muted-foreground">Available</p><p className="text-2xl font-bold">{inventoryItem.available}</p></div>
            <div><p className="font-medium text-muted-foreground">Committed</p><p className="text-2xl font-bold">{inventoryItem.committed}</p></div>
            <div><p className="font-medium text-muted-foreground">Incoming</p><p className="text-2xl font-bold">{inventoryItem.incoming}</p></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
