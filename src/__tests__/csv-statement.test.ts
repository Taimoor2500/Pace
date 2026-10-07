import { parseAmount, parseCsv, parseStatement } from '@/lib/csv-statement';

const NOW = new Date(2026, 9, 7);

describe('parseCsv', () => {
  it('handles quotes, escaped quotes and CRLF', () => {
    expect(parseCsv('a,"b, c","d ""e"""\r\n1,2,3')).toEqual([['a', 'b, c', 'd "e"'], ['1', '2', '3']]);
  });
  it('detects semicolon separators', () => {
    expect(parseCsv('Date;Amount\n01/10/2026;-500')).toEqual([['Date', 'Amount'], ['01/10/2026', '-500']]);
  });
});

describe('parseAmount', () => {
  it.each([
    ['1,250.00', 1250],
    ['-1,250.00', -1250],
    ['(1,250)', -1250],
    ['1,250.00 DR', -1250],
    ['', 0],
  ])('%s → %d', (input, expected) => expect(parseAmount(input)).toBe(expected));
});

describe('parseStatement', () => {
  it('reads debit/credit column statements, skipping preamble rows', () => {
    const csv = [
      'Account Statement,,,',
      'Account: ****1234,,,',
      'Transaction Date,Description,Debit,Credit,Balance',
      '01-Oct-2026,SALARY OCT,,"300,000.00","320,000.00"',
      '02-Oct-2026,KFC DHA,"1,250.00",,"318,750.00"',
      ',Opening balance,,,',
    ].join('\n');
    const res = parseStatement(csv, NOW);
    expect(res.error).toBeUndefined();
    expect(res.transactions).toHaveLength(2);
    expect(res.transactions[0]).toMatchObject({ merchant: 'SALARY OCT', amount: 300000 });
    expect(res.transactions[1]).toMatchObject({ merchant: 'KFC DHA', amount: -1250 });
    expect(res.skipped).toBe(1);
  });

  it('reads signed single-amount statements with ISO dates', () => {
    const res = parseStatement('Date,Narration,Amount\n2026-10-03,Uber trip,-850\n2026-10-04,Refund,200', NOW);
    expect(res.transactions.map((t) => t.amount)).toEqual([-850, 200]);
    expect(res.transactions[0].date.getDate()).toBe(3);
  });

  it('reads amount + Dr/Cr indicator statements', () => {
    const res = parseStatement('Date,Details,Amount,Dr/Cr\n05/10/2026,Daraz,3600,DR\n06/10/2026,Transfer in,5000,CR', NOW);
    expect(res.transactions.map((t) => t.amount)).toEqual([-3600, 5000]);
  });

  it('handles the byte-order mark Excel adds to CSV files', () => {
    const res = parseStatement('\uFEFFDate,Description,Amount\r\n05/10/2026,Uber,-700\r\n', NOW);
    expect(res.transactions).toHaveLength(1);
  });

  it('explains when columns are missing', () => {
    expect(parseStatement('foo,bar\n1,2', NOW).error).toMatch(/Date and Amount/);
  });
});
