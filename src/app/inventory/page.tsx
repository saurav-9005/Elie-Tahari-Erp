'use client';

import { useState, useEffect } from 'react';
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
import { factoryInventory, warehouseInventory, shopifyInventory, type FactoryInventoryItem, type WarehouseInventoryItem, type ShopifyInventoryItem } from '@/lib/inventory-data';
import { generateAndSendReport } from './actions';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';


export default function InventoryPage() {
    const { user, isUserLoading: isUserLoadingAuth } = useUser();
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!isUserLoadingAuth && !user) {
          router.push('/login');
        }
    }, [user, isUserLoadingAuth, router]);

    async function handleSendReport() {
        setIsLoading(true);
        const result = await generateAndSendReport();
        if (result.success) {
            toast({
                title: 'Inventory Report',
                description: result.message,
            });
        } else {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: result.message,
            });
        }
        setIsLoading(false);
    }
    
    if (isUserLoadingAuth || !user) {
      return (
          <div className="flex h-[calc(100vh-theme(spacing.14))] items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
      );
    }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-start">
        <div>
            <h1 className="font-headline text-3xl font-semibold tracking-tight">
                End-to-End Inventory Management
            </h1>
            <p className="text-muted-foreground">
                Track inventory from Factory, to Warehouse (WMS), to Shopify.
            </p>
        </div>
        <Button onClick={handleSendReport} disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin" /> : <AlertTriangle />}
            Generate & Send Alert Report
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Factory Inventory</CardTitle>
          <CardDescription>Inventory in production or transit from the factory.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Production Status</TableHead>
                <TableHead>Expected Arrival</TableHead>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>WMS Inventory</CardTitle>
          <CardDescription>Live inventory data from the warehouse management system.</CardDescription>
        </CardHeader>
        <CardContent>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

       <Card>
          <CardHeader>
            <CardTitle>Shopify Inventory</CardTitle>
            <CardDescription>Live inventory levels from your Shopify stores and locations.</CardDescription>
          </CardHeader>
          <CardContent>
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
                {shopifyInventory.flatMap((product: ShopifyInventoryItem) => 
                    product.inventory.map(inv => (
                        <TableRow key={`${product.sku}-${inv.location}`}>
                            <TableCell className="font-medium">{product.productName}</TableCell>
                            <TableCell>{product.sku}</TableCell>
                            <TableCell><Badge variant="outline">{inv.location}</Badge></TableCell>
                            <TableCell className="text-right">{inv.available}</TableCell>
                            <TableCell className="text-right">{inv.committed}</TableCell>
                            <TableCell className="text-right">{inv.incoming}</TableCell>
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
