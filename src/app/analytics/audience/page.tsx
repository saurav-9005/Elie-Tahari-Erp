
export default function AudiencePage() {
  return (
    <div className="flex h-[calc(100vh-theme(spacing.24))] flex-col gap-4">
      <h1 className="font-headline text-3xl font-semibold tracking-tight">
        Audience Analytics
      </h1>
      <p className="text-muted-foreground">
        Displaying customer audience data from Looker Studio.
      </p>
      <div className="flex-1 rounded-lg border">
        <iframe
          src="https://lookerstudio.google.com/embed/s/rBUDdD0wnwY"
          className="h-full w-full rounded-lg"
          title="Audience Analytics"
        />
      </div>
    </div>
  );
}
