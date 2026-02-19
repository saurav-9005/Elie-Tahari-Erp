'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { factoryInventory, warehouseInventory, shopifyInventory } from '@/lib/inventory-data';
import { generateAndSendReport } from './actions';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, ArrowRight, Loader2, Package, ShoppingCart, Truck } from 'lucide-react';
import Link from 'next/link';


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

    const summaryStats = useMemo(() => {
        const factoryPOs = factoryInventory.length;
        const factoryUnits = factoryInventory.reduce((acc, item) => acc + item.quantity, 0);

        const wmsAvailable = warehouseInventory.reduce((acc, item) => acc + item.availableQty, 0);
        const wmsReserved = warehouseInventory.reduce((acc, item) => acc + item.reservedQty, 0);

        const shopifySellable = shopifyInventory.reduce((acc, product) => {
            return acc + product.inventory.reduce((sum, inv) => sum + inv.available, 0);
        }, 0);
        const shopifyLocations = new Set(shopifyInventory.flatMap(p => p.inventory.map(i => i.location))).size;

        return { factoryPOs, factoryUnits, wmsAvailable, wmsReserved, shopifySellable, shopifyLocations };
    }, []);

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Truck className="h-8 w-8 text-muted-foreground" />
              <div>
                <CardTitle>Factory Inventory</CardTitle>
                <CardDescription>In production or transit from factory.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-grow space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Active POs</span>
              <span className="font-medium">{summaryStats.factoryPOs}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Units</span>
              <span className="font-medium">{summaryStats.factoryUnits.toLocaleString()}</span>
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/inventory/factory">View All Factory Inventory <ArrowRight className="ml-2" /></Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Package className="h-8 w-8 text-muted-foreground" />
              <div>
                <CardTitle>WMS Inventory</CardTitle>
                <CardDescription>Live data from warehouse system.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-grow space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Available</span>
              <span className="font-medium text-green-600">{summaryStats.wmsAvailable.toLocaleString()}</span>
            </div>
             <div className="flex justify-between">
              <span className="text-muted-foreground">Total Reserved</span>
              <span className="font-medium text-orange-600">{summaryStats.wmsReserved.toLocaleString()}</span>
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/inventory/wms">View All WMS Inventory <ArrowRight className="ml-2" /></Link>
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-4">
              <ShoppingCart className="h-8 w-8 text-muted-foreground" />
              <div>
                <CardTitle>Shopify Inventory</CardTitle>
                <CardDescription>Live levels from Shopify stores.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-grow space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Sellable</span>
              <span className="font-medium text-blue-600">{summaryStats.shopifySellable.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground"># of Locations</span>
              <span className="font-medium">{summaryStats.shopifyLocations}</span>
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/inventory/shopify">View All Shopify Inventory <ArrowRight className="ml-2" /></Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
