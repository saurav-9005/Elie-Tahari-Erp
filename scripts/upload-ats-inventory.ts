import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

type AtsInventoryRow = {
  sku: string;
  color: string | null;
  color_desc: string | null;
  size: string | null;
  ots_qoh: number | null;
};

const BATCH_SIZE = 500;

function parseFileArg(argv: string[]): string | null {
  const idx = argv.indexOf('--file');
  if (idx === -1) return null;
  const value = argv[idx + 1];
  if (!value || value.startsWith('--')) return null;
  return value;
}

function cleanString(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function parseIntOrNull(value: unknown): number | null {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;
  const n = parseInt(text.replace(/[^0-9-]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

async function main() {
  const fileArg = parseFileArg(process.argv);
  if (!fileArg) {
    console.error('Usage: --file <path>');
    process.exit(1);
  }

  const filePath = path.resolve(process.cwd(), fileArg);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  let parsedRows: AtsInventoryRow[] = [];
  try {
    const workbook = XLSX.readFile(filePath);
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) throw new Error('No sheets found in workbook');
    const sheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

    parsedRows = rawRows
      .map((row) => {
        const sku = cleanString(row['SKU']);
        if (!sku) return null;
        return {
          sku,
          color: cleanString(row['Color']),
          color_desc: cleanString(row['Color Desc']),
          size: cleanString(row['Size']),
          ots_qoh: parseIntOrNull(row['OTS QOH']),
        } satisfies AtsInventoryRow;
      })
      .filter((row): row is AtsInventoryRow => row !== null);
  } catch (error) {
    console.error('Parse failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  if (parsedRows.length === 0) {
    console.error('Parsed 0 rows. Exiting without touching database.');
    process.exit(1);
  }

  const { error: clearError } = await supabase
    .from('ats_inventory_wms')
    .delete()
    .or('sku.is.null,sku.not.is.null');
  if (clearError) {
    console.error('Failed to truncate ats_inventory_wms:', clearError.message);
    process.exit(1);
  }

  for (let i = 0; i < parsedRows.length; i += BATCH_SIZE) {
    const batch = parsedRows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('ats_inventory_wms').insert(batch);
    if (error) {
      console.error(`Batch insert failed (${Math.floor(i / BATCH_SIZE) + 1}): ${error.message}`);
      process.exit(1);
    }
  }

  console.log(`Uploaded ${parsedRows.length} rows to ats_inventory_wms`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

