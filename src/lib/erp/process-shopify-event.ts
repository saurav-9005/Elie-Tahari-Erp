import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/lib/database.types';

type AdminClient = SupabaseClient<Database>;

function asRecord(v: Json): Record<string, unknown> | null {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

/**
 * Maps a staged Shopify webhook row into ERP tables. Extend as you add topics.
 */
export async function processShopifyEventRow(
  admin: AdminClient,
  eventId: string,
  eventType: string,
  rawPayload: Json
): Promise<void> {
  const payload = asRecord(rawPayload);
  if (!payload) {
    throw new Error('Invalid JSON payload');
  }

  if (eventType === 'orders/create' || eventType === 'orders/updated') {
    const id = payload.id;
    const shopifyOrderId = id != null ? String(id) : null;
    if (!shopifyOrderId) throw new Error('Order payload missing id');

    const customer = asRecord(payload.customer as Json);
    const email =
      (payload.email as string) ||
      (customer?.email as string | undefined) ||
      null;
    const first = (customer?.first_name as string) || '';
    const last = (customer?.last_name as string) || '';
    const customerName = [first, last].filter(Boolean).join(' ') || null;

    const totalPrice =
      payload.total_price != null ? parseFloat(String(payload.total_price)) : null;
    const currency = (payload.currency as string) || 'USD';
    const status = (payload.financial_status as string) || 'pending';

    const { error } = await admin.from('orders').upsert(
      {
        shopify_order_id: shopifyOrderId,
        customer_email: email,
        customer_name: customerName,
        total_price: totalPrice,
        currency,
        status,
        line_items: (payload.line_items as Json) ?? null,
        shipping_address: (payload.shipping_address as Json) ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'shopify_order_id' }
    );

    if (error) throw error;
    return;
  }

  if (eventType === 'customers/create' || eventType === 'customers/update') {
    const id = payload.id;
    const shopifyCustomerId = id != null ? String(id) : null;
    if (!shopifyCustomerId) throw new Error('Customer payload missing id');

    const first = (payload.first_name as string) || '';
    const last = (payload.last_name as string) || '';
    const fullName = [first, last].filter(Boolean).join(' ') || null;

    const { error } = await admin.from('customers').upsert(
      {
        shopify_customer_id: shopifyCustomerId,
        email: (payload.email as string) || null,
        full_name: fullName,
        phone: (payload.phone as string) || null,
        total_orders:
          payload.orders_count != null ? parseInt(String(payload.orders_count), 10) || 0 : 0,
        total_spent:
          payload.total_spent != null ? parseFloat(String(payload.total_spent)) || 0 : 0,
      },
      { onConflict: 'shopify_customer_id' }
    );

    if (error) throw error;
    return;
  }

  if (eventType === 'products/create' || eventType === 'products/update') {
    const id = payload.id;
    const productId = id != null ? String(id) : null;
    if (!productId) throw new Error('Product payload missing id');

    const variant = Array.isArray(payload.variants)
      ? (payload.variants[0] as Record<string, unknown> | undefined)
      : undefined;
    const variantId = variant?.id != null ? String(variant.id) : null;
    const sku = variant?.sku != null ? String(variant.sku) : null;
    const invQty =
      variant?.inventory_quantity != null
        ? parseInt(String(variant.inventory_quantity), 10) || 0
        : 0;

    const title = (payload.title as string) || 'Untitled';

    const { error } = await admin.from('inventory').upsert(
      {
        shopify_product_id: productId,
        shopify_variant_id: variantId,
        title,
        sku,
        quantity: invQty,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: 'shopify_product_id' }
    );

    if (error) throw error;
    return;
  }

  throw new Error(`Unsupported event_type: ${eventType}`);
}
