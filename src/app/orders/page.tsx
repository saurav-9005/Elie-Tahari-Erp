'use server';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { getOrders, type Order } from '@/lib/inventory-data';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import ShopifyApiError from '@/components/shopify-api-error';

function getFinancialStatusVariant(status: Order['financialStatus']) {
    switch (status) {
        case 'PAID': return 'default';
        case 'PENDING': return 'secondary';
        case 'REFUNDED':
        case 'PARTIALLY_REFUNDED':
        case 'VOIDED':
            return 'destructive';
        default: return 'outline';
    }
}

function getFulfillmentStatusVariant(status: Order['fulfillmentStatus']) {
    switch (status) {
        case 'FULFILLED': return 'default';
        case 'UNFULFILLED': return 'secondary';
        case 'PARTIALLY_FULFILLED': return 'outline';
        default: return 'secondary';
    }
}

export default async function OrdersPage() {
    try {
        const orders = await getOrders();

        // Get the store URL from environment variables to build the link
        const storeUrl = process.env.SHOPIFY_STORE_URL || '';

        return (
            <div className="flex flex-col gap-8">
                <div>
                    <h1 className="font-headline text-3xl font-semibold tracking-tight">
                        Orders
                    </h1>
                    <p className="text-muted-foreground">
                        Displaying the 20 most recent orders from Shopify.
                    </p>
                </div>

                <Card>
                    <CardContent className="pt-6">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Order</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Payment Status</TableHead>
                                    <TableHead>Fulfillment Status</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-medium">{order.orderNumber}</TableCell>
                                        <TableCell>{format(new Date(order.date), 'MMM d, yyyy')}</TableCell>
                                        <TableCell>
                                            <div className="font-medium">{order.customerName}</div>
                                            <div className="text-sm text-muted-foreground">{order.customerEmail}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={getFinancialStatusVariant(order.financialStatus)}>
                                                {order.financialStatus.replace(/_/g, ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={getFulfillmentStatusVariant(order.fulfillmentStatus)}>
                                                {order.fulfillmentStatus.replace(/_/g, ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: order.currency }).format(order.total)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {storeUrl && (
                                                <Button asChild variant="ghost" size="sm">
                                                    <Link href={`${storeUrl.replace('.myshopify.com', '')}.myshopify.com/admin/orders/${order.orderId}`} target="_blank">
                                                        View Order
                                                    </Link>
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        );
    } catch (error: any) {
        if (error.name === 'ShopifyFetchError') {
          const errorDetails = error.errors ? JSON.stringify(error.errors, null, 2) : 'No further details available.';
          return (
             <div className="flex flex-col gap-8">
                <div>
                    <h1 className="font-headline text-3xl font-semibold tracking-tight">
                        Orders
                    </h1>
                    <p className="text-muted-foreground">
                        There was a problem connecting to your Shopify store.
                    </p>
                </div>
                <ShopifyApiError details={errorDetails} />
            </div>
          );
        }
        throw error;
    }
}
