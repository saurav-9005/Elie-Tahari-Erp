'use client';

import { useState } from 'react';
import Image from 'next/image';
import { type Product } from '@/lib/inventory-data';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type ProductsClientProps = {
    products: Product[];
    allCategories: string[];
}

export function ProductsClient({ products, allCategories }: ProductsClientProps) {
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredProducts =
    selectedCategory === 'All'
      ? products
      : products.filter(p => p.category === selectedCategory);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Filter by tag:</span>
        {allCategories.map(category => (
          <Button
            key={category}
            variant={selectedCategory === category ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(category)}
            className="rounded-full"
          >
            {category}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredProducts.map((product: Product) => {
          return (
            <Card key={product.id} className="flex flex-col overflow-hidden">
              <CardHeader className="p-0">
                <div className="relative aspect-[4/3] w-full bg-muted">
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        No Image
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-grow p-4">
                <Badge variant="outline" className="mb-2">
                  {product.category}
                </Badge>
                <h3 className="font-semibold">{product.name}</h3>
                <p className="text-sm text-muted-foreground">{product.sku}</p>
              </CardContent>
              <CardFooter className="flex flex-col items-start gap-3 p-4 pt-0">
                <div className="w-full text-lg font-bold">${product.price.toFixed(2)}</div>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </>
  );
}
