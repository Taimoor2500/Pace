import * as XLSX from 'xlsx';
import { isHeaderRow, parseStatementRows, type StatementResult } from './csv-statement';

/**
 * Reads an Excel workbook (.xlsx, .xls, and the HTML-as-.xls files some banks export) and parses the sheet
 * that looks most like a statement. Dates are normalised to ISO so day/month order can't be misread.
 */
export function parseSpreadsheet(data: Uint8Array | ArrayBuffer, now = new Date()): StatementResult {
  const wb = XLSX.read(data, { type: 'array', cellDates: true, dense: true });
  let best: { rows: string[][]; score: number } | null = null;
  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, raw: true, defval: '', blankrows: false })
      .map((r) => r.map(cellToString));
    const headerAt = rows.findIndex(isHeaderRow);
    const score = headerAt >= 0 ? rows.length - headerAt : -1;
    if (!best || score > best.score) best = { rows, score };
  }
  if (!best || best.score < 0) {
    return { transactions: [], skipped: 0, error: 'Couldn’t find Date and Amount (or Debit/Credit) columns in this spreadsheet.' };
  }
  return parseStatementRows(best.rows, now);
}

function cellToString(v: unknown): string {
  if (v instanceof Date) {
    // SheetJS gives dates in UTC-ish local; keep the calendar day as written in the sheet.
    const y = v.getFullYear(), m = String(v.getMonth() + 1).padStart(2, '0'), d = String(v.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof v === 'number') return String(v);
  return String(v ?? '');
}
