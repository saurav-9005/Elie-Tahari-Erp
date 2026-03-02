'use server';

import { getProducts } from '@/lib/inventory-data';
import { ProductsClient } from './products-client';
import ShopifyApiError from '@/components/shopify-api-error';

export default async function ProductsPage() {
  try {
    const products = await getProducts();
    const allCategories = ['All', ...new Set(products.map(p => p.category))];
    
    return (
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="font-headline text-3xl font-semibold tracking-tight">
            Product Catalog
          </h1>
          <p className="text-muted-foreground">
            Browse products from your Shopify store.
          </p>
        </div>
        <ProductsClient products={products} allCategories={allCategories} />
      </div>
    );
  } catch (error: any) {
    if (error.name === 'ShopifyFetchError') {
      return (
         <div className="flex flex-col gap-8">
            <div>
                <h1 className="font-headline text-3xl font-semibold tracking-tight">
                    Product Catalog
                </h1>
                <p className="text-muted-foreground">
                    There was a problem connecting to your Shopify store.
                </p>
            </div>
            <ShopifyApiError />
        </div>
      );
    }

    // For any other error, re-throw it to be handled by Next.js's default error boundary.
    throw error;
  }
}
