export default function ErpAdesiemDxPage() {
  return (
    <div className="flex h-[calc(100vh-theme(spacing.24))] flex-col gap-4">
      <h1 className="font-headline text-3xl font-semibold tracking-tight">Adesiem DX</h1>
      <p className="text-muted-foreground">Displaying content from an external site.</p>
      <div className="flex-1 rounded-lg border">
        <iframe
          src="https://data.adesiem.com/datawall/ab2c22b24e00d5d635d10f261dab9932144a3d068a7f5d9?itemId=1966395"
          className="h-full w-full rounded-lg"
          title="Adesiem DX"
        />
      </div>
    </div>
  );
}
