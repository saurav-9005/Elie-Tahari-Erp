'use server';

import { getShopifyInventory } from '@/lib/inventory-data';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { notFound } from 'next/navigation';
import ShopifyApiError from '@/components/shopify-api-error';

type PageProps = {
    params: {
        sku: string;
        location: string;
    }
}
export default async function ShopifyInventoryDetailPage({ params }: PageProps) {
  try {
    const { sku } = params;
    const location = decodeURIComponent(params.location);

    const shopifyInventory = await getShopifyInventory();

    const product = shopifyInventory.find(p => p.sku === sku);
    const inventoryItem = product?.inventory.find(i => i.location === location);

    if (!product || !inventoryItem) {
      notFound();
    }

    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
              <Link href="/inventory/shopify">
                  <ArrowLeft />
                  <span className="sr-only">Back to Shopify Inventory</span>
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
  } catch (error: any) {
    if (error.name === 'ShopifyFetchError') {
      return (
         <div className="flex flex-col gap-8">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" asChild>
                  <Link href="/inventory/shopify">
                      <ArrowLeft />
                      <span className="sr-only">Back to Shopify Inventory</span>
                  </Link>
              </Button>
              <div>
                  <h1 className="font-headline text-3xl font-semibold tracking-tight">
                      Shopify Inventory
                  </h1>
                  <p className="text-muted-foreground">
                      There was a problem connecting to your Shopify store.
                  </p>
              </div>
            </div>
            <ShopifyApiError />
        </div>
      );
    }
    throw error;
  }
}
