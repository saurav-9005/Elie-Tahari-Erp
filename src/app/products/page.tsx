'use server';

import { useState } from 'react';
import Image from 'next/image';
import { getProducts, type Product } from '@/lib/inventory-data';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { ProductsClient } from './products-client';

export default async function ProductsPage() {
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
}
