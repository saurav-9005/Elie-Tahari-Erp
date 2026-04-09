import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Props = {
  blocks: string[];
};

export function ErpComingSoonBlocks({ blocks }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {blocks.map((title) => (
        <Card key={title} className="border-dashed border-muted-foreground/30 bg-muted/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>Coming soon</CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
