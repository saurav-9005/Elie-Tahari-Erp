import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal } from "lucide-react"

export function ShopifyAuthError() {
  return (
    <div className="container mx-auto py-10">
       <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Shopify API Authentication Error (401)</AlertTitle>
            <AlertDescription>
                <div className="space-y-4">
                    <p>The request to the Shopify Admin API was unauthorized. This almost always means there is an issue with your Admin API access token or its permissions.</p>
                    <p>Please take the following steps:</p>
                    <ul className="list-decimal list-inside space-y-2 pl-4">
                        <li>
                            <strong>Check your .env file:</strong> Ensure the `SHOPIFY_ADMIN_ACCESS_TOKEN`, `SHOPIFY_STORE_URL`, and `SHOPIFY_API_VERSION` variables are correct. The token should start with `shpat_`.
                        </li>
                        <li>
                            <strong>Verify API Scopes:</strong> In your Shopify Admin, go to <strong>Apps and sales channels &gt; Develop apps &gt; [Your App Name] &gt; Configuration</strong>. Under "Admin API integration", ensure you have granted the <strong>`read_products`</strong> scope.
                        </li>
                    </ul>
                    <p>After you have verified your credentials and permissions, please ask me to "reload the app" to apply the changes.</p>
                </div>
            </AlertDescription>
        </Alert>
    </div>
  )
}
