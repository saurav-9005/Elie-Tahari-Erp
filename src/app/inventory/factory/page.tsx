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
          src="https://docs.google.com/spreadsheets/d/18y3-4sJHM8V08U67LD0Ryg-zrDVTa4Q3/pubhtml?gid=942315704&amp;single=true&amp;widget=true&amp;headers=false"
          className="h-full w-full rounded-lg"
          title="Factory POs"
        />
      </div>
    </div>
  );
}
