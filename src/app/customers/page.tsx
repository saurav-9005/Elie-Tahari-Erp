import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CustomersPage() {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-headline text-3xl font-semibold tracking-tight">
        Customers
      </h1>
      <Card className="flex flex-1 items-center justify-center">
        <CardContent className="p-10 text-center">
          <p className="text-muted-foreground">
            Customer management interface will be available here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
