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
import type { FactoryInventoryItem } from '@/lib/inventory-data';

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

type DashboardChartsProps = {
    topFactoryPOs: FactoryInventoryItem[];
    inventoryValueData: any[];
    inventoryValueTrendData: any[];
    stockAgingData: any[];
}

export function DashboardCharts({
    topFactoryPOs,
    inventoryValueData,
    inventoryValueTrendData,
    stockAgingData
}: DashboardChartsProps) {
    return (
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
    )
}
