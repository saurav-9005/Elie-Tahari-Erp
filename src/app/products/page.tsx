import Image from 'next/image';
import { products, type Product } from '@/lib/inventory-data';
import { PlaceHolderImages, type ImagePlaceholder } from '@/lib/placeholder-images';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const imageMap = new Map<string, ImagePlaceholder>(
  PlaceHolderImages.map(img => [img.id, img])
);

export default function ProductsPage() {
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
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product: Product) => {
                const image = imageMap.get(product.imagePlaceholderId);
                const aov = product.unitsSold > 0 ? product.revenue / product.unitsSold : 0;
                return (
                    <Card key={product.id} className="flex flex-col overflow-hidden">
                        <CardHeader className="p-0">
                            <div className="relative aspect-[4/3] w-full">
                                <Image 
                                    src={image?.imageUrl || `https://picsum.photos/seed/${product.id}/400/300`}
                                    alt={product.name}
                                    fill
                                    className="object-cover"
                                    data-ai-hint={image?.imageHint}
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="flex-grow p-4">
                             <Badge variant="outline" className="mb-2">{product.category}</Badge>
                            <h3 className="font-semibold">{product.name}</h3>
                            <p className="text-sm text-muted-foreground">{product.sku}</p>
                        </CardContent>
                        <CardFooter className="flex flex-col items-start gap-3 p-4 pt-0">
                            <div className="w-full text-lg font-bold">${product.price.toFixed(2)}</div>
                            <Separator className="w-full" />
                            <div className="grid w-full grid-cols-3 gap-2 text-center text-sm">
                                <div>
                                    <p className="font-semibold">{product.unitsSold}</p>
                                    <p className="text-xs text-muted-foreground">Units Sold</p>
                                </div>
                                <div>
                                    <p className="font-semibold">${(product.revenue / 1000).toFixed(1)}k</p>
                                    <p className="text-xs text-muted-foreground">Revenue</p>
                                </div>
                                <div>
                                    <p className="font-semibold">${aov.toFixed(2)}</p>
                                    <p className="text-xs text-muted-foreground">AOV</p>
                                </div>
                            </div>
                        </CardFooter>
                    </Card>
                )
            })}
        </div>
    </div>
  );
}
