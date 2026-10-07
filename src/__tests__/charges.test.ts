import { guessPocket } from '@/lib/categorize';
import { classifyCharge, taxYearOf, taxYearRange } from '@/lib/charges';
import { taxSummary } from '@/store/selectors';
import { initialState, recommendedPockets } from '@/store/seed';
import type { AppState, Transaction } from '@/store/types';

describe('classifyCharge', () => {
  it.each([
    ['WHT U/S 231A', 'wht'],
    ['W.H.T ON CASH WITHDRAWAL', 'wht'],
    ['W.H.TAX ON PROFIT', 'wht'],
    ['Withholding tax deducted', 'wht'],
    ['TAX U/S 236P', 'wht'],
    ['FED ON SMS ALERT', 'excise'],
    ['Federal Excise Duty', 'excise'],
    ['Income Tax Payment FBR', 'other-tax'],
    ['Sales tax', 'other-tax'],
    ['ZAKAT DEDUCTION', 'zakat'],
    ['SMS ALERT CHARGES', 'fee'],
    ['IBFT CHARGES', 'fee'],
    ['Debit card annual fee', 'fee'],
    ['ATM FEE', 'fee'],
  ])('%s → %s', (text, kind) => expect(classifyCharge(text)).toBe(kind));

  it.each(['Careem Taxi', 'KFC DHA', 'IBFT FROM AHMED', 'Federal B Area Pharmacy', 'Coffee'])('%s → not a charge', (text) =>
    expect(classifyCharge(text)).toBeNull(),
  );
});

describe('auto-categorising', () => {
  const ids = ['essentials', 'food', 'transport'];
  it('files taxes and bank fees under Essentials', () => {
    expect(guessPocket('WHT U/S 231A', ids)).toBe('essentials');
    expect(guessPocket('SMS ALERT CHARGES', ids)).toBe('essentials');
    expect(guessPocket('FED ON SMS ALERT', ids)).toBe('essentials');
  });
  it('does not mistake taxis for tax', () => expect(guessPocket('Careem Taxi', ids)).toBe('transport'));
});

describe('tax year', () => {
  it('runs July to June, named by its end year', () => {
    expect(taxYearOf(new Date(2026, 5, 30))).toBe(2026);
    expect(taxYearOf(new Date(2026, 6, 1))).toBe(2027);
    expect(taxYearRange(2026)).toEqual({ start: new Date(2025, 6, 1), end: new Date(2026, 6, 1) });
  });
});

describe('taxSummary', () => {
  const tx = (merchant: string, amount: number, y: number, m: number, d = 10): Transaction => ({
    id: `${merchant}-${y}-${m}-${d}`, merchant, amount, date: new Date(y, m, d, 12).toISOString(),
  });
  const state: AppState = {
    ...initialState(),
    onboarded: true,
    pockets: recommendedPockets(300000),
    transactions: [
      tx('WHT U/S 231A', -600, 2025, 6), // Jul 2025 → TY2026
      tx('FED ON SMS ALERT', -24, 2025, 11),
      tx('W.H.TAX ON PROFIT', -1500, 2026, 5, 30), // Jun 2026 → TY2026
      tx('ZAKAT DEDUCTION', -12500, 2026, 2),
      tx('SMS ALERT CHARGES', -150, 2026, 0),
      tx('WHT U/S 231A', -300, 2026, 6), // Jul 2026 → TY2027
      tx('KFC', -1250, 2026, 1),
      tx('WHT refund', 600, 2026, 3), // money in: refunds reduce the total
    ],
  };

  it('totals taxes within the tax year, with zakat and fees separate', () => {
    const s = taxSummary(state, 2026);
    expect(s.taxTotal).toBe(600 + 24 + 1500 - 600);
    expect(s.byKind.wht).toBe(600 + 1500 - 600);
    expect(s.byKind.excise).toBe(24);
    expect(s.byKind.zakat).toBe(12500);
    expect(s.byKind.fee).toBe(150);
    expect(s.months).toHaveLength(12);
    expect(s.months[0]).toMatchObject({ tax: 600 }); // July
    expect(s.months[11]).toMatchObject({ tax: 1500 }); // June
    expect(s.items.map((i) => i.merchant)).not.toContain('KFC');
  });

  it('excludes other tax years', () => {
    expect(taxSummary(state, 2027).taxTotal).toBe(300);
  });
});
