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

async function syncCustomers(): Promise<number> {
  const shopifyUrl = process.env.SHOPIFY_STORE_URL!
  const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  let url: string | null =
    `${shopifyUrl}/admin/api/2024-01/customers.json?limit=250`
  let totalImported = 0

  while (url) {
    const res = await fetchShopifyPage(url, accessToken)
    const data = await res.json() as { customers?: Record<string, unknown>[] }
    const customers = data.customers ?? []
    if (customers.length === 0) break

    const rows = customers.map((c) => ({
      shopify_customer_id: String(c.id),
      email: c.email ?? null,
      full_name: `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || null,
      phone: c.phone ?? null,
      total_orders: c.orders_count ?? 0,
      total_spent: parseFloat(String(c.total_spent ?? 0)),
      created_at: c.created_at ?? null,
    }))

    for (let i = 0; i < rows.length; i += 250) {
      const batch = rows.slice(i, i + 250)
      const { error } = await supabase
        .from('customers')
        .upsert(batch as never, { onConflict: 'shopify_customer_id' })
      if (error) console.error('Customers upsert error:', error.message)
    }

    totalImported += customers.length
    url = parseNextPageUrl(res.headers.get('link'))
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
    console.log(`[${timestamp}] Starting customers sync...`)
    const count = await syncCustomers()
    console.log(`[${timestamp}] Synced ${count} customers`)
    return NextResponse.json({ ok: true, synced: count, timestamp })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Customers sync failed:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  return GET(request)
}
