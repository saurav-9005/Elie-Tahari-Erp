import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 60

async function fetchShopify(url: string, accessToken: string) {
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

async function syncInventoryLevels(): Promise<number> {
  const shopifyUrl = process.env.SHOPIFY_STORE_URL!
  const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  // Step 1: Get all locations
  const locRes = await fetchShopify(
    `${shopifyUrl}/admin/api/2024-01/locations.json`,
    accessToken
  )
  const locData = await locRes.json() as { locations?: Record<string, unknown>[] }
  const locations = locData.locations ?? []
  console.log(`Found ${locations.length} locations`)

  // Step 2: Get all products with variants to build inventory_item_id map
  const variantMap = new Map<string, { shopify_variant_id: string; sku: string }>()
  let productsUrl: string | null =
    `${shopifyUrl}/admin/api/2024-01/products.json?limit=250&fields=id,variants`

  while (productsUrl) {
    const res = await fetchShopify(productsUrl, accessToken)
    const data = await res.json() as { products?: Record<string, unknown>[] }
    const products = data.products ?? []
    if (products.length === 0) break

    for (const product of products) {
      const variants = (product.variants as Record<string, unknown>[]) ?? []
      for (const variant of variants) {
        if (variant.inventory_item_id && variant.sku) {
          variantMap.set(String(variant.inventory_item_id), {
            shopify_variant_id: String(variant.id),
            sku: String(variant.sku),
          })
        }
      }
    }
    productsUrl = parseNextPageUrl(res.headers.get('link'))
  }

  // Step 3: Get inventory levels per location
  const allRows: Record<string, unknown>[] = []

  for (const location of locations) {
    let levelsUrl: string | null =
      `${shopifyUrl}/admin/api/2024-01/inventory_levels.json?location_ids=${location.id}&limit=250`

    while (levelsUrl) {
      const res = await fetchShopify(levelsUrl, accessToken)
      const data = await res.json() as { inventory_levels?: Record<string, unknown>[] }
      const levels = data.inventory_levels ?? []
      if (levels.length === 0) break

      for (const level of levels) {
        const inventoryItemId = String(level.inventory_item_id)
        const variant = variantMap.get(inventoryItemId)
        if (!variant?.sku) continue

        allRows.push({
          shopify_variant_id: variant.shopify_variant_id,
          shopify_inventory_item_id: inventoryItemId,
          sku: variant.sku,
          location_id: String(location.id),
          location_name: location.name ?? null,
          quantity: level.available ?? 0,
          last_synced_at: new Date().toISOString(),
        })
      }

      levelsUrl = parseNextPageUrl(res.headers.get('link'))
    }

    // Rate limit delay between locations
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  if (allRows.length === 0) {
    throw new Error('No inventory level rows parsed')
  }

  // Step 4: Truncate and re-insert
  await supabase.from('inventory_levels').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  for (let i = 0; i < allRows.length; i += 500) {
    const batch = allRows.slice(i, i + 500)
    const { error } = await supabase
      .from('inventory_levels')
      .insert(batch as never)
    if (error) console.error('Inventory levels insert error:', error.message)
  }

  return allRows.length
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] Starting inventory levels sync...`)
    const count = await syncInventoryLevels()
    console.log(`[${timestamp}] Synced ${count} inventory level rows`)
    return NextResponse.json({ ok: true, synced: count, timestamp })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Inventory levels sync failed:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  return GET(request)
}
