'use server';
/**
 * @fileOverview A Genkit flow for the Smart Merchandising Assistant.
 *
 * - smartMerchandisingSuggestion - A function that provides optimal product groupings,
 *   collection ideas, and enhanced marketing descriptions for luxury clothing items.
 * - SmartMerchandisingSuggestionInput - The input type for the smartMerchandisingSuggestion function.
 * - SmartMerchandisingSuggestionOutput - The return type for the smartMerchandisingSuggestion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input Schema
const SmartMerchandisingSuggestionInputSchema = z.object({
  currentInventorySummary: z
    .string()
    .describe(
      'A summary of current inventory, including available products, quantities, and categories. Example: "Available: A-line silk dress (XS, S, M, L), Floral print maxi skirt (S, M), Cashmere cardigan (one size). Low stock: Leather clutch, high stock: wool coats."
    ),
  salesTrendsSummary: z
    .string()
    .describe(
      'A summary of recent sales trends, best-selling items, slow-moving items, and popular categories. Example: "Best sellers: A-line silk dress, High demand for natural fabrics. Slow movers: Winter coats. Upcoming trend: Pastel colors, minimalist styles."
    ),
  brandGuidelines: z
    .string()
    .describe(
      "Detailed luxury brand guidelines, aesthetic, target audience, and tone of voice. Example: 'CoutureFlow is a luxury women's clothing brand. Our aesthetic is minimalist, elegant, timeless, and sophisticated. We use high-quality natural fabrics. Our target audience is professional women aged 30-50 who appreciate understated luxury. Tone: aspirational, confident, exclusive.'"
    ),
  targetProductName: z
    .string()
    .optional()
    .describe(
      'Optional: The name of a specific product for which an enhanced marketing description is desired.'
    ),
});
export type SmartMerchandisingSuggestionInput = z.infer<
  typeof SmartMerchandisingSuggestionInputSchema
>;

// Output Schema
const ProductGroupingSchema = z.object({
  name: z.string().describe('The name of the suggested product grouping.'),
  productNames: z
    .array(z.string())
    .describe('A list of product names included in this grouping.'),
  rationale: z
    .string()
    .describe('The reasoning behind this product grouping, based on trends and guidelines.'),
});

const CollectionIdeaSchema = z.object({
  name: z.string().describe('The name of the suggested collection.'),
  themeDescription: z
    .string()
    .describe('A brief description of the collection theme and aesthetic.'),
  suggestedProductNames: z
    .array(z.string())
    .describe('A list of product names that would fit well into this collection.'),
});

const MarketingDescriptionSchema = z.object({
  target: z
    .string()
    .describe('The name of the product or collection this description is for.'),
  type: z
    .enum(['product', 'collection'])
    .describe('Indicates whether the description is for a product or a collection.'),
  description: z
    .string()
    .describe('The enhanced marketing description, adhering to brand guidelines.'),
});

const SmartMerchandisingSuggestionOutputSchema = z.object({
  productGroupings: z
    .array(ProductGroupingSchema)
    .describe('Suggested groupings of products based on sales trends and inventory.'),
  collectionIdeas: z
    .array(CollectionIdeaSchema)
    .describe('Creative collection ideas with themes and suggested products.'),
  marketingDescriptions: z
    .array(MarketingDescriptionSchema)
    .describe(
      'Enhanced marketing descriptions for specific products or suggested collections, adhering to brand guidelines.'
    ),
});
export type SmartMerchandisingSuggestionOutput = z.infer<
  typeof SmartMerchandisingSuggestionOutputSchema
>;

// Wrapper function
export async function smartMerchandisingSuggestion(
  input: SmartMerchandisingSuggestionInput
): Promise<SmartMerchandisingSuggestionOutput> {
  return smartMerchandisingSuggestionFlow(input);
}

// Prompt definition
const smartMerchandisingPrompt = ai.definePrompt({
  name: 'smartMerchandisingPrompt',
  input: {schema: SmartMerchandisingSuggestionInputSchema},
  output: {schema: SmartMerchandisingSuggestionOutputSchema},
  prompt: `You are an expert luxury fashion merchandiser and marketing specialist for CoutureFlow ERP.\nYour task is to generate intelligent merchandising suggestions based on provided data.\n\nUse the following information to generate your suggestions:\n\nCurrent Inventory Summary:\n{{{currentInventorySummary}}}\n\nSales Trends Summary:\n{{{salesTrendsSummary}}}\n\nLuxury Brand Guidelines:\n{{{brandGuidelines}}}\n\n{{#if targetProductName}}\nFocus primarily on providing an enhanced marketing description for the product named "{{{targetProductName}}}", in addition to other suggestions.\n{{/if}}\n\nBased on the above, provide:\n1.  **Optimal product groupings**: Combine existing products into logical, appealing groups. Provide a name for each group, a list of product names, and a clear rationale based on trends, inventory, and brand guidelines. Aim for 2-3 groupings.\n2.  **Creative collection ideas**: Suggest 1-2 new collection themes. For each, provide a compelling name, a theme description that aligns with the brand, and a list of existing product names that would fit well.\n3.  **Enhanced marketing descriptions**: Create engaging and brand-aligned marketing descriptions. If a 'targetProductName' is provided, ensure one description is specifically for that product. Otherwise, suggest descriptions for one of the new collection ideas or a top-selling product. Ensure descriptions reflect the luxury tone and highlight key features.\n\nFormat your response as a JSON object strictly following this schema:\n\n```json\n{{{_outputSchema}}}\n```\n`,
});

// Flow definition
const smartMerchandisingSuggestionFlow = ai.defineFlow(
  {
    name: 'smartMerchandisingSuggestionFlow',
    inputSchema: SmartMerchandisingSuggestionInputSchema,
    outputSchema: SmartMerchandisingSuggestionOutputSchema,
  },
  async (input) => {
    const {output} = await smartMerchandisingPrompt(input);
    return output!;
  }
);
