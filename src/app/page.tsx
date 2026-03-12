'use server';

import { Suspense } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DollarSign, Loader2, Package, PackageX, Warehouse } from 'lucide-react';
import { inventoryValueData } from '@/lib/data';
import {
  factoryInventory,
  getDashboardStats
} from '@/lib/inventory-data';
import { DashboardCharts } from './dashboard-charts';
import ShopifyApiError from '@/components/shopify-api-error';

const inventoryValueTrendData = [
  { date: 'Jan 24', value: 2050000 },
  { date: 'Feb 24', value: 2080000 },
  { date: 'Mar 24', value: 2150000 },
  { date: 'Apr 24', value: 2125920 },
  { date: 'May 24', value: 2180000 },
  { date: 'Jun 24', value: 2250000 },
];

const stockAgingData = [
  { range: '0-30d', quantity: 8200 },
  { range: '31-60d', quantity: 2500 },
  { range: '61-90d', quantity: 1200 },
  { range: '90-180d', quantity: 445 },
  { range: '>180d', quantity: 150 },
];

async function KpiCards() {
  try {
    const stats = await getDashboardStats();

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Inventory Units
            </CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUnits.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Across all locations
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Inventory Value
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">
              Total value of all stock
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Out of Stock Products
            </CardTitle>
            <PackageX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.outOfStockCount}</div>
            <p className="text-xs text-muted-foreground">
              SKUs with zero sellable inventory
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Low Stock Products
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lowStockCount}</div>
            <p className="text-xs text-muted-foreground">
              SKUs with &lt; 10 units
            </p>
          </CardContent>
        </Card>
      </div>
    );
  } catch (error: any) {
    if (error.name === 'ShopifyFetchError') {
        const errorDetails = error.errors ? JSON.stringify(error.errors, null, 2) : 'No further details available.';
        return (
            <div className="md:col-span-2 lg:col-span-4">
                <ShopifyApiError details={errorDetails} />
            </div>
        )
    }
    throw error;
  }
}

export default async function Dashboard() {
  const topFactoryPOs = factoryInventory
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-headline text-3xl font-semibold tracking-tight">
        Inventory Dashboard
      </h1>

      <Suspense fallback={<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="pt-6"><Loader2 className="animate-spin"/></CardContent></Card>
        <Card><CardContent className="pt-6"><Loader2 className="animate-spin"/></CardContent></Card>
        <Card><CardContent className="pt-6"><Loader2 className="animate-spin"/></CardContent></Card>
        <Card><CardContent className="pt-6"><Loader2 className="animate-spin"/></CardContent></Card>
      </div>}>
        <KpiCards />
      </Suspense>

      <DashboardCharts
        topFactoryPOs={topFactoryPOs}
        inventoryValueData={inventoryValueData}
        inventoryValueTrendData={inventoryValueTrendData}
        stockAgingData={stockAgingData}
      />
    </div>
  );
}
