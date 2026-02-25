'use server';

import { google } from 'googleapis';
import { unstable_cache as cache } from 'next/cache';

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

// This is a more robust check to ensure all required variables are present.
const areCredsAvailable = 
    !!process.env.GOOGLE_SHEET_ID &&
    !!process.env.GOOGLE_SHEETS_CLIENT_EMAIL &&
    !!process.env.GOOGLE_SHEETS_PRIVATE_KEY;

const auth = areCredsAvailable ? new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
}) : null;

const sheets = auth ? google.sheets({ version: 'v4', auth }) : null;

const MONTHS = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
];

type SheetTab = {
  label: string;
  key: string;
  month: number;
};

export const getSheetTabs = cache(
  async (): Promise<SheetTab[]> => {
    if (!areCredsAvailable || !sheets) {
      console.warn('Google Sheets API credentials not fully configured. One or more environment variables are missing (GOOGLE_SHEET_ID, GOOGLE_SHEETS_CLIENT_EMAIL, GOOGLE_SHEETS_PRIVATE_KEY). Skipping fetch.');
      return [];
    }

    try {
      const response = await sheets.spreadsheets.get({
        spreadsheetId: SHEET_ID,
      });

      const tabs = response.data.sheets
        ?.map(sheet => {
          const title = sheet.properties?.title?.toUpperCase() || '';
          const monthIndex = MONTHS.findIndex(month => title.includes(month));
          if (monthIndex !== -1) {
            return {
              label: MONTHS[monthIndex].charAt(0) + MONTHS[monthIndex].slice(1).toLowerCase(),
              key: sheet.properties?.title || '',
              month: monthIndex + 1,
            };
          }
          return null;
        })
        .filter((tab): tab is SheetTab => tab !== null)
        .sort((a, b) => a.month - b.month);

      return tabs || [];
    } catch (error) {
      console.error('Error fetching Google Sheet tabs:', error);
      // It's better to return empty and show a message in the UI
      return [];
    }
  },
  ['google-sheet-tabs'],
  { revalidate: 3600 } // Cache for 1 hour
);

export type DeliveryRow = {
  styleNumber: string;
  projectedUnits: number;
  actualShippedUnits: number;
  etaDate: string;
  status: 'Received' | 'In Transit' | 'Missing';
  // ... add other fields as needed
  [key: string]: any;
};

function toCamelCase(str: string): string {
    return str.replace(/\s(.)/g, function($1) { return $1.toUpperCase(); })
              .replace(/\s/g, '')
              .replace(/^(.)/, function($1) { return $1.toLowerCase(); });
}

export const getSheetData = cache(
  async (sheetName: string): Promise<DeliveryRow[]> => {
    if (!areCredsAvailable || !sheets) {
        console.warn('Google Sheets API credentials not fully configured. Skipping fetch.');
        return [];
    }
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${sheetName}!A:Z`,
      });

      const rows = response.data.values;
      if (!rows || rows.length < 2) {
        return [];
      }

      const headers = rows[0].map(h => toCamelCase(h));
      const dataRows = rows.slice(1);

      return dataRows.map(row => {
        const rowData: { [key: string]: any } = {};
        headers.forEach((header, index) => {
          rowData[header] = row[index] || null;
        });
        
        // Simple status logic for now
        const shipped = parseInt(rowData.actualShippedUnits, 10) || 0;
        const projected = parseInt(rowData.projectedUnits, 10) || 0;
        if (shipped > 0 && shipped >= projected) {
            rowData.status = 'Received';
        } else if (shipped > 0) {
            rowData.status = 'In Transit';
        } else {
            rowData.status = 'Missing';
        }

        return rowData as DeliveryRow;
      });
    } catch (error) {
      console.error(`Error fetching data for sheet "${sheetName}":`, error);
      return [];
    }
  },
  ['google-sheet-data'],
  { revalidate: 600 } // Cache for 10 minutes
);
