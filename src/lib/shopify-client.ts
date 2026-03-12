// A simple fetch client for the Shopify Admin API.
// It's not a full-fledged client, but it's enough for our needs.

const { SHOPIFY_STORE_URL, SHOPIFY_ADMIN_ACCESS_TOKEN, SHOPIFY_API_VERSION } =
  process.env;

if (
  !SHOPIFY_STORE_URL ||
  !SHOPIFY_ADMIN_ACCESS_TOKEN ||
  !SHOPIFY_API_VERSION
) {
  if (process.env.NODE_ENV === 'production') {
    console.warn(
      'Shopify environment variables are not set. The app will not be able to connect to Shopify.'
    );
  }
}

type ShopifyFetchParams = {
  query: string;
  variables?: Record<string, unknown>;
};

type ShopifyFetchOptions = {
  cache?: RequestCache;
  tags?: string[];
}

// Using a factory function instead of a class to avoid build issues.
function createShopifyFetchError(message: string, status: number, errors?: any): Error {
    const error = new Error(message);
    error.name = 'ShopifyFetchError';
    (error as any).status = status;
    (error as any).errors = errors;
    return error;
}

export async function shopifyFetch<T>({
  query,
  variables,
}: ShopifyFetchParams, options: ShopifyFetchOptions = {}): Promise<T> {
  
  if (
    !SHOPIFY_STORE_URL ||
    !SHOPIFY_ADMIN_ACCESS_TOKEN ||
    !SHOPIFY_API_VERSION
  ) {
    throw createShopifyFetchError(
        'Shopify environment variables are not set. Please check your .env file.', 500
    );
  }
    
  const endpoint = `${SHOPIFY_STORE_URL}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;
  const { cache = 'force-cache', tags } = options;

  try {
    const result = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_ACCESS_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
      cache,
      ...(tags && { next: { tags } }),
    });

    const body = await result.json();

    if (body.errors) {
      throw createShopifyFetchError(
        'Shopify API request failed.',
        result.status,
        body.errors
      );
    }
    
    if (!result.ok) {
        throw createShopifyFetchError(
          result.statusText,
          result.status
        );
    }

    return body.data as T;
  } catch (e: any) {
    if (e.name === 'ShopifyFetchError') {
      throw e;
    }
    throw createShopifyFetchError(
      'There was an issue connecting to Shopify.',
      500,
      e.message
    );
  }
}

export const getProductsQuery = /* GraphQL */ `
  query getProducts($first: Int!, $query: String) {
    products(first: $first, query: $query) {
      edges {
        node {
          id
          handle
          title
          tags
          featuredImage {
            url
            altText
          }
          variants(first: 1) {
            edges {
              node {
                id
                sku
                price
              }
            }
          }
        }
      }
    }
  }
`;

export const getInventoryItemsQuery = /* GraphQL */ `
  query getInventoryItems($first: Int!) {
    inventoryItems(first: $first) {
      edges {
        node {
          sku
          variant {
            product {
              title
            }
          }
          inventoryLevels(first: 5) {
            edges {
              node {
                location {
                  name
                }
                quantities(names: ["available"]) {
                  name
                  quantity
                }
              }
            }
          }
        }
      }
    }
  }
`;
