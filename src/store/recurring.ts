import { uid } from './ids';
import type { AppState } from './types';

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Runs time-based automation: on/after payday each month, goals with auto-save receive their monthly amount.
 * Pure — returns the same object when nothing changes. Missed months are not back-filled.
 */
export function applyRecurring(state: AppState, now = new Date()): AppState {
  if (!state.onboarded) return state;
  const key = monthKey(now);
  const payday = Math.min(state.payday, 28);
  if (now.getDate() < payday) return state;

  let changed = false;
  const goals = state.goals.map((g) => {
    if (!g.autoSave || g.monthly <= 0 || (g.lastAutoSave ?? '') >= key) return g;
    const saved = g.contributions.reduce((s, c) => s + c.amount, 0);
    const amount = Math.min(g.monthly, Math.max(0, g.target - saved));
    changed = true;
    if (amount === 0) return { ...g, lastAutoSave: key };
    const date = new Date(now.getFullYear(), now.getMonth(), payday, 9, 0);
    return {
      ...g,
      lastAutoSave: key,
      contributions: [{ id: uid('c'), label: 'Auto-save', amount, date: date.toISOString() }, ...g.contributions],
    };
  });
  return changed ? { ...state, goals } : state;
}
