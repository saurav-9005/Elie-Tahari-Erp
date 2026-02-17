'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getMerchandisingSuggestion } from './actions';
import type { SmartMerchandisingSuggestionOutput } from '@/ai/flows/smart-merchandising-suggestion';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, Wand2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const formSchema = z.object({
  currentInventorySummary: z
    .string()
    .min(1, 'Inventory summary is required.'),
  salesTrendsSummary: z.string().min(1, 'Sales trends summary is required.'),
  brandGuidelines: z.string().min(1, 'Brand guidelines are required.'),
  targetProductName: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const defaultValues: Partial<FormData> = {
  currentInventorySummary: 'Available: A-line silk dress (XS, S, M, L), Floral print maxi skirt (S, M), Cashmere cardigan (one size). Low stock: Leather clutch. High stock: wool coats.',
  salesTrendsSummary: 'Best sellers: A-line silk dress. High demand for natural fabrics. Slow movers: Winter coats. Upcoming trend: Pastel colors, minimalist styles.',
  brandGuidelines: "CoutureFlow is a luxury women's clothing brand. Our aesthetic is minimalist, elegant, timeless, and sophisticated. We use high-quality natural fabrics. Our target audience is professional women aged 30-50 who appreciate understated luxury. Tone: aspirational, confident, exclusive.",
  targetProductName: '',
};

export default function MerchandisingPage() {
  const { toast } = useToast();
  const [result, setResult] =
    useState<SmartMerchandisingSuggestionOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  async function onSubmit(data: FormData) {
    setIsLoading(true);
    setResult(null);
    const response = await getMerchandisingSuggestion(data);
    if (response.success && response.data) {
      setResult(response.data);
    } else {
      toast({
        variant: 'destructive',
        title: 'Error Generating Suggestions',
        description: response.error || 'An unknown error occurred.',
      });
    }
    setIsLoading(false);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-1.5">
        <h1 className="font-headline flex items-center gap-2 text-3xl font-semibold tracking-tight">
          <Sparkles className="h-7 w-7 text-primary" />
          Smart Merchandising Assistant
        </h1>
        <p className="text-muted-foreground">
          Leverage AI to generate optimal product groupings, collection ideas, and marketing copy.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Provide Context</CardTitle>
            <CardDescription>
              Fill in the details below to generate suggestions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="currentInventorySummary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inventory Summary</FormLabel>
                      <FormControl>
                        <Textarea rows={5} placeholder="e.g., High stock of silk dresses..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="salesTrendsSummary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sales Trends</FormLabel>
                      <FormControl>
                        <Textarea rows={5} placeholder="e.g., Best sellers are..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="brandGuidelines"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand Guidelines</FormLabel>
                      <FormControl>
                        <Textarea rows={5} placeholder="e.g., Our brand is minimalist and elegant..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="targetProductName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Product (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., A-line Silk Dress" {...field} />
                      </FormControl>
                      <FormDescription>
                        For a specific marketing description.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Wand2 />
                  )}
                  Generate Suggestions
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Card className="min-h-full">
            <CardHeader>
              <CardTitle>AI-Generated Suggestions</CardTitle>
              <CardDescription>
                Results from the assistant will appear here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading && (
                <div className="flex flex-col items-center justify-center gap-4 p-16 text-center">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-muted-foreground">
                    Our AI merchandiser is thinking...
                  </p>
                </div>
              )}
              {result && !isLoading && (
                <div className="space-y-8">
                  <section>
                    <h3 className="text-lg font-semibold mb-4">Product Groupings</h3>
                    <div className="space-y-4">
                      {result.productGroupings.map((group, i) => (
                        <Card key={i}>
                          <CardHeader>
                            <CardTitle>{group.name}</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                {group.productNames.map((name, j) => <Badge key={j} variant="secondary">{name}</Badge>)}
                            </div>
                            <p className="text-sm text-muted-foreground">{group.rationale}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </section>
                  <Separator />
                  <section>
                    <h3 className="text-lg font-semibold mb-4">Collection Ideas</h3>
                     <div className="space-y-4">
                      {result.collectionIdeas.map((idea, i) => (
                        <Card key={i}>
                          <CardHeader>
                            <CardTitle>{idea.name}</CardTitle>
                            <CardDescription>{idea.themeDescription}</CardDescription>
                          </CardHeader>
                          <CardContent>
                             <div className="flex flex-wrap gap-2">
                                {idea.suggestedProductNames.map((name, j) => <Badge key={j} variant="secondary">{name}</Badge>)}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </section>
                  <Separator />
                   <section>
                    <h3 className="text-lg font-semibold mb-4">Marketing Descriptions</h3>
                     <div className="space-y-4">
                      {result.marketingDescriptions.map((desc, i) => (
                        <Card key={i}>
                          <CardHeader>
                            <CardTitle className="capitalize">{desc.type}: {desc.target}</CardTitle>
                          </CardHeader>
                          <CardContent>
                             <p className="text-sm text-foreground whitespace-pre-wrap">{desc.description}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </section>
                </div>
              )}
              {!result && !isLoading && (
                <div className="flex flex-col items-center justify-center gap-4 p-16 text-center">
                  <Wand2 className="h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Ready to create some magic? Fill out the form to get started.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
