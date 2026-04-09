export default function ErpSaleReportPage() {
  return (
    <div className="flex h-[calc(100vh-theme(spacing.24))] flex-col gap-4">
      <h1 className="font-headline text-3xl font-semibold tracking-tight">Sale Report</h1>
      <p className="text-muted-foreground">Displaying content from an external site.</p>
      <div className="flex-1 rounded-lg border">
        <iframe
          src="http://analytics.elietahari.com:4000/public/dashboard/daa93a89-0976-475c-a07d-045c23a4a14a?date_filter=past1weeks"
          className="h-full w-full rounded-lg"
          title="Sale Report"
        />
      </div>
    </div>
  );
}
