'use client';

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal } from "lucide-react";

type ShopifyApiErrorProps = {
    details?: string;
}

export default function ShopifyApiError({ details }: ShopifyApiErrorProps) {
    return (
        <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Connection to Shopify Failed</AlertTitle>
            <AlertDescription>
                <div className="space-y-4">
                    <p>The application could not connect to the Shopify API for a specific request. This is often due to missing permissions (API scopes) for the query being made, or an incompatible API version.</p>
                    {details && (
                        <div className="space-y-2">
                            <p className="font-semibold">Shopify API Error Details:</p>
                            <pre className="mt-2 w-full rounded-md bg-destructive-foreground/10 p-4 text-xs overflow-auto">
                                <code>{details}</code>
                            </pre>
                        </div>
                    )}
                    <p className="font-semibold">Please review the error details above and check the following:</p>
                    <ol className="list-decimal list-inside space-y-2 text-sm">
                        <li>
                            <strong>Check API Scopes:</strong> In your Shopify Admin, go to <strong>Apps and sales channels &gt; Develop apps</strong>. Open your app and check the <strong>Configuration</strong> tab. Ensure your app has all necessary permissions, including <strong className="font-mono bg-destructive-foreground/20 px-1 py-0.5 rounded-sm">read_products</strong>, <strong className="font-mono bg-destructive-foreground/20 px-1 py-0.5 rounded-sm">read_inventory</strong>, and <strong className="font-mono bg-destructive-foreground/20 px-1 py-0.5 rounded-sm">read_orders</strong> (order-based net sales) and <strong className="font-mono bg-destructive-foreground/20 px-1 py-0.5 rounded-sm">read_customers</strong> (Customers page).
                        </li>
                        <li>
                            <strong>Verify API Version:</strong> In your `.env` file, ensure the `SHOPIFY_API_VERSION` is a valid, released version (e.g., `2024-07`). Using an incorrect or non-existent version can cause certain API calls to fail.
                        </li>
                         <li>
                            <strong>Verify Access Token:</strong> Ensure you are using the correct <span className="font-mono bg-destructive-foreground/20 px-1 py-0.5 rounded-sm">Admin API access token</span>. If you recently changed scopes, you must reinstall the app to get a new token.
                        </li>
                    </ol>
                    <p>After verifying these settings and updating your `.env` file if needed, the page should load correctly.</p>
                </div>
            </AlertDescription>
        </Alert>
    )
}
