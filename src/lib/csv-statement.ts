import { parseDate, type ParsedTransaction } from './sms-parser';

/** RFC-4180-ish CSV parsing (quoted fields, escaped quotes, CRLF). Also accepts ; and tab separators. */
export function parseCsv(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const sep = [',', ';', '\t'].reduce((best, s) => (firstLine.split(s).length > firstLine.split(best).length ? s : best), ',');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== '')) rows.push(row);
  return rows.map((r) => r.map((f) => f.trim()));
}

const COLS = {
  date: /^(txn|tran|trans|transaction|value|posting|post|booking|entry)?\.? ?date( ?\/ ?time)?$|^date\b/i,
  description: /description|details|narration|particulars|merchant|remarks|payee|memo|beneficiary|^transaction$|^narrative/i,
  amount: /^(transaction |txn )?amount\b|^value$/i,
  debit: /debit|withdraw|money out|^dr\.?$|paid out|outflow/i,
  credit: /credit|deposit|money in|^cr\.?$|paid in|inflow/i,
};

/** "Transaction\nDate", " Withdrawal (PKR) " → "transaction date", "withdrawal" */
function normHeader(c: string): string {
  return c
    .replace(/\s+/g, ' ')
    .replace(/\((pkr|rs\.?|amount)\)|\b(pkr|rs\.?)\b/gi, '')
    .trim()
    .toLowerCase();
}

/** "1,250.00" → 1250, "(1,250)" → -1250, "1,250.00 DR" → -1250, "" → 0 */
export function parseAmount(s: string): number {
  if (!s) return 0;
  const negative = /^\(.*\)$/.test(s.trim()) || /-\s*[\d.,]/.test(s) || /\bdr\b/i.test(s);
  const n = Number(s.replace(/[^\d.]/g, ''));
  if (!Number.isFinite(n)) return 0;
  return negative ? -n : n;
}

export type StatementResult = { transactions: ParsedTransaction[]; skipped: number; error?: string };

/** Detects the header row and columns of a bank statement export (CSV text) and returns transactions. */
export function parseStatement(text: string, now = new Date()): StatementResult {
  return parseStatementRows(parseCsv(text), now);
}

/** True if this row looks like a statement header (has a date column and an amount or debit column). */
export function isHeaderRow(r: string[]): boolean {
  const h = r.map(normHeader);
  return h.some((c) => COLS.date.test(c)) && (h.some((c) => COLS.amount.test(c)) || h.some((c) => COLS.debit.test(c)));
}

/** Same as parseStatement, for rows already split into cells (CSV or a spreadsheet sheet). */
export function parseStatementRows(rawRows: string[][], now = new Date()): StatementResult {
  const rows = rawRows.map((r) => r.map((c) => String(c ?? '').trim()));
  const headerIdx = rows.findIndex(isHeaderRow);
  if (headerIdx < 0) {
    return { transactions: [], skipped: 0, error: 'Couldn’t find Date and Amount (or Debit/Credit) columns in this file.' };
  }
  const header = rows[headerIdx].map(normHeader);
  const find = (re: RegExp, exclude: number[] = []) => header.findIndex((c, i) => !exclude.includes(i) && re.test(c));
  const dateCol = find(COLS.date);
  // An "Amount" column paired with a "Dr/Cr" indicator column.
  const typeCol = find(/^(dr\s*\/\s*cr|cr\s*\/\s*dr|type|debit\s*\/\s*credit|credit\s*\/\s*debit)$/i);
  const debitCol = find(COLS.debit, [typeCol]);
  const creditCol = find(COLS.credit, [debitCol, typeCol]);
  const amountCol = find(COLS.amount, [debitCol, creditCol, typeCol]);
  const descCol = find(COLS.description, [dateCol, debitCol, creditCol, amountCol, typeCol]);

  const transactions: ParsedTransaction[] = [];
  let skipped = 0;
  for (const r of rows.slice(headerIdx + 1)) {
    const date = parseDate(r[dateCol] ?? '', now);
    let amount = 0;
    if (amountCol >= 0) amount = parseAmount(r[amountCol] ?? '');
    else amount = parseAmount(r[creditCol] ?? '') - Math.abs(parseAmount(r[debitCol] ?? ''));
    if (amountCol >= 0 && typeCol >= 0) amount = /^d/i.test(r[typeCol] ?? '') ? -Math.abs(amount) : Math.abs(amount);
    if (amountCol >= 0 && debitCol >= 0 && parseAmount(r[debitCol] ?? '') !== 0 && amount > 0) amount = -amount;
    if (!date || !amount) { skipped++; continue; }
    const description = (descCol >= 0 ? r[descCol] : '') || (amount < 0 ? 'Card payment' : 'Money received');
    transactions.push({ merchant: description.replace(/\s+/g, ' ').slice(0, 40), amount, date, raw: r.join(', ') });
  }
  return { transactions, skipped };
}
