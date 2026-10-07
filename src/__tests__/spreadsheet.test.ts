import * as XLSX from 'xlsx';
import { parseStatementRows } from '@/lib/csv-statement';
import { parseSpreadsheet } from '@/lib/spreadsheet';

const NOW = new Date(2026, 9, 7);

function workbook(sheets: Record<string, unknown[][]>, bookType: XLSX.BookType = 'xlsx'): Uint8Array {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows, { cellDates: true }), name);
  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType }));
}

const STATEMENT = [
  ['Meezan Bank — Account Statement'],
  ['Account', '****1234'],
  [],
  ['Transaction\nDate', 'Value Date', 'Narration', 'Withdrawal (PKR)', 'Deposit (PKR)', 'Balance'],
  [new Date(2026, 9, 2), new Date(2026, 9, 2), 'CAREEM RIDE KHI', 850, '', 99150],
  [new Date(2026, 9, 3), new Date(2026, 9, 3), 'DARAZ.PK ORDER', 3600, '', 95550],
  [new Date(2026, 9, 4), new Date(2026, 9, 4), 'SALARY OCT', '', 300000, 395550],
  ['', '', 'Closing balance', '', '', 395550],
];

describe('parseSpreadsheet', () => {
  it('reads .xlsx with real date cells, preamble rows and messy headers', () => {
    const res = parseSpreadsheet(workbook({ Statement: STATEMENT }), NOW);
    expect(res.error).toBeUndefined();
    expect(res.transactions.map((t) => [t.merchant, t.amount, t.date.getDate(), t.date.getMonth()])).toEqual([
      ['CAREEM RIDE KHI', -850, 2, 9],
      ['DARAZ.PK ORDER', -3600, 3, 9],
      ['SALARY OCT', 300000, 4, 9],
    ]);
    expect(res.skipped).toBe(1);
  });

  it('reads legacy .xls (BIFF8)', () => {
    const res = parseSpreadsheet(workbook({ Sheet1: STATEMENT }, 'biff8'), NOW);
    expect(res.transactions).toHaveLength(3);
  });

  it('picks the sheet that contains the statement', () => {
    const res = parseSpreadsheet(workbook({ Summary: [['Total', 1]], Transactions: STATEMENT }), NOW);
    expect(res.transactions).toHaveLength(3);
  });

  it('reads text dates and signed amounts', () => {
    const res = parseSpreadsheet(workbook({ S: [['Date', 'Description', 'Amount'], ['07-Oct-2026', 'KFC', '-1,250.00'], ['06/10/2026', 'Refund', '500']] }), NOW);
    expect(res.transactions.map((t) => [t.amount, t.date.getDate()])).toEqual([[-1250, 7], [500, 6]]);
  });

  it('explains when no statement is found', () => {
    expect(parseSpreadsheet(workbook({ S: [['Name', 'Age'], ['A', 1]] }), NOW).error).toMatch(/Date and Amount/);
  });
});

describe('parseStatementRows header normalisation', () => {
  it.each([
    [['Txn Date', 'Transaction Details', 'Debit (PKR)', 'Credit (PKR)']],
    [['Posting Date', 'Particulars', 'Withdrawals', 'Deposits']],
    [['DATE', 'DESCRIPTION', 'AMOUNT (PKR)']],
  ])('%j', (header) => {
    const row = header.length === 3 ? ['05/10/2026', 'Uber', '-700'] : ['05/10/2026', 'Uber', '700', ''];
    const res = parseStatementRows([header, row], NOW);
    expect(res.error).toBeUndefined();
    expect(res.transactions[0]).toMatchObject({ merchant: 'Uber', amount: -700 });
  });
});

describe('base64ToBytes', () => {
  it('matches Buffer decoding for all padding lengths', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { base64ToBytes } = require('@/lib/read-file');
    for (const s of ['', 'a', 'ab', 'abc', 'abcd', 'PK\u0003\u0004 zip header', 'Date,Amount\n1,2']) {
      const b64 = Buffer.from(s, 'latin1').toString('base64');
      expect(Array.from(base64ToBytes(b64))).toEqual(Array.from(Buffer.from(s, 'latin1')));
    }
  });
});
