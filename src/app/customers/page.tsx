'use server';

import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '@/components/ui/table';
import { getCustomers } from '@/lib/inventory-data';
import ShopifyApiError from '@/components/shopify-api-error';

export default async function CustomersPage() {
    try {
        const customers = await getCustomers();

        return (
            <div className="flex flex-col gap-8">
                <div>
                    <h1 className="font-headline text-3xl font-semibold tracking-tight">
                        Customers
                    </h1>
                    <p className="text-muted-foreground">
                        Displaying the 20 most recent customers from Shopify.
                    </p>
                </div>

                <Card>
                    <CardContent className="pt-6">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead className="text-right">Orders</TableHead>
                                    <TableHead className="text-right">Total Spent</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {customers.map((customer) => (
                                    <TableRow key={customer.id}>
                                        <TableCell>
                                            <div className="font-medium">{customer.name}</div>
                                            <div className="text-sm text-muted-foreground">{customer.email}</div>
                                        </TableCell>
                                        <TableCell>{customer.location}</TableCell>
                                        <TableCell className="text-right">{customer.orderCount}</TableCell>
                                        <TableCell className="text-right">
                                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: customer.currency }).format(customer.totalSpent)}
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
                        Customers
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
