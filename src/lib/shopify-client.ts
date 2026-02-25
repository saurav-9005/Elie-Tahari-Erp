'use server';

type ShopifyResponse<T> = {
  data: T;
  extensions: any;
};

class ShopifyFetchError extends Error {
    constructor(message: string, public status: number, public errors?: any) {
        super(message);
        this.name = 'ShopifyFetchError';
        // Manually set the prototype to fix issues with extending built-in classes like Error.
        Object.setPrototypeOf(this, ShopifyFetchError.prototype);
    }
}

export async function fetchShopifyGraphQL<T>(
  query: string,
  variables?: Record<string, any>
): Promise<T> {
  const storeUrl = process.env.SHOPIFY_STORE_URL;
  const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  const apiVersion = process.env.SHOPIFY_API_VERSION;

  if (!storeUrl || !accessToken || !apiVersion) {
    throw new Error('Shopify environment variables are not configured.');
  }

  const endpoint = `${storeUrl}/admin/api/${apiVersion}/graphql.json`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({ query, variables }),
      // Add cache revalidation to fetch fresh data periodically
      next: { revalidate: 60 } 
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new ShopifyFetchError(
            `Shopify API request failed with status ${response.status}`,
            response.status,
            errorBody,
        );
    }
    
    const json = await response.json();

    if (json.errors) {
      console.error('Shopify GraphQL Errors:', json.errors);
      throw new ShopifyFetchError('Shopify GraphQL query returned errors.', response.status, json.errors);
    }

    return json.data;
  } catch (error) {
    console.error('Failed to fetch from Shopify:', error);
    if (error instanceof ShopifyFetchError) {
        throw error;
    }
    throw new Error('An unexpected error occurred while fetching from Shopify.');
  }
}
