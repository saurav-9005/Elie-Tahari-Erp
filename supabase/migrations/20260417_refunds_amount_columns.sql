-- Shopify refund import: store line aggregates and shipping at refund level.
ALTER TABLE refunds
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS total_tax NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS shipping_refunded NUMERIC(10,2);

NOTIFY pgrst, 'reload schema';
