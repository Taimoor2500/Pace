import { addDays, addMonths, daysInMonth, startOfDay } from '@/lib/format';
import { uid } from './ids';
import { monthKey } from './recurring';
import type { AppState, Bill, Goal, Pocket, Transaction } from './types';

/** Share of monthly income recommended for each pocket. Remainder is savings. */
export const POCKET_TEMPLATES: (Omit<Pocket, 'budget'> & { share: number })[] = [
  { id: 'essentials', name: 'Essentials', icon: 'home', tint: 'green', share: 0.4, fixed: true },
  { id: 'food', name: 'Food & Dining', icon: 'cafe', tint: 'red', share: 0.1334 },
  { id: 'transport', name: 'Transport', icon: 'car', tint: 'blue', share: 0.0667 },
  { id: 'shopping', name: 'Shopping', icon: 'bag-handle', tint: 'purple', share: 0.1 },
  { id: 'fun', name: 'Fun', icon: 'game-controller', tint: 'pink', share: 0.0667 },
  { id: 'travel', name: 'Travel', icon: 'airplane', tint: 'amber', share: 0.0667 },
];

export function recommendedPockets(income: number): Pocket[] {
  return POCKET_TEMPLATES.map(({ share, ...p }) => ({
    ...p,
    budget: Math.round((income * share) / 1000) * 1000,
  }));
}

const MERCHANTS: Record<string, { name: string; note: string; min: number; max: number }[]> = {
  essentials: [
    { name: 'Carrefour', note: 'Groceries', min: 2500, max: 7000 },
    { name: 'Imtiaz', note: 'Groceries', min: 2000, max: 6500 },
    { name: 'Naheed', note: 'Groceries', min: 1500, max: 5000 },
    { name: 'Pharmacy', note: 'Health', min: 600, max: 2500 },
  ],
  food: [
    { name: 'Starbucks', note: 'Coffee', min: 450, max: 950 },
    { name: 'KFC', note: 'Fast food', min: 900, max: 1800 },
    { name: 'Cafe Aylanto', note: 'Dining', min: 2000, max: 4500 },
    { name: 'Kababjees', note: 'Dining', min: 1500, max: 3200 },
    { name: 'Foodpanda', note: 'Delivery', min: 900, max: 2400 },
  ],
  transport: [
    { name: 'Uber', note: 'Ride', min: 500, max: 1500 },
    { name: 'Careem', note: 'Ride', min: 450, max: 1300 },
    { name: 'PSO', note: 'Fuel', min: 3000, max: 6000 },
  ],
  shopping: [
    { name: 'Daraz', note: 'Online', min: 1200, max: 5000 },
    { name: 'Khaadi', note: 'Clothing', min: 2500, max: 7000 },
    { name: 'Outfitters', note: 'Clothing', min: 2000, max: 6000 },
  ],
  fun: [
    { name: 'Cinepax', note: 'Movies', min: 1200, max: 2800 },
    { name: 'Steam', note: 'Games', min: 800, max: 3500 },
  ],
  travel: [{ name: 'Daewoo Express', note: 'Bus', min: 2500, max: 6000 }],
};

/** Deterministic PRNG so the sample history is stable between launches. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export { uid };

function at(day: Date, h: number, m: number): string {
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

/** Hand-written recent activity so "Today" looks lived-in. [daysAgo, h, m, merchant, amount, pocket, note] */
const RECENT: [number, number, number, string, number, string, string][] = [
  [0, 9, 14, 'Starbucks', -550, 'food', 'Food & Dining'],
  [0, 8, 32, 'Uber', -1200, 'transport', 'Transport'],
  [0, 12, 14, 'Carrefour', -4350, 'essentials', 'Groceries'],
  [1, 9, 14, 'Spotify', -1200, 'fun', 'Subscriptions'],
  [1, 19, 40, 'KFC', -1250, 'food', 'Food & Dining'],
  [2, 13, 5, 'Cafe Aylanto', -2300, 'food', 'Food & Dining'],
  [2, 21, 10, 'Daraz', -3600, 'shopping', 'Online'],
  [3, 8, 50, 'Careem', -850, 'transport', 'Transport'],
  [3, 18, 20, 'Imtiaz', -6200, 'essentials', 'Groceries'],
  [4, 11, 0, 'K-Electric', -9500, 'essentials', 'Utilities'],
  [4, 20, 30, 'Kababjees', -2100, 'food', 'Food & Dining'],
  [4, 22, 0, 'Cinepax', -2400, 'fun', 'Movies'],
  [5, 16, 45, 'Khaadi', -4000, 'shopping', 'Clothing'],
  [5, 9, 5, 'PSO', -5000, 'transport', 'Fuel'],
  [6, 17, 30, 'Naheed', -5800, 'essentials', 'Groceries'],
  [6, 20, 15, 'Foodpanda', -1850, 'food', 'Delivery'],
];

function buildTransactions(now: Date, pockets: Pocket[], income: number): Transaction[] {
  const today = startOfDay(now);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const txs: Transaction[] = [];
  const pocketIds = new Set(pockets.map((p) => p.id));

  // Current month: curated recent activity.
  for (const [ago, h, m, merchant, amount, pocketId, note] of RECENT) {
    const day = addDays(today, -ago);
    if (day < monthStart || !pocketIds.has(pocketId)) continue;
    txs.push({ id: uid('tx'), merchant, amount, date: at(day, h, m), pocketId, note });
  }
  txs.push({ id: uid('tx'), merchant: 'Salary', amount: income, date: at(monthStart, 9, 0), note: 'Income' });
  if (today.getDate() > 1) {
    txs.push({
      id: uid('tx'), merchant: 'Meezan Transfer', amount: 50000,
      date: at(addDays(today, -1), 14, 12), note: 'Income', needsReview: true,
    });
  }
  txs.push({
    id: uid('tx'), merchant: 'Unknown — POS 4471', amount: -1800,
    date: at(today.getDate() > 2 ? addDays(today, -2) : today, 15, 40), needsReview: true, note: 'Uncategorised',
  });

  // Previous three months: procedural history (for trends + monthly review).
  // Each pocket is filled up to a target share of its budget so totals stay realistic.
  const rand = mulberry32(20261007);
  const usage: Record<string, number> = { essentials: 0.95, food: 1.15, transport: 0.9, shopping: 0.85, fun: 1, travel: 0.3 };
  for (let back = 1; back <= 3; back++) {
    const month = addMonths(monthStart, -back);
    const days = daysInMonth(month);
    txs.push({ id: uid('tx'), merchant: 'Salary', amount: income, date: at(month, 9, 0), note: 'Income' });
    for (const pocket of pockets) {
      const list = MERCHANTS[pocket.id] ?? MERCHANTS.shopping;
      let remaining = pocket.budget * (usage[pocket.id] ?? 0.9) * (1 + back * 0.03);
      while (remaining > 400) {
        const merchant = list[Math.floor(rand() * list.length)];
        const amount = Math.min(remaining, Math.round((merchant.min + rand() * (merchant.max - merchant.min)) / 50) * 50);
        remaining -= amount;
        txs.push({
          id: uid('tx'), merchant: merchant.name, amount: -amount,
          date: at(addDays(month, Math.floor(rand() * days)), 8 + Math.floor(rand() * 13), Math.floor(rand() * 60)),
          pocketId: pocket.id, note: merchant.note,
        });
      }
    }
  }
  return txs.map((t) => ({ ...t, source: 'sample' as const })).sort((a, b) => b.date.localeCompare(a.date));
}

function buildGoals(now: Date): Goal[] {
  const today = startOfDay(now);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const japanContribs = [
    { label: 'Salary Contribution', amount: 25000, date: monthStart },
    { label: 'Manual Add', amount: 10000, date: addDays(addMonths(monthStart, -1), 20) },
    { label: 'Salary Contribution', amount: 25000, date: addMonths(monthStart, -1) },
    { label: 'Salary Contribution', amount: 25000, date: addMonths(monthStart, -2) },
    { label: 'Opening balance', amount: 99000, date: addMonths(monthStart, -3) },
  ];
  return [
    {
      id: uid('goal'), name: 'Japan Trip', target: 400000, monthly: 25000, autoSave: true, lastAutoSave: monthKey(today),
      targetDate: addMonths(today, 19).toISOString(), icon: 'airplane', tint: 'pink', art: 'japan', flag: '🇯🇵',
      contributions: japanContribs.map((c) => ({ id: uid('c'), ...c, date: at(c.date, 10, 0) })),
    },
    {
      id: uid('goal'), name: 'Emergency Fund', target: 300000, monthly: 15000,
      targetDate: addMonths(today, 12).toISOString(), icon: 'umbrella', tint: 'amber',
      contributions: [{ id: uid('c'), label: 'Opening balance', amount: 120000, date: at(addMonths(monthStart, -2), 10, 0) }],
    },
    {
      id: uid('goal'), name: 'New Car', target: 2000000, monthly: 40000,
      targetDate: addMonths(today, 36).toISOString(), icon: 'car-sport', tint: 'red',
      contributions: [{ id: uid('c'), label: 'Opening balance', amount: 250000, date: at(addMonths(monthStart, -3), 10, 0) }],
    },
    {
      id: uid('goal'), name: 'Home Down Payment', target: 5000000, monthly: 0,
      targetDate: addMonths(today, 60).toISOString(), icon: 'home', tint: 'purple', contributions: [],
    },
  ];
}

function buildBills(now: Date): Bill[] {
  const today = startOfDay(now);
  return [
    { id: uid('bill'), name: 'Netflix', amount: 1200, dueDate: addDays(today, 1).toISOString(), recurring: true, icon: 'tv', tint: 'red', pocketId: 'fun' },
    { id: uid('bill'), name: 'Jazz Postpaid', amount: 4200, dueDate: addDays(today, 3).toISOString(), recurring: true, icon: 'phone-portrait', tint: 'amber', pocketId: 'essentials' },
    { id: uid('bill'), name: 'Meezan Credit Card', amount: 25000, dueDate: addDays(today, 5).toISOString(), recurring: true, icon: 'card', tint: 'purple', pocketId: 'essentials' },
    { id: uid('bill'), name: 'StormFiber', amount: 3500, dueDate: addDays(today, 11).toISOString(), recurring: true, icon: 'wifi', tint: 'blue', pocketId: 'essentials' },
  ];
}

export const DEFAULT_INCOME = 300000;

export function initialState(): AppState {
  return {
    version: 2,
    onboarded: false,
    name: '',
    income: DEFAULT_INCOME,
    payday: 1,
    trackingMethods: ['quick-add'],
    pockets: recommendedPockets(DEFAULT_INCOME),
    transactions: [],
    goals: [],
    bills: [],
    rules: {},
    reminders: { daily: false, bills: false, hour: 21 },
  };
}

/** A lived-in sample account, for exploring the app (Settings → Load sample data). */
export function sampleData(pockets: Pocket[], income: number, now = new Date()) {
  return {
    transactions: buildTransactions(now, pockets, income),
    goals: buildGoals(now),
    bills: buildBills(now),
  };
}
