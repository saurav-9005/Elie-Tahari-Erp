'use client';

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal } from "lucide-react";

export default function ShopifyApiError() {
    return (
        <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Connection to Shopify Failed</AlertTitle>
            <AlertDescription>
                <div className="space-y-4">
                    <p>The application could not connect to your Shopify store. This is almost always due to an incorrect or missing Admin API access token, or the token lacking the necessary permissions.</p>
                    <p className="font-semibold">Please follow these steps carefully:</p>
                    <ol className="list-decimal list-inside space-y-2 text-sm">
                        <li>
                            <strong>Check your .env file:</strong> Ensure the `SHOPIFY_ADMIN_ACCESS_TOKEN` and `SHOPIFY_STORE_URL` variables are correctly set. Your store URL should look like `https://your-store-name.myshopify.com`.
                        </li>
                        <li>
                            <strong>Verify Access Token:</strong> In your Shopify Admin, go to <strong>Apps and sales channels &gt; Develop apps</strong>. Open your app and check the <strong>API credentials</strong> tab. Ensure you are using the <span className="font-mono bg-destructive-foreground/20 px-1 py-0.5 rounded-sm">Admin API access token</span> (it starts with `shpat_`).
                        </li>
                        <li>
                            <strong>Check API Scopes:</strong> On the same credentials page, make sure your app has <strong className="font-mono bg-destructive-foreground/20 px-1 py-0.5 rounded-sm">read_products</strong> and <strong className="font-mono bg-destructive-foreground/20 px-1 py-0.5 rounded-sm">read_inventory</strong> permission scopes. If not, you must add them under the "Configuration" tab and reinstall the app to get a new token with the correct permissions.
                        </li>
                    </ol>
                    <p>After verifying these settings and updating your `.env` file, the page should load correctly. The server will automatically restart when you save the `.env` file.</p>
                </div>
            </AlertDescription>
        </Alert>
    )
}
