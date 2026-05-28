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

async function syncProducts(): Promise<number> {
  const shopifyUrl = process.env.SHOPIFY_STORE_URL!
  const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  let url: string | null =
    `${shopifyUrl}/admin/api/2024-01/products.json?limit=250`
  let totalProducts = 0
  let totalVariants = 0

  while (url) {
    const res = await fetchShopifyPage(url, accessToken)
    const data = await res.json() as { products?: Record<string, unknown>[] }
    const products = data.products ?? []
    if (products.length === 0) break

    // Map products rows
    const productRows = products.map((p) => ({
      shopify_product_id: String(p.id),
      title: p.title ?? null,
      product_type: p.product_type ?? null,
      vendor: p.vendor ?? null,
      status: p.status ?? null,
      tags: p.tags ?? null,
      created_at_shopify: p.created_at ?? null,
      published_at: p.published_at ?? null,
      image_url: (p.image as Record<string, unknown>)?.src ?? null,
      options: p.options ?? null,
      last_synced_at: new Date().toISOString(),
    }))

    // Map product_variants rows
    const variantRows: Record<string, unknown>[] = []
    for (const p of products) {
      const variants = (p.variants as Record<string, unknown>[]) ?? []
      const images = (p.images as Record<string, unknown>[]) ?? []
      
      for (const v of variants) {
        // Find variant image
        const imageId = v.image_id
        const variantImage = images.find(
          (img) => img.id === imageId
        )
        const imageUrl = variantImage 
          ? (variantImage.src as string) 
          : ((p.image as Record<string, unknown>)?.src as string) ?? null

        // Extract color and size from options
        const option1 = v.option1 as string ?? null
        const option2 = v.option2 as string ?? null
        const option3 = v.option3 as string ?? null

        variantRows.push({
          shopify_variant_id: String(v.id),
          shopify_product_id: String(p.id),
          title: v.title ?? null,
          sku: v.sku ?? null,
          color: option1 ?? null,
          size: option2 ?? option1 ?? null,
          price: parseFloat(String(v.price ?? 0)),
          compare_at_price: v.compare_at_price 
            ? parseFloat(String(v.compare_at_price)) 
            : null,
          inventory_quantity: v.inventory_quantity ?? 0,
          barcode: v.barcode ?? null,
          weight: v.weight ?? null,
          weight_unit: v.weight_unit ?? null,
          option1: option1,
          option2: option2,
          option3: option3,
          image_url: imageUrl,
          last_synced_at: new Date().toISOString(),
        })
      }
    }

    // Upsert products in batches of 250
    for (let i = 0; i < productRows.length; i += 250) {
      const batch = productRows.slice(i, i + 250)
      const { error } = await supabase
        .from('products')
        .upsert(batch as never, { onConflict: 'shopify_product_id' })
      if (error) console.error('Products upsert error:', error.message)
    }

    // Upsert variants in batches of 250
    for (let i = 0; i < variantRows.length; i += 250) {
      const batch = variantRows.slice(i, i + 250)
      const { error } = await supabase
        .from('product_variants')
        .upsert(batch as never, { onConflict: 'shopify_variant_id' })
      if (error) console.error('Variants upsert error:', error.message)
    }

    totalProducts += products.length
    totalVariants += variantRows.length
    url = parseNextPageUrl(res.headers.get('link'))
  }

  console.log(`Synced ${totalProducts} products and ${totalVariants} variants`)
  return totalProducts
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] Starting products sync...`)
    const count = await syncProducts()
    console.log(`[${timestamp}] Synced ${count} products`)
    return NextResponse.json({ ok: true, synced: count, timestamp })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Products sync failed:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  return GET(request)
}
