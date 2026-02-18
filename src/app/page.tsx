'use client';

import { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Pie,
  PieChart,
  Cell,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { DollarSign, Package, PackageX, Warehouse } from 'lucide-react';
import { inventoryValueData } from '@/lib/data';
import {
  factoryInventory,
  warehouseInventory,
  shopifyInventory,
} from '@/lib/inventory-data';

type ConsolidatedInventoryItem = {
  sku: string;
  productName: string;
  factoryQty: number;
  warehouseQty: number;
  shopifySellableQty: number;
  totalSellable: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Overstocked';
};

// New data for the new charts
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

const chartConfig = {
  quantity: {
    label: 'Quantity',
    color: 'hsl(var(--chart-1))',
  },
  value: {
    label: 'Value ($)',
    color: 'hsl(var(--chart-2))',
  },
  'In Stock': {
    label: 'In Stock',
    color: 'hsl(var(--chart-2))',
  },
  'Low Stock': {
    label: 'Low Stock',
    color: 'hsl(var(--chart-4))',
  },
  'Out of Stock': {
    label: 'Out of Stock',
    color: 'hsl(var(--chart-1))',
  },
  Overstocked: {
    label: 'Overstocked',
    color: 'hsl(var(--chart-5))',
  },
};

export default function Dashboard() {
  const inventoryStatusSummary = useMemo(() => {
    function getConsolidatedInventory(): ConsolidatedInventoryItem[] {
      const inventoryMap = new Map<string, ConsolidatedInventoryItem>();

      const allSkus = new Set([
        ...factoryInventory.map((i) => i.sku),
        ...warehouseInventory.map((i) => i.sku),
        ...shopifyInventory.map((i) => i.sku),
      ]);

      for (const sku of allSkus) {
        const factoryItem = factoryInventory.find((i) => i.sku === sku);
        const warehouseItem = warehouseInventory.find((i) => i.sku === sku);
        const shopifyItem = shopifyInventory.find((i) => i.sku === sku);

        const productName =
          factoryItem?.style ||
          warehouseItem?.productName ||
          shopifyItem?.productName ||
          'Unknown Product';

        const factoryQty = factoryItem?.quantity || 0;
        const warehouseQty = warehouseItem?.availableQty || 0;
        const shopifySellableQty =
          shopifyItem?.inventory.reduce(
            (acc, loc) => acc + loc.available,
            0
          ) || 0;

        const totalSellable = warehouseQty + shopifySellableQty;

        let status: ConsolidatedInventoryItem['status'] = 'In Stock';
        if (totalSellable <= 0) {
          status = 'Out of Stock';
        } else if (totalSellable < 10) {
          status = 'Low Stock';
        } else if (totalSellable > 200) {
          status = 'Overstocked';
        }

        inventoryMap.set(sku, {
          sku,
          productName,
          factoryQty,
          warehouseQty,
          shopifySellableQty,
          totalSellable,
          status,
        });
      }

      return Array.from(inventoryMap.values());
    }

    const statusCounts = getConsolidatedInventory().reduce(
      (acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      },
      {} as Record<ConsolidatedInventoryItem['status'], number>
    );

    return [
      {
        name: 'In Stock',
        value: statusCounts['In Stock'] || 0,
        fill: 'var(--color-in-stock)',
      },
      {
        name: 'Low Stock',
        value: statusCounts['Low Stock'] || 0,
        fill: 'var(--color-low-stock)',
      },
      {
        name: 'Out of Stock',
        value: statusCounts['Out of Stock'] || 0,
        fill: 'var(--color-out-of-stock)',
      },
      {
        name: 'Overstocked',
        value: statusCounts['Overstocked'] || 0,
        fill: 'var(--color-overstocked)',
      },
    ].filter((item) => item.value > 0);
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-headline text-3xl font-semibold tracking-tight">
        Inventory Dashboard
      </h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Inventory Units
            </CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12,345</div>
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
            <div className="text-2xl font-bold">$2,125,920.00</div>
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
            <div className="text-2xl font-bold">1</div>
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
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">
              SKUs with &lt; 10 units
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Inventory Status Breakdown</CardTitle>
            <CardDescription>Number of SKUs by current inventory status.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                <Pie
                  data={inventoryStatusSummary}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  strokeWidth={2}
                >
                  {inventoryStatusSummary.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={entry.fill}
                      className="[&>*]:stroke-background"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory Value by Category</CardTitle>
            <CardDescription>Top 5 product categories by value</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <BarChart data={inventoryValueData} layout="vertical">
                <CartesianGrid horizontal={false} />
                <YAxis
                  dataKey="category"
                  type="category"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  width={80}
                />
                <XAxis type="number" hide />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      formatter={(value) =>
                        `$${(value as number).toLocaleString()}`
                      }
                    />
                  }
                />
                <Bar dataKey="value" fill="var(--color-value)" radius={5} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Inventory Value Trend</CardTitle>
            <CardDescription>
              Value of inventory over the last 6 months.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <LineChart data={inventoryValueTrendData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(value) => `$${Number(value) / 1000000}M`}
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      formatter={(value) =>
                        `$${(value as number).toLocaleString()}`
                      }
                    />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-value)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Stock Aging Report</CardTitle>
            <CardDescription>Distribution of inventory by age.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <BarChart data={stockAgingData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="range"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <YAxis tickLine={false} tickMargin={10} axisLine={false} hide />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Bar dataKey="quantity" fill="var(--color-quantity)" radius={8} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
