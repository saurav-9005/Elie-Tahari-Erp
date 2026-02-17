'use server';

import {
  smartMerchandisingSuggestion,
  type SmartMerchandisingSuggestionInput,
  type SmartMerchandisingSuggestionOutput,
} from '@/ai/flows/smart-merchandising-suggestion';
import { z } from 'zod';

const SmartMerchandisingSuggestionInputSchema = z.object({
  currentInventorySummary: z.string().min(10, 'Please provide a more detailed inventory summary.'),
  salesTrendsSummary: z.string().min(10, 'Please provide a more detailed sales trends summary.'),
  brandGuidelines: z.string().min(10, 'Please provide more detailed brand guidelines.'),
  targetProductName: z.string().optional(),
});

export async function getMerchandisingSuggestion(
  input: SmartMerchandisingSuggestionInput
): Promise<{ success: boolean; data: SmartMerchandisingSuggestionOutput | null, error?: string }> {
    const validation = SmartMerchandisingSuggestionInputSchema.safeParse(input);

    if (!validation.success) {
        const errorMessages = validation.error.errors.map(e => e.message).join(' ');
        return { success: false, data: null, error: errorMessages };
    }
  
  try {
    const output = await smartMerchandisingSuggestion(validation.data);
    return { success: true, data: output };
  } catch (error) {
    console.error('Error getting merchandising suggestion:', error);
    return { success: false, data: null, error: 'Failed to get suggestions from the AI model. Please try again later.' };
  }
}
