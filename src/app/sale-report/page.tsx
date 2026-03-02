
export default function SaleReportPage() {
  return (
    <div className="flex h-[calc(100vh-theme(spacing.24))] flex-col gap-4">
      <h1 className="font-headline text-3xl font-semibold tracking-tight">
        Sale Report
      </h1>
      <p className="text-muted-foreground">
        Displaying content from an external site.
      </p>
      <div className="flex-1 rounded-lg border">
        <iframe
          src="https://et-metabase.clients-suntek.com/public/dashboard/d9d9209d-3744-49b9-b579-1ca70fad15e9?date_filter=past1weeks"
          className="h-full w-full rounded-lg"
          title="Sale Report"
        />
      </div>
    </div>
  );
}
