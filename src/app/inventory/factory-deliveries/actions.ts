'use server';

import { getSheetData, type DeliveryRow } from '@/lib/google-sheets';

export async function getSheetDataAction(sheetName: string): Promise<DeliveryRow[]> {
  return getSheetData(sheetName);
}
