'use client';

import { useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
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
  Cell,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { DollarSign, Loader2, Package, PackageX, Warehouse } from 'lucide-react';
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
  'In Production': {
    label: 'In Production',
    color: 'hsl(var(--chart-4))',
  },
  'Awaiting Shipment': {
    label: 'Awaiting Shipment',
    color: 'hsl(var(--chart-5))',
  },
  Shipped: {
    label: 'Shipped',
    color: 'hsl(var(--chart-2))',
  },
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm text-sm">
        <p className="font-bold">{label}</p>
        <p className="text-muted-foreground">{data.styleName}</p>
        <p><span className="font-bold" style={{ color: payload[0].fill }}>●</span> {data.productionStatus}: {data.quantity} units</p>
      </div>
    );
  }

  return null;
};


export default function Dashboard() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const topFactoryPOs = useMemo(() => {
    return factoryInventory
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, []);

  if (isUserLoading || !user) {
    return (
        <div className="flex h-[calc(100vh-theme(spacing.14))] items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

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
            <CardTitle>Top 5 Factory POs</CardTitle>
            <CardDescription>
              Largest purchase orders from the factory by quantity.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <BarChart data={topFactoryPOs} margin={{ left: -20, bottom: -10 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="poNumber"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  tickFormatter={(value) => value.slice(-3)}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                />
                <ChartTooltip
                  cursor={false}
                  content={<CustomTooltip />}
                />
                <Bar dataKey="quantity" radius={5}>
                  {topFactoryPOs.map((entry) => (
                    <Cell key={`cell-${entry.poNumber}`} fill={chartConfig[entry.productionStatus as keyof typeof chartConfig].color} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'hsl(var(--chart-2))' }} />
                <span>Shipped</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'hsl(var(--chart-5))' }} />
                <span>Awaiting Shipment</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'hsl(var(--chart-4))' }} />
                <span>In Production</span>
              </div>
            </div>
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
