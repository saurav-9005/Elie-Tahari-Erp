export default function FactoryInventoryPage() {
  return (
    <div className="flex h-[calc(100vh-theme(spacing.24))] flex-col gap-4">
      <h1 className="font-headline text-3xl font-semibold tracking-tight">
        Factory POs
      </h1>
      <p className="text-muted-foreground">
        Displaying content from Google Sheets.
      </p>
      <div className="flex-1 rounded-lg border">
        <iframe
          src="https://docs.google.com/spreadsheets/d/e/2PACX-1vRt8pFiwXal1MpXxq4RlaKmJcXoJs-t641S8s-GmVg1Dnya7t0tKw9SZ4zWAoPbOw/pubhtml"
          className="h-full w-full rounded-lg"
          title="Factory POs"
        />
      </div>
    </div>
  );
}
