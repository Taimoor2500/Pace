import { classifyCharge, isTax, taxYearRange, type ChargeKind } from '@/lib/charges';
import { addDays, addMonths, daysInMonth, isSameDay, isSameMonth, monthsBetween, startOfDay } from '@/lib/format';
import type { AppState, Goal, Pocket, Transaction } from './types';

export function txDate(t: Transaction): Date {
  return new Date(t.date);
}

export function monthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** For the current month: today's day number. For a past month: its last day. Future: 0. */
export function elapsedDays(month: Date, now = new Date()): number {
  if (isSameMonth(month, now)) return now.getDate();
  return month < now ? daysInMonth(month) : 0;
}

function fixedIds(state: AppState): Set<string> {
  return new Set(state.pockets.filter((p) => p.fixed).map((p) => p.id));
}

export function expensesIn(state: AppState, month: Date): Transaction[] {
  return state.transactions.filter((t) => t.amount < 0 && isSameMonth(txDate(t), month));
}

export function incomeIn(state: AppState, month: Date): Transaction[] {
  return state.transactions.filter((t) => t.amount > 0 && isSameMonth(txDate(t), month));
}

export function pocketSpent(state: AppState, pocketId: string, month = new Date()): number {
  return expensesIn(state, month)
    .filter((t) => t.pocketId === pocketId)
    .reduce((sum, t) => sum - t.amount, 0);
}

export type PocketStatus = Pocket & { spent: number; left: number; used: number };

export function pocketStatuses(state: AppState, month = new Date()): PocketStatus[] {
  return state.pockets.map((p) => {
    const spent = pocketSpent(state, p.id, month);
    return { ...p, spent, left: p.budget - spent, used: p.budget > 0 ? spent / p.budget : spent > 0 ? 1 : 0 };
  });
}

export function totalBudget(state: AppState): number {
  return state.pockets.reduce((s, p) => s + p.budget, 0);
}

export function totalSpent(state: AppState, month = new Date(), upToDay?: number): number {
  return expensesIn(state, month)
    .filter((t) => upToDay === undefined || txDate(t).getDate() <= upToDay)
    .reduce((s, t) => s - t.amount, 0);
}

export function nextPayday(state: AppState, now = new Date()): Date {
  const day = Math.min(state.payday, 28);
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), day);
  return startOfDay(now) < thisMonth ? thisMonth : new Date(now.getFullYear(), now.getMonth() + 1, day);
}

/** Pace vs plan for a month: positive `ahead` means spent less than the pro-rata budget. */
export function pace(state: AppState, month: Date, now = new Date()) {
  const dim = daysInMonth(month);
  const elapsed = elapsedDays(month, now);
  const budget = totalBudget(state);
  const spent = totalSpent(state, month);
  const expected = (budget * elapsed) / dim;
  return { ahead: Math.round((expected - spent) / 100) * 100, spent, budget };
}

/** How much of the flexible budget can be spent per day until month end, plus pace vs. plan. */
export function today(state: AppState, now = new Date()) {
  const dim = daysInMonth(now);
  const day = now.getDate();
  const daysLeft = dim - day + 1;
  const fixed = fixedIds(state);
  const statuses = pocketStatuses(state, now);
  const flexibleLeft = statuses.filter((p) => !fixed.has(p.id)).reduce((s, p) => s + Math.max(0, p.left), 0);
  const spentToday = expensesIn(state, now)
    .filter((t) => isSameDay(txDate(t), now) && !fixed.has(t.pocketId ?? ''))
    .reduce((s, t) => s - t.amount, 0);
  // Bills are paid from fixed pockets, so only flexible pockets feed the daily allowance.
  // Today's own spend is added back so the number means "what's left of today's allowance".
  const safeTotal = flexibleLeft + spentToday;
  const safeToday = Math.max(0, Math.round(safeTotal / daysLeft / 50) * 50 - spentToday);
  const payday = nextPayday(state, now);
  const prevPayday = addMonths(payday, -1);
  const cycle = payday.getTime() - prevPayday.getTime();
  const progress = Math.min(1, Math.max(0, (now.getTime() - prevPayday.getTime()) / cycle));
  return { safeToday, spentToday, ahead: pace(state, now, now).ahead, progress, payday, daysLeft };
}

/** Change in a pocket's spend over the last 7 days vs the average week of last month. */
export function weeklyChange(state: AppState, pocketId: string, now = new Date()) {
  const weekAgo = addDays(startOfDay(now), -6);
  const thisWeek = state.transactions
    .filter((t) => t.amount < 0 && t.pocketId === pocketId && txDate(t) >= weekAgo)
    .reduce((s, t) => s - t.amount, 0);
  const lastMonth = addMonths(monthStart(now), -1);
  const avgWeek = (pocketSpent(state, pocketId, lastMonth) / daysInMonth(lastMonth)) * 7;
  if (avgWeek === 0 || thisWeek === 0) return { pct: 0, saved: 0, hasData: false };
  return {
    pct: Math.round(((avgWeek - thisWeek) / avgWeek) * 100),
    saved: Math.round((avgWeek - thisWeek) / 100) * 100,
    hasData: true,
  };
}

/** Daily spend for the given month, indexed by day-1. */
export function dailySpend(state: AppState, month: Date, pocketId?: string): number[] {
  const out = new Array(daysInMonth(month)).fill(0);
  for (const t of expensesIn(state, month)) {
    if (pocketId && t.pocketId !== pocketId) continue;
    out[txDate(t).getDate() - 1] -= t.amount;
  }
  return out;
}

/** Weekly totals for `weeks` weeks ending at `end`, oldest first. */
export function weeklyTrend(state: AppState, weeks = 14, end = new Date()) {
  const last = startOfDay(end);
  const buckets = Array.from({ length: weeks }, (_, i) => ({ start: addDays(last, -7 * (weeks - i) + 1), total: 0 }));
  for (const t of state.transactions) {
    if (t.amount >= 0) continue;
    const idx = weeks - 1 - Math.floor((last.getTime() - startOfDay(txDate(t)).getTime()) / (7 * 86_400_000));
    if (idx >= 0 && idx < weeks && txDate(t) <= addDays(last, 1)) buckets[idx].total -= t.amount;
  }
  return buckets;
}

export function goalSaved(goal: Goal): number {
  return goal.contributions.reduce((s, c) => s + c.amount, 0);
}

export function goalProjection(goal: Goal, now = new Date()) {
  const saved = goalSaved(goal);
  const remaining = Math.max(0, goal.target - saved);
  const months = goal.monthly > 0 ? Math.ceil(remaining / goal.monthly) : Infinity;
  const ready = remaining === 0 ? now : Number.isFinite(months) ? addMonths(now, months) : null;
  const target = new Date(goal.targetDate);
  return { saved, remaining, months, ready, onTrack: ready !== null && ready <= target, monthsToTarget: monthsBetween(now, target) };
}

/** Insight metrics for a month (the current month is measured up to today). */
export function insights(state: AppState, month: Date, now = new Date()) {
  const elapsed = Math.max(1, elapsedDays(month, now));
  const dim = daysInMonth(month);
  const fixed = fixedIds(state);
  const daily = dailySpend(state, month);
  const dailyBudget = totalBudget(state) / dim;
  const lastMonth = addMonths(monthStart(month), -1);
  const hasActivity = state.transactions.some((t) => isSameMonth(txDate(t), month));

  const pastDays = daily.slice(0, elapsed);
  const wins = hasActivity ? pastDays.filter((v) => v <= dailyBudget).length : 0;
  let streak = 0;
  if (hasActivity) for (let i = elapsed - 1; i >= 0 && daily[i] <= dailyBudget; i--) streak++;

  const flexibleByDay = new Array(dim).fill(0);
  for (const t of expensesIn(state, month)) if (!fixed.has(t.pocketId ?? '')) flexibleByDay[txDate(t).getDate() - 1]++;
  const noSpend = hasActivity ? flexibleByDay.slice(0, elapsed).filter((n) => n === 0).length : 0;

  // Month-to-date pace projected to a full month, compared with last month's total.
  const projected = (v: number) => (v / elapsed) * dim;
  const foodIds = state.pockets.filter((p) => p.id === 'food' || /food|dining|eat/i.test(p.name)).map((p) => p.id);
  const foodSpend = (m: Date) => foodIds.reduce((s, id) => s + pocketSpent(state, id, m), 0);
  const diningThen = foodSpend(lastMonth);
  const diningChange = diningThen > 0 ? Math.round(((diningThen - projected(foodSpend(month))) / diningThen) * 100) : null;

  const income = incomeIn(state, month).reduce((s, t) => s + t.amount, 0);
  const spent = totalSpent(state, month);
  const lastTotal = totalSpent(state, lastMonth);
  const vsLast = lastTotal > 0 ? Math.round(((projected(spent) - lastTotal) / lastTotal) * 100) : null;

  return { wins, streak, noSpend, diningChange, ahead: pace(state, month, now).ahead, net: income - spent, vsLast, hasActivity };
}

/** Summary of a completed month for the Monthly Review. */
export function monthlyReview(state: AppState, month: Date) {
  const prev = addMonths(monthStart(month), -1);
  const spent = totalSpent(state, month);
  const prevSpent = totalSpent(state, prev);
  const planned = totalBudget(state);
  const saved = planned - spent;

  const byPocket = pocketStatuses(state, month).filter((p) => p.spent > 0).sort((a, b) => b.spent - a.spent);
  const top = byPocket[0];
  const topPrev = top ? pocketSpent(state, top.id, prev) : 0;

  const contributions = state.goals.flatMap((g) =>
    g.contributions.filter((c) => c.amount > 0 && isSameMonth(new Date(c.date), month)).map((c) => ({ ...c, goalId: g.id })),
  );
  const daily = dailySpend(state, month);
  const dailyBudget = planned / daily.length;
  let best = 0;
  let run = 0;
  for (const v of daily) {
    run = v <= dailyBudget ? run + 1 : 0;
    best = Math.max(best, run);
  }

  return {
    month,
    spent,
    planned,
    saved,
    hasData: state.transactions.some((t) => isSameMonth(txDate(t), month)),
    changeVsPrev: prevSpent > 0 ? Math.round(((spent - prevSpent) / prevSpent) * 100) : null,
    top,
    topChange: topPrev > 0 && top ? Math.round(((top.spent - topPrev) / topPrev) * 100) : null,
    goalTotal: contributions.reduce((s, c) => s + c.amount, 0),
    goalsFunded: new Set(contributions.map((c) => c.goalId)).size,
    bestStreak: best,
  };
}

export type TaxItem = Transaction & { kind: ChargeKind };

/**
 * Taxes, zakat and bank fees for a Pakistani tax year (1 Jul – 30 Jun). Detected from the description, so it
 * doesn't matter which pocket a line was filed in. Money in (refunds, reversals) reduces the totals.
 */
export function taxSummary(state: AppState, taxYear: number) {
  const { start, end } = taxYearRange(taxYear);
  const items: TaxItem[] = [];
  for (const t of state.transactions) {
    const d = txDate(t);
    if (d < start || d >= end) continue;
    const kind = classifyCharge(`${t.merchant} ${t.note ?? ''}`);
    if (kind) items.push({ ...t, kind });
  }
  const byKind: Record<ChargeKind, number> = { wht: 0, excise: 0, 'other-tax': 0, zakat: 0, fee: 0 };
  const months = Array.from({ length: 12 }, (_, i) => ({ month: new Date(taxYear - 1, 6 + i, 1), tax: 0, other: 0 }));
  for (const t of items) {
    const paid = -t.amount;
    byKind[t.kind] += paid;
    const d = txDate(t);
    const idx = (d.getFullYear() - (taxYear - 1)) * 12 + d.getMonth() - 6;
    if (isTax(t.kind)) months[idx].tax += paid;
    else months[idx].other += paid;
  }
  return {
    taxYear,
    start,
    end,
    items: items.sort((a, b) => b.date.localeCompare(a.date)),
    byKind,
    taxTotal: byKind.wht + byKind.excise + byKind['other-tax'],
    months,
  };
}
