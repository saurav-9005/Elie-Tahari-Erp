export default function UpcCodePage() {
  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h1 className="font-headline text-3xl font-semibold tracking-tight">
          UPC Code Generator
        </h1>
        <p className="text-muted-foreground">
          Generate and manage UPC codes for products.
        </p>
      </div>
      <div className="flex-1 rounded-lg border overflow-hidden">
        <iframe
          src="https://elie-tahari.vercel.app/"
          className="h-full w-full"
        />
      </div>
    </div>
  );
}
