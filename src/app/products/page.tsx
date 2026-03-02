'use server';

import { getProducts } from '@/lib/inventory-data';
import { ProductsClient } from './products-client';
import { ShopifyAuthError } from '@/components/shopify-auth-error';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

export default async function ProductsPage() {
  try {
    const products = await getProducts();
    const allCategories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

    return (
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="font-headline text-3xl font-semibold tracking-tight">
            Product Catalog
          </h1>
          <p className="text-muted-foreground">
            Browse all products and their sales performance.
          </p>
        </div>
        <ProductsClient products={products} allCategories={allCategories} />
      </div>
    );
  } catch (error: any) {
    // Check for the specific 401 error from our custom error factory
    if (error.name === 'ShopifyFetchError' && error.status === 401) {
      return <ShopifyAuthError />;
    }

    // Render a generic error for other issues
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Failed to Load Products</AlertTitle>
          <AlertDescription>
            <p>An unexpected error occurred while trying to fetch data from Shopify.</p>
            <pre className="mt-4 whitespace-pre-wrap rounded-md bg-muted p-4 text-xs font-mono">
              {error.message || 'Unknown error'}
            </pre>
          </AlertDescription>
        </Alert>
      </div>
    );
  }
}
