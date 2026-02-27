'use server';

type ShopifyResponse<T> = {
  data: T;
  extensions: any;
};

// Using a factory function instead of a class to avoid build issues.
function createShopifyFetchError(message: string, status: number, errors?: any): Error {
    const error = new Error(message);
    error.name = 'ShopifyFetchError';
    (error as any).status = status;
    (error as any).errors = errors;
    return error;
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
        throw createShopifyFetchError(
            `Shopify API request failed with status ${response.status}`,
            response.status,
            errorBody,
        );
    }
    
    const json = await response.json();

    if (json.errors) {
      console.error('Shopify GraphQL Errors:', json.errors);
      throw createShopifyFetchError('Shopify GraphQL query returned errors.', response.status, json.errors);
    }

    return json.data;
  } catch (error) {
    console.error('Failed to fetch from Shopify:', error);
    // Re-throw the error to be handled by the caller
    throw error;
  }
}

