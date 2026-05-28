import 'dotenv/config';
import * as XLSX from 'xlsx';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'ats-inventory-reports';
const BATCH_SIZE = 500;

type AtsInventoryRow = {
  id: string;
  sku: string;
  color: string | null;
  color_desc: string | null;
  size: string | null;
  ots_qoh: number | null;
  created_at: string;
};

function requireEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing required env: ${name}`);
    return null;
  }
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

type StorageListItem = { name: string; id: string | null };

function isFolder(item: StorageListItem): boolean {
  return item.id === null;
}

function isXlsxFile(name: string): boolean {
  return name.toLowerCase().endsWith('.xlsx');
}

async function findLatestXlsxPath(supabase: SupabaseClient): Promise<string | null> {
  const { data: topLevel, error: listError } = await supabase.storage
    .from(BUCKET)
    .list('', { limit: 1000 });

  if (listError) {
    console.error('Failed to list storage folders:', listError.message);
    return null;
  }

  if (!topLevel?.length) {
    console.error('No folders found in storage bucket');
    return null;
  }

  const folders = topLevel
    .filter(isFolder)
    .sort((a, b) => b.name.localeCompare(a.name));

  if (folders.length === 0) {
    console.error('No date folders found in storage bucket');
    return null;
  }

  const latestFolder = folders[0].name;

  const { data: files, error: filesError } = await supabase.storage
    .from(BUCKET)
    .list(latestFolder, { limit: 100 });

  if (filesError) {
    console.error(`Failed to list files in ${latestFolder}:`, filesError.message);
    return null;
  }

  const xlsxFile = files?.find((f) => !isFolder(f) && isXlsxFile(f.name));
  if (!xlsxFile) {
    console.error(`No .xlsx file found in folder: ${latestFolder}`);
    return null;
  }

  return `${latestFolder}/${xlsxFile.name}`;
}

async function main() {
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const storagePath = await findLatestXlsxPath(supabase);
  if (!storagePath) {
    process.exit(1);
  }

  console.log(`Downloading: ${storagePath}`);

  const { data: fileData, error: downloadError } = await supabase.storage
    .from(BUCKET)
    .download(storagePath);

  if (downloadError || !fileData) {
    console.error(
      'Storage download failed:',
      downloadError?.message ?? 'No file data returned'
    );
    process.exit(1);
  }

  let parsedRows: AtsInventoryRow[] = [];
  try {
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) throw new Error('No sheets found in workbook');
    const sheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
    });

    const now = new Date().toISOString();
    parsedRows = rawRows
      .map((row) => {
        const sku = cleanString(row['SKU']);
        if (!sku) return null;
        const record: AtsInventoryRow = {
          id: crypto.randomUUID(),
          sku,
          color: cleanString(row['Color']),
          color_desc: cleanString(row['Color Desc']),
          size: cleanString(row['Size']),
          ots_qoh: parseIntOrNull(row['OTS QOH']),
          created_at: now,
        };
        return record;
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

  const { error: truncateError } = await supabase
    .from('ats_inventory_wms')
    .delete()
    .or('sku.is.null,sku.not.is.null');

  if (truncateError) {
    console.error('Failed to truncate ats_inventory_wms:', truncateError.message);
    process.exit(1);
  }

  for (let i = 0; i < parsedRows.length; i += BATCH_SIZE) {
    const batch = parsedRows.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const { error } = await supabase.from('ats_inventory_wms').insert(batch);
    if (error) {
      console.error(`Batch insert failed (${batchNum}): ${error.message}`);
      continue;
    }
  }

  console.log(`Synced ${parsedRows.length} rows from storage to ats_inventory_wms`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
