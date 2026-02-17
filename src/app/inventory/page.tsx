'use client';

import { useState } from 'react';
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
import { factoryOrders, warehouseInventory, shopifyProducts, type FactoryOrder, type WarehouseItem, type ShopifyProduct } from '@/lib/inventory-data';
import { sendOutOfStockReport } from './actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail } from 'lucide-react';
import { Badge } from '@/components/ui/badge';


export default function InventoryPage() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    async function handleSendReport() {
        setIsLoading(true);
        const result = await sendOutOfStockReport();
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

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-start">
        <div>
            <h1 className="font-headline text-3xl font-semibold tracking-tight">
                Inventory Tracking
            </h1>
            <p className="text-muted-foreground">
                Monitor inventory from factory, warehouse, and Shopify.
            </p>
        </div>
        <Button onClick={handleSendReport} disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin" /> : <Mail />}
            Send Out of Stock Report
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Factory Orders</CardTitle>
            <CardDescription>Inventory in production or transit.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {factoryOrders.map((order: FactoryOrder) => (
                  <TableRow key={order.orderId}>
                    <TableCell className="font-medium">{order.productName}</TableCell>
                    <TableCell>{order.quantity}</TableCell>
                    <TableCell><Badge variant={order.status === 'In Production' ? 'secondary' : 'default'}>{order.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Warehouse Inventory</CardTitle>
            <CardDescription>Inventory in warehouse storage.</CardDescription>
          </CardHeader>
          <CardContent>
             <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {warehouseInventory.map((item: WarehouseItem) => (
                  <TableRow key={item.itemId}>
                    <TableCell className="font-medium">{item.productName}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.location}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
       <Card>
          <CardHeader>
            <CardTitle>Shopify Product Inventory</CardTitle>
            <CardDescription>Live inventory levels from your online store.</CardDescription>
          </CardHeader>
          <CardContent>
             <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Sellable Quantity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shopifyProducts.map((product: ShopifyProduct) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.title}</TableCell>
                    <TableCell>{product.sku}</TableCell>
                    <TableCell className="text-right">{product.inventory_quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
    </div>
  );
}
