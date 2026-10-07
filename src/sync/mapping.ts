import type { AppState, Bill, Contribution, Goal, Pocket, Transaction } from '@/store/types';
import { initialState } from '@/store/seed';

/** Row shapes as stored in Supabase (user_id and updated_at are added/managed server-side). */
export type ProfileRow = {
  name: string;
  income: number;
  payday: number;
  tracking_methods: string[];
  rules: Record<string, string>;
  reminders: AppState['reminders'];
  setup_dismissed: boolean;
  onboarded: boolean;
};
export type PocketRow = { id: string; name: string; icon: string; tint: string; budget: number; fixed: boolean; position: number };
export type TransactionRow = {
  id: string; merchant: string; amount: number; date: string; pocket_id: string | null; note: string | null;
  goal_id: string | null; needs_review: boolean; source: string | null;
};
export type GoalRow = {
  id: string; name: string; target: number; monthly: number; auto_save: boolean; last_auto_save: string | null;
  target_date: string; icon: string; tint: string; art: string | null; flag: string | null; position: number;
};
export type ContributionRow = { id: string; goal_id: string; label: string; amount: number; date: string };
export type BillRow = {
  id: string; name: string; amount: number; due_date: string; recurring: boolean; icon: string; tint: string; pocket_id: string | null;
};

export type Rows = {
  profile: ProfileRow;
  pockets: PocketRow[];
  transactions: TransactionRow[];
  goals: GoalRow[];
  contributions: ContributionRow[];
  bills: BillRow[];
};

export const TABLES = ['pockets', 'transactions', 'goals', 'contributions', 'bills'] as const;
export type Table = (typeof TABLES)[number];

/** Postgres timestamps come back as "+00:00"; normalise so equal instants compare equal. */
const iso = (d: string) => new Date(d).toISOString();
const num = (n: unknown) => Number(n);

export function toRows(s: AppState): Rows {
  return {
    profile: {
      name: s.name,
      income: s.income,
      payday: s.payday,
      tracking_methods: s.trackingMethods,
      rules: s.rules,
      reminders: s.reminders,
      setup_dismissed: !!s.setupDismissed,
      onboarded: s.onboarded,
    },
    pockets: s.pockets.map((p, position) => ({
      id: p.id, name: p.name, icon: p.icon, tint: p.tint, budget: p.budget, fixed: !!p.fixed, position,
    })),
    transactions: s.transactions.map((t) => ({
      id: t.id, merchant: t.merchant, amount: t.amount, date: iso(t.date), pocket_id: t.pocketId ?? null, note: t.note ?? null,
      goal_id: t.goalId ?? null, needs_review: !!t.needsReview, source: t.source ?? null,
    })),
    goals: s.goals.map((g, position) => ({
      id: g.id, name: g.name, target: g.target, monthly: g.monthly, auto_save: !!g.autoSave, last_auto_save: g.lastAutoSave ?? null,
      target_date: iso(g.targetDate), icon: g.icon, tint: g.tint, art: g.art ?? null, flag: g.flag ?? null, position,
    })),
    contributions: s.goals.flatMap((g) =>
      g.contributions.map((c) => ({ id: c.id, goal_id: g.id, label: c.label, amount: c.amount, date: iso(c.date) })),
    ),
    bills: s.bills.map((b) => ({
      id: b.id, name: b.name, amount: b.amount, due_date: iso(b.dueDate), recurring: b.recurring, icon: b.icon, tint: b.tint,
      pocket_id: b.pocketId ?? null,
    })),
  };
}

/** Normalises rows read from Supabase (numeric → number, timestamps → ISO, drops server columns). */
export function cleanRows(raw: {
  profile: Record<string, unknown> | null;
  pockets: Record<string, unknown>[];
  transactions: Record<string, unknown>[];
  goals: Record<string, unknown>[];
  contributions: Record<string, unknown>[];
  bills: Record<string, unknown>[];
}): Rows | null {
  if (!raw.profile) return null;
  const p = raw.profile;
  const base = initialState();
  return {
    profile: {
      name: String(p.name ?? ''),
      income: num(p.income),
      payday: num(p.payday),
      tracking_methods: (p.tracking_methods as string[]) ?? [],
      rules: (p.rules as Record<string, string>) ?? {},
      reminders: { ...base.reminders, ...((p.reminders as object) ?? {}) },
      setup_dismissed: !!p.setup_dismissed,
      onboarded: !!p.onboarded,
    },
    pockets: raw.pockets.map((r) => ({
      id: String(r.id), name: String(r.name), icon: String(r.icon), tint: String(r.tint), budget: num(r.budget), fixed: !!r.fixed,
      position: num(r.position),
    })),
    transactions: raw.transactions.map((r) => ({
      id: String(r.id), merchant: String(r.merchant), amount: num(r.amount), date: iso(String(r.date)),
      pocket_id: (r.pocket_id as string) ?? null, note: (r.note as string) ?? null, goal_id: (r.goal_id as string) ?? null,
      needs_review: !!r.needs_review, source: (r.source as string) ?? null,
    })),
    goals: raw.goals.map((r) => ({
      id: String(r.id), name: String(r.name), target: num(r.target), monthly: num(r.monthly), auto_save: !!r.auto_save,
      last_auto_save: (r.last_auto_save as string) ?? null, target_date: iso(String(r.target_date)), icon: String(r.icon),
      tint: String(r.tint), art: (r.art as string) ?? null, flag: (r.flag as string) ?? null, position: num(r.position),
    })),
    contributions: raw.contributions.map((r) => ({
      id: String(r.id), goal_id: String(r.goal_id), label: String(r.label), amount: num(r.amount), date: iso(String(r.date)),
    })),
    bills: raw.bills.map((r) => ({
      id: String(r.id), name: String(r.name), amount: num(r.amount), due_date: iso(String(r.due_date)), recurring: !!r.recurring,
      icon: String(r.icon), tint: String(r.tint), pocket_id: (r.pocket_id as string) ?? null,
    })),
  };
}

export function fromRows(rows: Rows): AppState {
  const base = initialState();
  const byGoal = new Map<string, Contribution[]>();
  for (const c of rows.contributions) {
    byGoal.set(c.goal_id, [...(byGoal.get(c.goal_id) ?? []), { id: c.id, label: c.label, amount: c.amount, date: c.date }]);
  }
  const sortDesc = <T extends { date: string }>(xs: T[]) => xs.sort((a, b) => b.date.localeCompare(a.date));
  const p = rows.profile;
  return {
    ...base,
    name: p.name,
    income: p.income,
    payday: p.payday,
    trackingMethods: p.tracking_methods as AppState['trackingMethods'],
    rules: p.rules,
    reminders: p.reminders,
    setupDismissed: p.setup_dismissed,
    onboarded: p.onboarded,
    pockets: [...rows.pockets].sort((a, b) => a.position - b.position).map(
      (r): Pocket => ({ id: r.id, name: r.name, icon: r.icon as Pocket['icon'], tint: r.tint as Pocket['tint'], budget: r.budget, ...(r.fixed ? { fixed: true } : {}) }),
    ),
    transactions: sortDesc(
      rows.transactions.map((r): Transaction => ({
        id: r.id, merchant: r.merchant, amount: r.amount, date: r.date,
        ...(r.pocket_id ? { pocketId: r.pocket_id } : {}), ...(r.note ? { note: r.note } : {}), ...(r.goal_id ? { goalId: r.goal_id } : {}),
        ...(r.needs_review ? { needsReview: true } : {}), ...(r.source ? { source: r.source as Transaction['source'] } : {}),
      })),
    ),
    goals: [...rows.goals].sort((a, b) => a.position - b.position).map((r): Goal => ({
      id: r.id, name: r.name, target: r.target, monthly: r.monthly, targetDate: r.target_date, icon: r.icon as Goal['icon'],
      tint: r.tint as Goal['tint'], ...(r.auto_save ? { autoSave: true } : {}), ...(r.last_auto_save ? { lastAutoSave: r.last_auto_save } : {}),
      ...(r.art ? { art: r.art as Goal['art'] } : {}), ...(r.flag ? { flag: r.flag } : {}),
      contributions: sortDesc(byGoal.get(r.id) ?? []),
    })),
    bills: rows.bills.map((r): Bill => ({
      id: r.id, name: r.name, amount: r.amount, dueDate: r.due_date, recurring: r.recurring, icon: r.icon as Bill['icon'],
      tint: r.tint as Bill['tint'], ...(r.pocket_id ? { pocketId: r.pocket_id } : {}),
    })),
  };
}

export type Changes = {
  profile: ProfileRow | null;
  upserts: { [T in Table]: Rows[T] };
  deletes: { [T in Table]: string[] };
};

/** What must be written to the server to turn `prev` (last synced) into `next` (current local). */
export function diffRows(prev: Rows | null, next: Rows): Changes {
  const changes: Changes = {
    profile: !prev || JSON.stringify(prev.profile) !== JSON.stringify(next.profile) ? next.profile : null,
    upserts: { pockets: [], transactions: [], goals: [], contributions: [], bills: [] },
    deletes: { pockets: [], transactions: [], goals: [], contributions: [], bills: [] },
  };
  for (const table of TABLES) {
    const before = new Map<string, string>((prev?.[table] ?? []).map((r) => [r.id, JSON.stringify(r)]));
    const nextIds = new Set<string>();
    for (const row of next[table]) {
      nextIds.add(row.id);
      if (before.get(row.id) !== JSON.stringify(row)) (changes.upserts[table] as { id: string }[]).push(row);
    }
    for (const id of before.keys()) if (!nextIds.has(id)) changes.deletes[table].push(id);
  }
  return changes;
}

export function isEmpty(c: Changes): boolean {
  return !c.profile && TABLES.every((t) => c.upserts[t].length === 0 && c.deletes[t].length === 0);
}
