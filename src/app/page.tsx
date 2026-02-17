'use client';

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
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  DollarSign,
  Package,
  PackageX,
  Warehouse,
} from 'lucide-react';
import { overallInventoryData, inventoryValueData } from '@/lib/data';

const chartConfig = {
  quantity: {
    label: 'Quantity',
    color: 'hsl(var(--chart-1))',
  },
  value: {
    label: 'Value',
    color: 'hsl(var(--chart-2))',
  }
};

export default function Dashboard() {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-headline text-3xl font-semibold tracking-tight">
        Inventory Dashboard
      </h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inventory Units</CardTitle>
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
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
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
              Products with zero inventory
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
              Products with &lt; 5 units
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Inventory by Location</CardTitle>
            <CardDescription>Factory vs. Warehouse vs. Shopify</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <BarChart data={overallInventoryData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="location"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(value) => `${'value'}`}
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent />}
                />
                <Bar dataKey="quantity" fill="var(--color-quantity)" radius={8} />
              </BarChart>
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
                  content={<ChartTooltipContent formatter={(value) => `$${(value as number).toLocaleString()}`} />}
                />
                <Bar dataKey="value" fill="var(--color-value)" radius={5} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
