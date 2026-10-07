import { initialState } from './seed';
import type { AppState } from './types';

/** Upgrades older saved data to the current shape. */
export function migrate(raw: unknown): AppState | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Partial<AppState> & { version?: number };
  if (s.version === 2) return { ...initialState(), ...s } as AppState;
  if (s.version === 1) {
    const base = initialState();
    return {
      ...base,
      ...(s as object),
      version: 2,
      payday: 1,
      rules: {},
      reminders: base.reminders,
      pockets: (s.pockets ?? base.pockets).map((p) => ({ ...p, fixed: p.id === 'essentials' })),
      bills: (s.bills ?? []).map((b) => ({ ...b, recurring: true })),
    } as AppState;
  }
  return null;
}
