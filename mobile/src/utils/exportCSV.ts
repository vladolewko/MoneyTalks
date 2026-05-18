import { File, Paths } from 'expo-file-system/next';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import type { Transaction } from '../types';

// ─── EXPORT ───────────────────────────────────────────────────────────────────

function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/** Converts transactions to CSV string (UTF-8 BOM for Excel compatibility) */
export function transactionsToCSV(transactions: Transaction[]): string {
  const BOM = '\uFEFF';
  const headers = ['ID', 'Тип', 'Сума', 'Валюта', 'Категорія', 'Нотатка', 'Дата'];
  const rows = transactions.map(tx => [
    tx.id,
    tx.type === 'income' ? 'Дохід' : 'Витрата',
    Number(tx.amount).toFixed(2),
    tx.currency,
    tx.category ?? '',
    tx.note ?? '',
    new Date(tx.occurred_at).toLocaleDateString('uk-UA', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    }),
  ]);

  const csvLines = [
    headers.map(escapeCell).join(','),
    ...rows.map(row => row.map(escapeCell).join(',')),
  ];

  return BOM + csvLines.join('\n');
}

/** Saves CSV to cache and opens system share sheet */
export async function exportTransactionsCSV(transactions: Transaction[]): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) throw new Error('Sharing is not available on this device');

  const csv = transactionsToCSV(transactions);
  const fileName = `moneytalks_${new Date().toISOString().slice(0, 10)}.csv`;

  const file = new File(Paths.cache, fileName);
  await file.write(csv);

  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    dialogTitle: 'Зберегти або відкрити звіт',
    UTI: 'public.comma-separated-values-text',
  });
}

// ─── IMPORT ───────────────────────────────────────────────────────────────────

export type ImportedRow = {
  type: 'income' | 'expense';
  amount: number;
  currency: string;
  category: string | null;
  note: string | null;
  occurred_at: string;
};

export type ImportResult = {
  rows: ImportedRow[];
  skipped: number;
  errors: string[];
};

/** Parses a single CSV cell (handles quoted values with escaped quotes) */
function parseCell(raw: string): string {
  const t = raw.trim();
  if (t.startsWith('"') && t.endsWith('"')) {
    return t.slice(1, -1).replace(/""/g, '"');
  }
  return t;
}

/** Splits a CSV line into cells (handles quoted commas) */
function splitLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      cells.push(parseCell(current));
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(parseCell(current));
  return cells;
}

/**
 * Parses a Ukrainian locale date string back to ISO 8601.
 * Handles formats: "18.05.2026, 14:30" or "18.05.2026 14:30"
 */
function parseUkrDate(raw: string): string | null {
  try {
    // Remove BOM if present, normalize separators
    const s = raw.replace(/^\uFEFF/, '').trim().replace(',', '');
    // Expected: DD.MM.YYYY HH:MM
    const match = s.match(/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})/);
    if (!match) return null;
    const [, dd, mm, yyyy, hh, min] = match;
    return `${yyyy}-${mm}-${dd}T${hh}:${min}:00.000Z`;
  } catch {
    return null;
  }
}

/**
 * Opens the document picker, reads the selected CSV file,
 * and returns parsed transaction rows ready to post to the API.
 */
export async function importTransactionsCSV(): Promise<ImportResult | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['text/csv', 'text/comma-separated-values', 'public.comma-separated-values-text', '*/*'],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.length) return null;

  const asset = result.assets[0];

  // Read file content using new File API
  const file = new File(asset.uri);
  const content = await file.text();

  // Strip UTF-8 BOM if present
  const raw = content.replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);

  if (lines.length < 2) {
    return { rows: [], skipped: 0, errors: ['Файл порожній або містить лише заголовок'] };
  }

  // Detect if first line is our header
  const firstLine = lines[0].toLowerCase();
  const startIndex = firstLine.includes('тип') || firstLine.includes('сума') || firstLine.includes('id') ? 1 : 0;

  const rows: ImportedRow[] = [];
  const errors: string[] = [];
  let skipped = 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cells = splitLine(line);
    // Columns (from our export): ID, Тип, Сума, Валюта, Категорія, Нотатка, Дата
    // We need at least: Тип (idx 1), Сума (idx 2), Валюта (idx 3), Дата (idx 6)
    if (cells.length < 4) {
      skipped++;
      errors.push(`Рядок ${i + 1}: замало колонок (${cells.length})`);
      continue;
    }

    const typeRaw = cells[1]?.toLowerCase() ?? '';
    const type: 'income' | 'expense' = typeRaw.includes('дохід') || typeRaw === 'income' ? 'income' : 'expense';

    const amountRaw = cells[2] ?? '';
    const amount = Number(amountRaw.replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) {
      skipped++;
      errors.push(`Рядок ${i + 1}: некоректна сума "${amountRaw}"`);
      continue;
    }

    const currency = cells[3]?.toUpperCase() || 'UAH';
    const category = cells[4] || null;
    const note = cells[5] || null;
    const dateRaw = cells[6] ?? '';
    const occurred_at = parseUkrDate(dateRaw) ?? new Date().toISOString();

    rows.push({ type, amount, currency, category, note, occurred_at });
  }

  return { rows, skipped, errors };
}
