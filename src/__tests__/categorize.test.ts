import { guessPocket, isLearnable, merchantKey } from '@/lib/categorize';

const POCKETS = ['essentials', 'food', 'transport', 'shopping', 'fun', 'travel'];

describe('guessPocket', () => {
  it('maps known merchants', () => {
    expect(guessPocket('KFC DHA', POCKETS)).toBe('food');
    expect(guessPocket('Careem Ride', POCKETS)).toBe('transport');
    expect(guessPocket('K-Electric Bill', POCKETS)).toBe('essentials');
    expect(guessPocket('Netflix.com', POCKETS)).toBe('fun');
  });
  it('returns undefined when unsure or pocket missing', () => {
    expect(guessPocket('POS 4471', POCKETS)).toBeUndefined();
    expect(guessPocket('KFC', ['essentials'])).toBeUndefined();
  });
  it('does not match short keywords inside other words', () => {
    expect(guessPocket('Pianist lessons', POCKETS)).toBeUndefined();
  });
  it('prefers learned rules', () => {
    expect(guessPocket('KFC DHA', POCKETS, { [merchantKey('KFC DHA')]: 'fun' })).toBe('fun');
    expect(merchantKey('KFC  DHA, Karachi')).toBe('kfc dha');
  });
});

describe('isLearnable', () => {
  it('rejects generic bank labels', () => {
    expect(isLearnable('POS')).toBe(false);
    expect(isLearnable('POS 4471')).toBe(false);
    expect(isLearnable('Card payment')).toBe(false);
    expect(isLearnable('Money received')).toBe(false);
  });
  it('accepts real merchants', () => {
    expect(isLearnable('Cafe Aylanto')).toBe(true);
    expect(isLearnable('Posh Salon')).toBe(true);
  });
});
