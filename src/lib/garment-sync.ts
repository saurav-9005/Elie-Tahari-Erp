import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const SPREADSHEET_ID = '1xW0xwnFX93Rc0O7O4gjxKdId0WcJZSA0ISRasJkjm34';
const BATCH_SIZE = 500;
const TARGET_YEAR = 2026;

type ParsedRow = {
  tab_name: string;
  delivery_group: string | null;
  estimate_x_garment_delivery: string | null;
  estimate_x_garment_delivery_date: string | null;
  factory: string | null;
  style_number: string | null;
  body: string | null;
  description: string | null;
  fabric_contents: string | null;
  hts_codes: string | null;
  goh_flat_pack: string | null;
  country_of_origin: string | null;
  projected_units: number | null;
  actual_shipped_units: string | null;
  air_boat: string | null;
  etd_date: string | null;
  eta_date: string | null;
  in_nj_whse_date: string | null;
  comments: string | null;
};

const REQUIRED_ENV_VARS = [
  'GOOGLE_SERVICE_ACCOUNT_EMAIL',
  'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

const COLUMN_HEADERS = [
  'ESTIMATE X GARMENT DELIVERY',
  'FACTORY',
  'STYLE NUMBER',
  'BODY',
  'DESCRIPTION',
  'FABRIC CONTENTS',
  'HTS CODES',
  'GOH/FLAT PACK',
  'COUNTRY OF ORIGIN',
  'PROJECTED UNITS',
  'ACTUAL SHIPPED UNITS',
  'AIR/ BOAT',
  'ETD DATE',
  'ETA DATE',
  'IN NJ WHSE DATE',
  'COMMENTS',
] as const;

function clean(value: string | null | undefined): string | null {
  if (value == null) return null;
  const v = value.trim();
  return v.length > 0 ? v : null;
}

function normalizeHeader(value: string | null | undefined): string {
  return (value ?? '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function parseInteger(value: string | null): number | null {
  if (!value) return null;
  const n = parseInt(value.replace(/[^0-9-]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

function parseMonthDay2026(value: string | null): string | null {
  if (!value) return null;
  const firstPart = value.split(/\s\/\s/)[0] ?? '';
  const base = firstPart.replace(/X$/i, '').trim();
  if (!base || /^TBA$/i.test(base)) return null;
  const match = base.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!match) return null;

  const month = Number(match[1]);
  const day = Number(match[2]);
  if (!Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(Date.UTC(TARGET_YEAR, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

function getCell(
  row: string[],
  indexMap: Map<string, number>,
  header: (typeof COLUMN_HEADERS)[number]
): string | null {
  const idx = indexMap.get(header);
  if (idx == null) return null;
  return clean(row[idx]);
}

function extractGroupName(row: string[]): string | null {
  for (const raw of row) {
    const cell = clean(raw);
    if (!cell) continue;
    if (!/GROUP/i.test(cell)) continue;
    const match = cell.match(/([A-Z]+\s+GROUP)/i);
    return match ? match[1].toUpperCase() : cell.toUpperCase();
  }
  return null;
}

function isRowEmpty(row: string[]): boolean {
  return row.every((cell) => clean(cell) == null);
}

function hasTotalUnits(row: string[]): boolean {
  return row.some((cell) => /TOTAL UNITS/i.test(cell ?? ''));
}

function parseTabRows(tabName: string, rows: string[][]): ParsedRow[] {
  const output: ParsedRow[] = [];
  let currentGroup: string | null = null;
  let headerMap: Map<string, number> | null = null;
  let lastFactory: string | null = null;

  for (const row of rows) {
    const maybeGroup = extractGroupName(row);
    if (maybeGroup) currentGroup = maybeGroup;

    const normalized = row.map((cell) => normalizeHeader(cell));
    const hasHeader = normalized.some((cell) => cell === 'ESTIMATE X GARMENT DELIVERY');
    if (hasHeader) {
      headerMap = new Map<string, number>();
      normalized.forEach((cell, idx) => {
        if (COLUMN_HEADERS.includes(cell as (typeof COLUMN_HEADERS)[number])) {
          headerMap?.set(cell as (typeof COLUMN_HEADERS)[number], idx);
        }
      });
      lastFactory = null;
      continue;
    }

    if (!headerMap) continue;

    if (isRowEmpty(row) || hasTotalUnits(row)) {
      headerMap = null;
      lastFactory = null;
      continue;
    }

    const styleNumber = getCell(row, headerMap, 'STYLE NUMBER');
    if (!styleNumber) continue;

    const factoryRaw = getCell(row, headerMap, 'FACTORY');
    const factory: string = factoryRaw ?? lastFactory ?? '';
    if (factory) lastFactory = factory;

    const estimateRaw = getCell(row, headerMap, 'ESTIMATE X GARMENT DELIVERY');

    output.push({
      tab_name: tabName,
      delivery_group: currentGroup,
      estimate_x_garment_delivery: estimateRaw,
      estimate_x_garment_delivery_date: parseMonthDay2026(estimateRaw),
      factory: factory || null,
      style_number: styleNumber,
      body: getCell(row, headerMap, 'BODY'),
      description: getCell(row, headerMap, 'DESCRIPTION'),
      fabric_contents: getCell(row, headerMap, 'FABRIC CONTENTS'),
      hts_codes: getCell(row, headerMap, 'HTS CODES'),
      goh_flat_pack: getCell(row, headerMap, 'GOH/FLAT PACK'),
      country_of_origin: getCell(row, headerMap, 'COUNTRY OF ORIGIN'),
      projected_units: parseInteger(getCell(row, headerMap, 'PROJECTED UNITS')),
      actual_shipped_units: getCell(row, headerMap, 'ACTUAL SHIPPED UNITS'),
      air_boat: getCell(row, headerMap, 'AIR/ BOAT'),
      etd_date: parseMonthDay2026(getCell(row, headerMap, 'ETD DATE')),
      eta_date: parseMonthDay2026(getCell(row, headerMap, 'ETA DATE')),
      in_nj_whse_date: parseMonthDay2026(getCell(row, headerMap, 'IN NJ WHSE DATE')),
      comments: getCell(row, headerMap, 'COMMENTS'),
    });
  }

  return output;
}

function escapeSheetRangeTitle(tabName: string): string {
  return `'${tabName.replace(/'/g, "''")}'`;
}

export async function syncGarmentDelivery(): Promise<number> {
  const missing = REQUIRED_ENV_VARS.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing env vars: ${missing.join(', ')}`);
  }

  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL as string;
  const serviceAccountPrivateKey = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY as string).replace(
    /\\n/g,
    '\n'
  );
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

  const auth = new google.auth.JWT({
    email: serviceAccountEmail,
    key: serviceAccountPrivateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  try {
    await auth.authorize();
  } catch (error) {
    throw new Error(`Google auth failure: ${error instanceof Error ? error.message : String(error)}`);
  }

  const sheets = google.sheets({ version: 'v4', auth });

  let tabNames: string[] = [];
  try {
    const meta = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
      fields: 'sheets.properties.title',
    });
    tabNames = (meta.data.sheets ?? [])
      .map((sheet) => sheet.properties?.title ?? undefined)
      .filter((name): name is string => typeof name === 'string' && name.length > 0);
  } catch (error) {
    throw new Error(`Failed to list sheet tabs: ${error instanceof Error ? error.message : String(error)}`);
  }

  const parsedRows: ParsedRow[] = [];

  for (const tabName of tabNames) {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: escapeSheetRangeTitle(tabName),
      });
      const rows = (response.data.values ?? []) as string[][];
      parsedRows.push(...parseTabRows(tabName, rows));
    } catch (error) {
      console.error(`Sheet read failure for tab "${tabName}":`, error);
    }
  }

  if (parsedRows.length === 0) {
    throw new Error('Parsed 0 rows. Exiting without touching database.');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: clearError } = await supabase
    .from('garment_delivery')
    .delete()
    .or('style_number.is.null,style_number.not.is.null');

  if (clearError) {
    throw new Error(`Failed to clear garment_delivery: ${clearError.message}`);
  }

  for (let i = 0; i < parsedRows.length; i += BATCH_SIZE) {
    const batch = parsedRows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('garment_delivery').insert(batch as never);
    if (error) {
      console.error(`Insert error for batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
    }
  }

  return parsedRows.length;
}
