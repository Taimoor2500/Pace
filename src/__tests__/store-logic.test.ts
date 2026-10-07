import { migrate } from '@/store/migrate';
import { applyRecurring, monthKey } from '@/store/recurring';
import { initialState, recommendedPockets } from '@/store/seed';
import { insights, pace, today } from '@/store/selectors';
import type { AppState, Goal } from '@/store/types';

const NOW = new Date(2026, 9, 7, 12, 0);

function state(patch: Partial<AppState> = {}): AppState {
  return { ...initialState(), onboarded: true, name: 'Test', pockets: recommendedPockets(300000), ...patch };
}

const goal = (patch: Partial<Goal> = {}): Goal => ({
  id: 'g1', name: 'Trip', target: 100000, monthly: 10000, autoSave: true, lastAutoSave: '2026-09',
  targetDate: new Date(2027, 9, 1).toISOString(), icon: 'airplane', tint: 'pink', contributions: [], ...patch,
});

describe('applyRecurring', () => {
  it('adds the monthly auto-save once payday has passed', () => {
    const next = applyRecurring(state({ payday: 1, goals: [goal()] }), NOW);
    expect(next.goals[0].contributions).toHaveLength(1);
    expect(next.goals[0].contributions[0]).toMatchObject({ label: 'Auto-save', amount: 10000 });
    expect(next.goals[0].lastAutoSave).toBe(monthKey(NOW));
    // Idempotent: running again the same month changes nothing.
    expect(applyRecurring(next, NOW)).toBe(next);
  });
  it('waits for payday', () => {
    const s = state({ payday: 25, goals: [goal()] });
    expect(applyRecurring(s, NOW)).toBe(s);
  });
  it('never overfunds a goal', () => {
    const g = goal({ contributions: [{ id: 'c', label: 'x', amount: 95000, date: NOW.toISOString() }] });
    const next = applyRecurring(state({ goals: [g] }), NOW);
    expect(next.goals[0].contributions[0].amount).toBe(5000);
  });
  it('skips goals without auto-save', () => {
    const s = state({ goals: [goal({ autoSave: false })] });
    expect(applyRecurring(s, NOW)).toBe(s);
  });
});

describe('migrate', () => {
  it('upgrades v1 data', () => {
    const v1 = { version: 1, onboarded: true, name: 'A', income: 1, trackingMethods: [], pockets: [{ id: 'essentials', name: 'E', icon: 'home', tint: 'green', budget: 1 }], transactions: [], goals: [], bills: [{ id: 'b', name: 'B', amount: 1, dueDate: NOW.toISOString(), icon: 'tv', tint: 'red' }] };
    const m = migrate(v1)!;
    expect(m.version).toBe(2);
    expect(m.payday).toBe(1);
    expect(m.pockets[0].fixed).toBe(true);
    expect(m.bills[0].recurring).toBe(true);
    expect(m.rules).toEqual({});
  });
  it('rejects garbage', () => {
    expect(migrate(null)).toBeNull();
    expect(migrate({ version: 99 })).toBeNull();
  });
});

describe('selectors', () => {
  it('safe to spend excludes fixed pockets and spreads over remaining days', () => {
    const s = state();
    const t = today(s, NOW);
    const flexible = s.pockets.filter((p) => !p.fixed).reduce((a, p) => a + p.budget, 0);
    expect(t.safeToday).toBe(Math.round(flexible / (31 - 7 + 1) / 50) * 50);
  });
  it('spending today reduces today’s allowance', () => {
    const s = state({ transactions: [{ id: 't', merchant: 'KFC', amount: -1000, date: NOW.toISOString(), pocketId: 'food' }] });
    expect(today(s, NOW).safeToday).toBe(today(state(), NOW).safeToday - 1000 + Math.round(0));
  });
  it('pace is positive when under the pro-rata budget', () => {
    expect(pace(state(), NOW, NOW).ahead).toBeGreaterThan(0);
  });
  it('insights are empty for a month with no activity', () => {
    const i = insights(state(), NOW, NOW);
    expect(i.hasActivity).toBe(false);
    expect(i.streak).toBe(0);
    expect(i.diningChange).toBeNull();
  });
});
