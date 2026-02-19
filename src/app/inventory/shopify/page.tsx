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
import { shopifyInventory, type ShopifyInventoryItem } from '@/lib/inventory-data';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function ShopifyInventoryPage() {
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
            Shopify Inventory
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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shopifyInventory.flatMap((product: ShopifyInventoryItem) =>
                product.inventory.map(inv => (
                  <TableRow key={`${product.sku}-${inv.location}`}>
                    <TableCell className="font-medium">{product.productName}</TableCell>
                    <TableCell>{product.sku}</TableCell>
                    <TableCell><Badge variant="outline">{inv.location}</Badge></TableCell>
                    <TableCell className="text-right">{inv.available}</TableCell>
                    <TableCell className="text-right">{inv.committed}</TableCell>
                    <TableCell className="text-right">{inv.incoming}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/inventory/shopify/${product.sku}/${encodeURIComponent(inv.location)}`}>View More</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
