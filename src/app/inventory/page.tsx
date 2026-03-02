'use server';

import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Badge } from '@/components/ui/badge';
import { factoryInventory, warehouseInventory, type FactoryInventoryItem, type WarehouseInventoryItem, getShopifyInventory, type ShopifyInventoryItem } from '@/lib/inventory-data';
import { AlertTriangle, ArrowRight, Package, ShoppingCart, Truck } from 'lucide-react';
import Link from 'next/link';
import { Toaster } from '@/components/ui/toaster';
import ReportButton from './report-button';
import ShopifyApiError from '@/components/shopify-api-error';

function InventoryStats({ summaryStats }: { summaryStats: any }) {
    return (
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
    )
}

function ShopifyInventorySnapshot({ shopifyData }: { shopifyData: ShopifyInventoryItem[]}) {
    const flatShopifyData = shopifyData.flatMap((product: ShopifyInventoryItem) =>
        product.inventory.map(inv => ({...product, ...inv}))
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle>Shopify Inventory Snapshot</CardTitle>
                <CardDescription>A quick look at sellable stock on Shopify.</CardDescription>
            </CardHeader>
            <CardContent>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {flatShopifyData.slice(0,5).map((item) =>
                    <TableRow key={`${item.sku}-${item.location}`}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell>{item.sku}</TableCell>
                        <TableCell><Badge variant="outline">{item.location}</Badge></TableCell>
                        <TableCell className="text-right">{item.available}</TableCell>
                        <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm">
                            <Link href={`/inventory/shopify/${item.sku}/${encodeURIComponent(item.location)}`}>View More</Link>
                        </Button>
                        </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
            </CardContent>
        </Card>
    );
}

export default async function InventoryPage() {
  try {
    const shopifyData = await getShopifyInventory();
    
    const factoryPOs = factoryInventory.length;
    const factoryUnits = factoryInventory.reduce((acc, item) => acc + item.quantity, 0);

    const wmsAvailable = warehouseInventory.reduce((acc, item) => acc + item.availableQty, 0);
    const wmsReserved = warehouseInventory.reduce((acc, item) => acc + item.reservedQty, 0);

    const shopifySellable = shopifyData.reduce((acc, product) => {
        return acc + product.inventory.reduce((sum, inv) => sum + inv.available, 0);
    }, 0);
    const shopifyLocations = new Set(shopifyData.flatMap(p => p.inventory.map(i => i.location))).size;

    const summaryStats = { factoryPOs, factoryUnits, wmsAvailable, wmsReserved, shopifySellable, shopifyLocations };

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
            <ReportButton />
        </div>

        <InventoryStats summaryStats={summaryStats} />

        <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Factory Inventory</CardTitle>
                        <CardDescription>Showing the 5 most recent purchase orders.</CardDescription>
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
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {factoryInventory.slice(0, 5).map((order: FactoryInventoryItem) => (
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

                <Card>
                    <CardHeader>
                        <CardTitle>WMS Inventory Snapshot</CardTitle>
                        <CardDescription>A quick look at current warehouse stock.</CardDescription>
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
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {warehouseInventory.slice(0, 5).map((item: WarehouseInventoryItem) => (
                                <TableRow key={item.sku}>
                                <TableCell className="font-medium">{item.productName}</TableCell>
                                <TableCell>{item.sku}</TableCell>
                                <TableCell>{item.warehouseLocation}</TableCell>
                                <TableCell className="text-right">{item.availableQty}</TableCell>
                                <TableCell className="text-right">{item.reservedQty}</TableCell>
                                <TableCell className="text-right">
                                    <Button asChild variant="ghost" size="sm">
                                    <Link href={`/inventory/wms/${item.sku}`}>View More</Link>
                                    </Button>
                                </TableCell>
                                </TableRow>
                            ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <ShopifyInventorySnapshot shopifyData={shopifyData} />
            </div>
        <Toaster />
        </div>
    );
    } catch (error: any) {
        if (error.name === 'ShopifyFetchError') {
          return (
            <div className="flex flex-col gap-8">
              <div className="flex justify-between items-start">
                <div>
                    <h1 className="font-headline text-3xl font-semibold tracking-tight">
                        End-to-End Inventory Management
                    </h1>
                    <p className="text-muted-foreground">
                        There was a problem connecting to your Shopify store.
                    </p>
                </div>
                <ReportButton />
              </div>
              <ShopifyApiError />
              <Toaster />
            </div>
          );
        }
        throw error;
    }
}
