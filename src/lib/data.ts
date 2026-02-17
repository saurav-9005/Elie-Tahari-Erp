import type { ImagePlaceholder } from './placeholder-images';
import { PlaceHolderImages } from './placeholder-images';

const imageMap = PlaceHolderImages.reduce((acc, img) => {
  acc[img.id] = img;
  return acc;
}, {} as Record<string, ImagePlaceholder>);

export const salesData = [
  { month: 'Jan', sales: 12345 },
  { month: 'Feb', sales: 15678 },
  { month: 'Mar', sales: 18901 },
  { month: 'Apr', sales: 22345 },
  { month: 'May', sales: 25678 },
  { month: 'Jun', sales: 28901 },
];

export const inventoryData = [
  { category: 'Dresses', quantity: 120 },
  { category: 'Coats', quantity: 250 },
  { category: 'Skirts', quantity: 80 },
  { category: 'Accessories', quantity: 300 },
  { category: 'Tops', quantity: 150 },
];

export type Product = {
  id: string;
  name: string;
  sku: string;
  price: number;
  inventory: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  image: ImagePlaceholder;
};

export const products: Product[] = [
  {
    id: 'prod-001',
    name: 'A-line Silk Dress',
    sku: 'CF-DRS-SLK-01',
    price: 850.0,
    inventory: 25,
    status: 'In Stock',
    image: imageMap['silk-dress'],
  },
  {
    id: 'prod-002',
    name: 'Floral Print Maxi Skirt',
    sku: 'CF-SKT-MAX-02',
    price: 450.0,
    inventory: 8,
    status: 'Low Stock',
    image: imageMap['maxi-skirt'],
  },
  {
    id: 'prod-003',
    name: 'Cashmere Cardigan',
    sku: 'CF-CGN-CSH-03',
    price: 1200.0,
    inventory: 15,
    status: 'In Stock',
    image: imageMap['cashmere-cardigan'],
  },
  {
    id: 'prod-004',
    name: 'Leather Clutch',
    sku: 'CF-ACC-LTH-04',
    price: 600.0,
    inventory: 0,
    status: 'Out of Stock',
    image: imageMap['leather-clutch'],
  },
  {
    id: 'prod-005',
    name: 'Wool Coat',
    sku: 'CF-COA-WOL-05',
    price: 1500.0,
    inventory: 40,
    status: 'In Stock',
    image: imageMap['wool-coat'],
  },
  {
    id: 'prod-006',
    name: 'Linen Blouse',
    sku: 'CF-BLO-LIN-06',
    price: 350.0,
    inventory: 3,
    status: 'Low Stock',
    image: imageMap['linen-blouse'],
  },
  {
    id: 'prod-007',
    name: 'Ankle Suede Boots',
    sku: 'CF-BOT-SUE-07',
    price: 950.0,
    inventory: 18,
    status: 'In Stock',
    image: imageMap['suede-boots'],
  },
];

export type Order = {
  id: string;
  customer: {
    name: string;
    email: string;
  };
  date: string;
  status: 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  total: number;
};

export const orders: Order[] = [
  {
    id: 'ORD-240701',
    customer: { name: 'Olivia Martin', email: 'olivia.martin@email.com' },
    date: '2024-07-01',
    status: 'Delivered',
    total: 1300.0,
  },
  {
    id: 'ORD-240702',
    customer: { name: 'Jackson Lee', email: 'jackson.lee@email.com' },
    date: '2024-07-02',
    status: 'Shipped',
    total: 600.0,
  },
  {
    id: 'ORD-240703',
    customer: { name: 'Isabella Nguyen', email: 'isabella.nguyen@email.com' },
    date: '2024-07-03',
    status: 'Processing',
    total: 1500.0,
  },
  {
    id: 'ORD-240704',
    customer: { name: 'William Kim', email: 'william.kim@email.com' },
    date: '2024-07-04',
    status: 'Processing',
    total: 350.0,
  },
  {
    id: 'ORD-240705',
    customer: { name: 'Sophia Garcia', email: 'sophia.garcia@email.com' },
    date: '2024-07-05',
    status: 'Cancelled',
    total: 850.0,
  },
  {
    id: 'ORD-240706',
    customer: { name: 'Ethan Hernandez', email: 'ethan.hernandez@email.com' },
    date: '2024-07-06',
    status: 'Delivered',
    total: 950.0,
  },
];
