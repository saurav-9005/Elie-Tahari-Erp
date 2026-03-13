'use server';

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
import { getShopifyInventory, type ShopifyInventoryItem } from '@/lib/inventory-data';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import ShopifyApiError from '@/components/shopify-api-error';

export default async function WMSInventoryPage() {
  try {
    const shopifyInventoryData = await getShopifyInventory();
    
    const flattenedInventory = shopifyInventoryData.flatMap((product: ShopifyInventoryItem) =>
      product.inventory.map(inv => ({
        productName: product.productName,
        sku: product.sku,
        ...inv,
      }))
    );

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
              WMS Inventory (Live from Shopify)
            </h1>
            <p className="text-muted-foreground">
              Live inventory levels from your Shopify stores and locations.
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
                  <TableHead className="text-right">Committed</TableHead>
                  <TableHead className="text-right">Incoming</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flattenedInventory.map((item) => (
                    <TableRow key={`${item.sku}-${item.location}`}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell>{item.sku}</TableCell>
                      <TableCell><Badge variant="outline">{item.location}</Badge></TableCell>
                      <TableCell className="text-right">{item.available}</TableCell>
                      <TableCell className="text-right">{item.committed}</TableCell>
                      <TableCell className="text-right">{item.incoming}</TableCell>
                    </TableRow>
                  ))
                }
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  } catch (error: any) {
    if (error.name === 'ShopifyFetchError') {
      const errorDetails = error.errors ? JSON.stringify(error.errors, null, 2) : 'No further details available.';
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
                  There was a problem connecting to your Shopify store.
                </p>
              </div>
            </div>
            <ShopifyApiError details={errorDetails} />
        </div>
      );
    }
    throw error;
  }
}
