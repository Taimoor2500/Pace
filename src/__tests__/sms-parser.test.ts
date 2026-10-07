import { parseSms, parseSmsBatch } from '@/lib/sms-parser';

const NOW = new Date(2026, 9, 7, 12, 0);

describe('parseSms', () => {
  it('parses an HBL-style debit with merchant and date', () => {
    const t = parseSms('Dear Customer, PKR 1,250.00 has been debited from your A/C ****1234 for purchase at KFC DHA on 07-Oct-26 12:30.', NOW)!;
    expect(t.amount).toBe(-1250);
    expect(t.merchant).toBe('KFC DHA');
    expect(t.date.getFullYear()).toBe(2026);
    expect(t.date.getMonth()).toBe(9);
    expect(t.date.getDate()).toBe(7);
    expect(t.date.getHours()).toBe(12);
  });

  it('parses a Meezan-style card usage', () => {
    const t = parseSms('Your Meezan Debit Card ending 1234 has been used for Rs.550.00 at STARBUCKS DOLMEN on 06-Oct-2026 09:14:11.', NOW)!;
    expect(t.amount).toBe(-550);
    expect(t.merchant).toBe('Starbucks Dolmen');
    expect(t.date.getDate()).toBe(6);
  });

  it('parses a day-first numeric date', () => {
    const t = parseSms('Trx of PKR 4,350 at CARREFOUR on your UBL Card xx1234 on 05/10/2026.', NOW)!;
    expect(t.amount).toBe(-4350);
    expect(t.merchant).toBe('Carrefour');
    expect(t.date.getMonth()).toBe(9);
    expect(t.date.getDate()).toBe(5);
  });

  it('parses wallet transfers out and credits in', () => {
    const sent = parseSms('Rs. 500 sent to Ali Khan 03001234567 via JazzCash. TID: 123456789', NOW)!;
    expect(sent.amount).toBe(-500);
    expect(sent.merchant).toBe('Ali Khan');
    const got = parseSms('You have received Rs 50,000.00 from Meezan Transfer in your Easypaisa account.', NOW)!;
    expect(got.amount).toBe(50000);
    expect(got.merchant).toBe('Meezan Transfer');
  });

  it('treats salary credits as income', () => {
    const t = parseSms('PKR 300,000.00 has been credited to your A/C ****1234 on 01-Oct-26. Salary', NOW)!;
    expect(t.amount).toBe(300000);
  });

  it('ignores OTPs and balance notices', () => {
    expect(parseSms('Your OTP for transaction of PKR 1,250 is 482910. Do not share.', NOW)).toBeNull();
    expect(parseSms('Your available balance is PKR 120,000.00 as of 07-Oct-26.', NOW)).toBeNull();
    expect(parseSms('Hello, how are you?', NOW)).toBeNull();
  });

  it('falls back to now when no date is present', () => {
    const t = parseSms('PKR 900 spent at Careem', NOW)!;
    expect(t.date.getDate()).toBe(7);
  });
});

describe('tax and fee alerts', () => {
  it.each([
    ['PKR 600.00 has been debited from your A/C ****1234 for WHT U/S 231A on 05-Oct-26.', 'WHT (withholding tax)', -600],
    ['Rs.24.00 FED charged on SMS alert service from your A/C ****1234.', 'FED (federal excise)', -24],
    ['PKR 12,500 Zakat deducted from your account on 01-Mar-26.', 'Zakat', -12500],
    ['Rs. 150 SMS alert charges debited from A/C ****1234.', 'Bank charges', -150],
  ])('%s', (text, merchant, amount) => {
    const t = parseSms(text, NOW)!;
    expect(t).toMatchObject({ merchant, amount });
  });
});

describe('parseSmsBatch', () => {
  it('splits messages by blank lines and by line', () => {
    const blank = 'PKR 900 spent at Careem\n\nPKR 1,200 spent at Uber';
    expect(parseSmsBatch(blank, NOW)).toHaveLength(2);
    const lines = 'PKR 900 spent at Careem\nPKR 1,200 spent at Uber\nPKR 300 spent at Chai Wala';
    expect(parseSmsBatch(lines, NOW)).toHaveLength(3);
  });

  it('keeps a multi-line message together', () => {
    const one = 'Dear Customer,\nPKR 2,000 has been debited\nat DARAZ on 04-Oct-26';
    const res = parseSmsBatch(one, NOW);
    expect(res).toHaveLength(1);
    expect(res[0].merchant).toBe('Daraz');
  });
});
