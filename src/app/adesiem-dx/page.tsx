export default function AdesiemDxPage() {
  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h1 className="font-headline text-3xl font-semibold tracking-tight">
          Adesiem DX
        </h1>
        <p className="text-muted-foreground">
          Live data from Adesiem DX.
        </p>
      </div>
      <div className="flex-1 rounded-lg border overflow-hidden">
        <iframe
          src="https://data.adesiem.com/datawall/ab2c22b24e00d5d635d10f261dab9932144a3d068a7f5d9?itemId=1966395"
          className="h-full w-full"
        />
      </div>
    </div>
  );
}
