import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import type { TintName } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export type TrackingMethod = 'notifications' | 'quick-add' | 'statement' | 'manual';

export type Pocket = {
  id: string;
  name: string;
  icon: IconName;
  tint: TintName;
  budget: number;
  /** Fixed costs (rent, utilities). Excluded from the daily "safe to spend" number. */
  fixed?: boolean;
};

export type TransactionSource = 'manual' | 'sms' | 'statement' | 'bill' | 'sample';

export type Transaction = {
  id: string;
  merchant: string;
  /** Negative for money out, positive for money in. */
  amount: number;
  /** ISO timestamp. */
  date: string;
  pocketId?: string;
  /** Secondary label, e.g. "Groceries", "Income". */
  note?: string;
  goalId?: string;
  needsReview?: boolean;
  source?: TransactionSource;
};

export type Contribution = {
  id: string;
  label: string;
  /** Negative for withdrawals. */
  amount: number;
  date: string;
};

export type Goal = {
  id: string;
  name: string;
  target: number;
  /** Planned monthly contribution. */
  monthly: number;
  /** Move `monthly` into the goal automatically on payday. */
  autoSave?: boolean;
  /** "YYYY-MM" of the last automatic contribution. */
  lastAutoSave?: string;
  targetDate: string;
  icon: IconName;
  tint: TintName;
  /** Optional illustrated hero. */
  art?: 'japan';
  flag?: string;
  contributions: Contribution[];
};

export type Bill = {
  id: string;
  name: string;
  amount: number;
  /** Next due date (ISO). Recurring bills roll forward a month when paid. */
  dueDate: string;
  recurring: boolean;
  icon: IconName;
  tint: TintName;
  pocketId?: string;
};

export type Reminders = {
  /** Evening nudge to log the day's spending. */
  daily: boolean;
  /** Heads-up the day before a bill is due. */
  bills: boolean;
  hour: number;
};

export type AppState = {
  version: 2;
  onboarded: boolean;
  name: string;
  income: number;
  /** Day of month salary arrives (1–28). Auto-saves run on this day. */
  payday: number;
  trackingMethods: TrackingMethod[];
  pockets: Pocket[];
  transactions: Transaction[];
  goals: Goal[];
  bills: Bill[];
  /** merchantKey → pocketId, learned when the user categorises. */
  rules: Record<string, string>;
  reminders: Reminders;
  /** User hid the "Get set up" checklist on Today. */
  setupDismissed?: boolean;
};
