import { Card, CardContent } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-headline text-3xl font-semibold tracking-tight">
        Settings
      </h1>
      <Card className="flex flex-1 items-center justify-center">
        <CardContent className="p-10 text-center">
          <p className="text-muted-foreground">
            Application and user settings will be configured here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
