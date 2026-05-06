import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 60

async function fetchShopifyPage(url: string, accessToken: string) {
  const res = await fetch(url, {
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json'
    }
  })
  if (!res.ok) throw new Error(`Shopify ${res.status}: ${url}`)
  return res
}

function parseNextPageUrl(linkHeader: string | null): string | null {
  if (!linkHeader) return null
  const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/)
  return match ? match[1] : null
}

async function syncRefunds(): Promise<number> {
  const shopifyUrl = process.env.SHOPIFY_STORE_URL!
  const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  // Fetch orders from 2026 that have refunds
  let ordersUrl: string | null =
    `${shopifyUrl}/admin/api/2024-01/orders.json?limit=250&status=any&created_at_min=2026-01-01`

  let totalImported = 0

  while (ordersUrl) {
    const ordersRes = await fetchShopifyPage(ordersUrl, accessToken)
    const ordersData = await ordersRes.json() as { orders?: Record<string, unknown>[] }
    const orders = ordersData.orders ?? []
    if (orders.length === 0) break

    for (const order of orders) {
      if (!order.id) continue

      // Fetch refunds for this order
      const refundsRes = await fetchShopifyPage(
        `${shopifyUrl}/admin/api/2024-01/orders/${order.id}/refunds.json`,
        accessToken
      )
      const refundsData = await refundsRes.json() as { refunds?: Record<string, unknown>[] }
      const refunds = refundsData.refunds ?? []
      if (refunds.length === 0) continue

      const rows = refunds.map((r) => {
        const transactions = (r.transactions as Record<string, unknown>[]) ?? []
        const totalRefunded = transactions.reduce((sum, t) =>
          sum + parseFloat(String(t.amount ?? 0)), 0)

        const refundLineItems = (r.refund_line_items as Record<string, unknown>[]) ?? []
        const subtotal = refundLineItems.reduce((sum, item) =>
          sum + parseFloat(String(item.subtotal ?? 0)), 0)
        const totalTax = refundLineItems.reduce((sum, item) =>
          sum + parseFloat(String(item.total_tax ?? 0)), 0)

        const shippingAdjustments = (r.order_adjustments as Record<string, unknown>[]) ?? []
        const shippingRefunded = shippingAdjustments
          .filter(a => a.kind === 'shipping_refund')
          .reduce((sum, a) => sum + parseFloat(String(a.amount ?? 0)), 0)

        // Map refund_line_items with sku
        const mappedLineItems = refundLineItems.map((item) => {
          const lineItem = item.line_item as Record<string, unknown> ?? {}
          return {
            ...item,
            sku: lineItem.sku ?? null,
            qty: item.quantity ?? 0,
          }
        })

        return {
          shopify_refund_id: String(r.id),
          shopify_order_id: String(order.id),
          created_at_shopify: r.created_at ?? null,
          note: r.note ?? null,
          refund_line_items: mappedLineItems,
          total_refunded: totalRefunded,
          subtotal: subtotal,
          total_tax: totalTax,
          shipping_refunded: shippingRefunded,
          created_at: new Date().toISOString(),
        }
      })

      // Upsert in batches of 250
      for (let i = 0; i < rows.length; i += 250) {
        const batch = rows.slice(i, i + 250)
        const { error } = await supabase
          .from('refunds')
          .upsert(batch as never, { onConflict: 'shopify_refund_id' })
        if (error) console.error('Refunds upsert error:', error.message)
      }

      totalImported += rows.length
    }

    ordersUrl = parseNextPageUrl(ordersRes.headers.get('link'))
  }

  return totalImported
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] Starting refunds sync...`)
    const count = await syncRefunds()
    console.log(`[${timestamp}] Synced ${count} refunds`)
    return NextResponse.json({ ok: true, synced: count, timestamp })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Refunds sync failed:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  return GET(request)
}
