
export default function UpcCodePage() {
  return (
    <div className="flex h-[calc(100vh-theme(spacing.24))] flex-col gap-4">
      <h1 className="font-headline text-3xl font-semibold tracking-tight">
        UPC Code Generator
      </h1>
      <p className="text-muted-foreground">
        Displaying content from an external site.
      </p>
      <div className="flex-1 rounded-lg border">
        <iframe
          src="https://elietahari-product-onboard.vercel.app/"
          className="h-full w-full rounded-lg"
          title="UPC Code Generator"
        />
      </div>
    </div>
  );
}
