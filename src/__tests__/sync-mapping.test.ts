import { diffRows, fromRows, isEmpty, toRows } from '@/sync/mapping';
import { initialState, recommendedPockets, sampleData } from '@/store/seed';
import type { AppState } from '@/store/types';

const NOW = new Date(2026, 9, 7, 12, 0);

function sample(): AppState {
  const pockets = recommendedPockets(300000);
  return { ...initialState(), onboarded: true, name: 'T', payday: 5, pockets, ...sampleData(pockets, 300000, NOW) };
}

describe('toRows / fromRows', () => {
  it('round-trips the full app state', () => {
    const s = sample();
    const back = fromRows(toRows(s));
    expect(back.pockets).toEqual(s.pockets);
    expect(back.bills).toEqual(s.bills);
    expect(back.transactions).toEqual([...s.transactions].sort((a, b) => b.date.localeCompare(a.date)));
    expect(back.goals.map((g) => g.contributions.length)).toEqual(s.goals.map((g) => g.contributions.length));
    expect(back.goals[0]).toMatchObject({ name: s.goals[0].name, autoSave: s.goals[0].autoSave, art: 'japan' });
    expect(back.payday).toBe(5);
    expect(back.onboarded).toBe(true);
  });

  it('keeps pocket and goal order', () => {
    const s = sample();
    s.pockets.reverse();
    expect(fromRows(toRows(s)).pockets.map((p) => p.id)).toEqual(s.pockets.map((p) => p.id));
  });
});

describe('diffRows', () => {
  it('uploads everything on first sync', () => {
    const s = sample();
    const c = diffRows(null, toRows(s));
    expect(c.profile).not.toBeNull();
    expect(c.upserts.transactions).toHaveLength(s.transactions.length);
  });

  it('is empty when nothing changed', () => {
    const rows = toRows(sample());
    expect(isEmpty(diffRows(rows, JSON.parse(JSON.stringify(rows))))).toBe(true);
  });

  it('detects single edits, inserts and deletes', () => {
    const s = sample();
    const prev = toRows(s);
    const next: AppState = {
      ...s,
      transactions: [{ id: 'new', merchant: 'KFC', amount: -500, date: NOW.toISOString(), pocketId: 'food' }, ...s.transactions.slice(1)],
      pockets: s.pockets.map((p) => (p.id === 'fun' ? { ...p, budget: 1 } : p)),
    };
    const c = diffRows(prev, toRows(next));
    expect(c.upserts.transactions.map((t) => t.id)).toEqual(['new']);
    expect(c.deletes.transactions).toEqual([s.transactions[0].id]);
    expect(c.upserts.pockets.map((p) => p.id)).toEqual(['fun']);
    expect(c.profile).toBeNull();
    expect(c.upserts.goals).toHaveLength(0);
  });

  it('treats timestamps from Postgres as equal to local ISO strings', () => {
    const rows = toRows(sample());
    const fromServer = JSON.parse(JSON.stringify(rows));
    fromServer.transactions[0].date = fromServer.transactions[0].date.replace('Z', '+00:00');
    // cleanRows normalises; mimic it here.
    fromServer.transactions[0].date = new Date(fromServer.transactions[0].date).toISOString();
    expect(isEmpty(diffRows(fromServer, rows))).toBe(true);
  });
});
