import { buildSnapshot, pickPocket } from '@/widgets/snapshot';
import { initialState, recommendedPockets } from '@/store/seed';
import type { AppState } from '@/store/types';

const NOW = new Date(2026, 9, 7, 12);
const state = (patch: Partial<AppState> = {}): AppState => ({
  ...initialState(), onboarded: true, name: 'T', pockets: recommendedPockets(300000), ...patch,
});

describe('buildSnapshot', () => {
  it('formats every pocket for display', () => {
    const s = buildSnapshot(state({
      transactions: [
        { id: 'a', merchant: 'KFC', amount: -8050, date: NOW.toISOString(), pocketId: 'food' },
        { id: 'b', merchant: 'Khaadi', amount: -35000, date: NOW.toISOString(), pocketId: 'shopping' },
      ],
    }), NOW);
    const food = s.pockets.find((p) => p.id === 'food')!;
    expect(food).toMatchObject({ name: 'Food & Dining', left: 'Rs. 31,950 left', of: 'of Rs. 40,000', over: false, url: 'pace://pocket/food', symbol: 'cup.and.saucer.fill' });
    expect(food.used).toBeCloseTo(8050 / 40000);
    const shopping = s.pockets.find((p) => p.id === 'shopping')!;
    expect(shopping).toMatchObject({ left: 'Rs. 5,000 over', over: true, used: 1 });
    expect(s.safeToday).toMatch(/^Rs\. [\d,]+$/);
    expect(s.month).toBe('October');
  });

  it('is empty before onboarding', () => {
    expect(buildSnapshot({ ...initialState() }, NOW).pockets).toEqual([]);
  });
});

describe('pickPocket', () => {
  const s = buildSnapshot(state(), NOW);
  it('returns the chosen pocket', () => expect(pickPocket(s, 'travel')?.id).toBe('travel'));
  it('falls back to the first flexible pocket if the chosen one was deleted', () => expect(pickPocket(s, 'gone')?.id).toBe('food'));
});
