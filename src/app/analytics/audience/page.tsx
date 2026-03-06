
export default function AudiencePage() {
  return (
    <div className="flex h-[calc(100vh-theme(spacing.24))] flex-col gap-4">
      <h1 className="font-headline text-3xl font-semibold tracking-tight">
        Audience Analytics
      </h1>
      <p className="text-muted-foreground">
        Displaying content from Looker Studio.
      </p>
      <div className="flex-1 rounded-lg border">
        <iframe
          src="https://lookerstudio.google.com/embed/reporting/ee14d7e1-2cc3-4093-89e6-1e593524848f"
          className="h-full w-full rounded-lg"
          title="Audience Analytics"
        />
      </div>
    </div>
  );
}
