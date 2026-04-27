-- Display name from Shopify (e.g. #RS376728); used by reports and shopify-update-orders-meta.ts
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_name TEXT;

NOTIFY pgrst, 'reload schema';
