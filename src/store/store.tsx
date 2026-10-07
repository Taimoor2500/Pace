import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState as RNAppState } from 'react-native';
import { guessPocket, isLearnable, merchantKey } from '@/lib/categorize';
import { classifyCharge } from '@/lib/charges';
import { addMonths, isSameDay } from '@/lib/format';
import type { ParsedTransaction } from '@/lib/sms-parser';
import { supabaseConfigured } from '@/lib/supabase';
import { diffRows, fromRows, isEmpty, toRows, type Rows } from '@/sync/mapping';
import { pullAll, pushChanges } from '@/sync/remote';
import { uid } from './ids';
import { applyRecurring, monthKey } from './recurring';
import { migrate } from './migrate';
import { initialState, sampleData } from './seed';
import type { AppState, Bill, Goal, Pocket, Reminders, TrackingMethod, Transaction, TransactionSource } from './types';

/** Pre-account, device-only storage keys. */
const LEGACY_STORAGE_KEY = 'pace:state:v2';
const LEGACY_KEY = 'pace:state:v1';

export type ImportResult = { added: number; duplicates: number; needsReview: number };

type OnboardingInput = { name: string; income: number; payday: number; pockets: Pocket[]; sample: boolean };

type Actions = {
  setTrackingMethods: (methods: TrackingMethod[]) => void;
  setIncome: (income: number) => void;
  completeOnboarding: (input: OnboardingInput) => void;
  updateProfile: (patch: Partial<Pick<AppState, 'name' | 'income' | 'payday' | 'trackingMethods' | 'setupDismissed'>>) => void;

  addTransaction: (tx: Omit<Transaction, 'id'>) => string;
  updateTransaction: (id: string, patch: Partial<Omit<Transaction, 'id'>>) => void;
  deleteTransaction: (id: string) => void;
  categorise: (txId: string, pocketId: string) => void;
  importTransactions: (items: ParsedTransaction[], source: TransactionSource) => ImportResult;

  addPocket: (pocket: Omit<Pocket, 'id'>) => string;
  updatePocket: (id: string, patch: Partial<Omit<Pocket, 'id'>>) => void;
  deletePocket: (id: string) => void;
  setPocketBudget: (pocketId: string, budget: number) => void;
  moveBudget: (fromId: string, toId: string, amount: number) => void;

  addGoal: (goal: Omit<Goal, 'id' | 'contributions'>) => string;
  updateGoal: (goalId: string, patch: Partial<Omit<Goal, 'id' | 'contributions'>>) => void;
  deleteGoal: (goalId: string) => void;
  addToGoal: (goalId: string, amount: number, label?: string) => void;

  addBill: (bill: Omit<Bill, 'id'>) => string;
  updateBill: (id: string, patch: Partial<Omit<Bill, 'id'>>) => void;
  deleteBill: (id: string) => void;
  payBill: (billId: string) => void;

  /** Files unreviewed taxes / bank fees into the fixed-costs pocket (they used to land in Needs review). */
  fileCharges: () => void;
  setReminders: (patch: Partial<Reminders>) => void;
  loadSampleData: () => void;
  reset: () => void;
};

export type SyncStatus = {
  /** `needs-network`: first launch on this device and the account couldn't be downloaded yet. */
  phase: 'idle' | 'syncing' | 'offline' | 'error' | 'needs-network';
  lastSyncedAt: number | null;
  error?: string;
};

type Store = { state: AppState; hydrated: boolean; sync: SyncStatus; syncNow: () => Promise<void> } & Actions;

const StoreContext = createContext<Store | null>(null);

const byDateDesc = (a: Transaction, b: Transaction) => b.date.localeCompare(a.date);

const cacheKey = (userId: string) => `pace:cache:v1:${userId}`;
type Cache = { state: AppState; synced: Rows | null; lastSyncedAt: number | null };

/** Removes this user's offline copy from the device (on sign-out / account deletion). */
export async function clearLocalCache(userId: string) {
  await AsyncStorage.removeItem(cacheKey(userId)).catch(() => {});
}

const isNetworkError = (e: unknown) => /network|fetch|timed? ?out|offline/i.test(String((e as Error)?.message ?? e));

/**
 * `userId` null = signed out: an empty, local-only store so screens that are still mounted during the
 * sign-out transition render harmlessly until the router moves to /sign-in.
 */
export function StoreProvider({ children, userId, suggestedName }: { children: ReactNode; userId: string | null; suggestedName?: string }) {
  const [state, setState] = useState<AppState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const [sync, setSync] = useState<SyncStatus>({ phase: 'idle', lastSyncedAt: null });
  const stateRef = useRef(state);
  stateRef.current = state;
  /** Snapshot of what the server holds, as of the last successful sync. null = never synced on this device. */
  const syncedRef = useRef<Rows | null>(null);
  const lastSyncedRef = useRef<number | null>(null);
  const busy = useRef(false);
  const again = useRef(false);

  const persist = useCallback((s: AppState) => {
    if (!userId) return;
    const cache: Cache = { state: s, synced: syncedRef.current, lastSyncedAt: lastSyncedRef.current };
    AsyncStorage.setItem(cacheKey(userId), JSON.stringify(cache)).catch(() => {});
  }, [userId]);

  /** Push local changes, then (optionally) pull the server copy. Safe to call repeatedly. */
  const runSync = useCallback(async (pull: boolean) => {
    if (!supabaseConfigured || !userId) return;
    if (busy.current) { again.current = true; return; }
    busy.current = true;
    setSync((s) => ({ ...s, phase: 'syncing', error: undefined }));
    try {
      if (syncedRef.current === null) {
        // First sync on this device: the server is the source of truth if the account already has data.
        const remote = await pullAll(userId);
        if (remote) {
          syncedRef.current = remote;
          setState(applyRecurring(fromRows(remote)));
        } else {
          // Brand-new account: upload whatever is on the device (pre-account data, or a fresh start).
          const local = stateRef.current;
          const rows = toRows(local);
          await pushChanges(userId, diffRows(null, rows));
          syncedRef.current = rows;
        }
      } else {
        const snapshot = stateRef.current;
        const rows = toRows(snapshot);
        const changes = diffRows(syncedRef.current, rows);
        if (!isEmpty(changes)) await pushChanges(userId, changes);
        syncedRef.current = rows;
        if (pull) {
          const remote = await pullAll(userId);
          // Only adopt the server copy if nothing changed locally while we were downloading.
          if (remote && stateRef.current === snapshot) {
            syncedRef.current = remote;
            const merged = applyRecurring(fromRows(remote));
            if (!isEmpty(diffRows(toRows(snapshot), toRows(merged)))) setState(merged);
          }
        }
      }
      lastSyncedRef.current = Date.now();
      setSync({ phase: 'idle', lastSyncedAt: lastSyncedRef.current });
      persist(stateRef.current);
    } catch (e) {
      setSync((s) => ({
        ...s,
        phase: syncedRef.current === null && !hydratedRef.current ? 'needs-network' : isNetworkError(e) ? 'offline' : 'error',
        error: String((e as Error)?.message ?? e),
      }));
    } finally {
      busy.current = false;
      if (!hydratedRef.current && syncedRef.current !== null) setHydrated(true);
      if (again.current) {
        again.current = false;
        runSync(false);
      }
    }
  }, [userId, persist]);

  const hydratedRef = useRef(false);
  hydratedRef.current = hydrated;

  // Load the offline copy, then sync with the server.
  useEffect(() => {
    if (!userId) {
      setHydrated(true);
      return;
    }
    let cancelled = false;
    (async () => {
      let cache: Cache | null = null;
      try {
        const raw = await AsyncStorage.getItem(cacheKey(userId));
        if (raw) cache = JSON.parse(raw) as Cache;
      } catch {}
      if (cancelled) return;
      if (cache) {
        const loaded = migrate(cache.state);
        if (loaded) {
          syncedRef.current = cache.synced;
          lastSyncedRef.current = cache.lastSyncedAt;
          setState(applyRecurring(loaded));
          setSync({ phase: 'idle', lastSyncedAt: cache.lastSyncedAt });
          setHydrated(true);
        }
      } else {
        // Data saved before accounts existed is adopted by the first account that signs in on this device.
        try {
          const legacy = (await AsyncStorage.getItem(LEGACY_STORAGE_KEY)) ?? (await AsyncStorage.getItem(LEGACY_KEY));
          const migrated = legacy ? migrate(JSON.parse(legacy)) : null;
          const start = migrated ?? initialState();
          if (!start.name && suggestedName) start.name = suggestedName;
          stateRef.current = start;
          setState(start);
        } catch {}
      }
      if (!cancelled) {
        await runSync(true);
        if (!cache) {
          AsyncStorage.multiRemove([LEGACY_STORAGE_KEY, LEGACY_KEY]).catch(() => {});
        }
      }
    })();
    return () => { cancelled = true; };
  }, [userId, runSync, suggestedName]);

  // Save locally on every change; push to the server shortly after (batched).
  useEffect(() => {
    if (!hydrated) return;
    persist(state);
    const t = setTimeout(() => runSync(false), 1000);
    return () => clearTimeout(t);
  }, [state, hydrated, persist, runSync]);

  // On returning to the app: run payday automation and pull changes made on other devices.
  useEffect(() => {
    const sub = RNAppState.addEventListener('change', (s) => {
      if (s !== 'active') return;
      setState((prev) => applyRecurring(prev));
      if (hydratedRef.current) runSync(true);
    });
    return () => sub.remove();
  }, [runSync]);

  const update = useCallback((fn: (s: AppState) => AppState) => setState(fn), []);

  const actions = useMemo<Actions>(() => {
    const learn = (s: AppState, merchant: string, pocketId: string): AppState['rules'] => {
      if (!isLearnable(merchant)) return s.rules;
      return { ...s.rules, [merchantKey(merchant)]: pocketId };
    };

    return {
      setTrackingMethods: (trackingMethods) => update((s) => ({ ...s, trackingMethods })),
      setIncome: (income) => update((s) => ({ ...s, income })),
      completeOnboarding: ({ name, income, payday, pockets, sample }) =>
        update((s) =>
          applyRecurring({
            ...s,
            name: name.trim() || 'there',
            income,
            payday,
            pockets,
            onboarded: true,
            ...(sample ? sampleData(pockets, income) : { transactions: [], goals: [], bills: [] }),
          }),
        ),
      updateProfile: (patch) => update((s) => applyRecurring({ ...s, ...patch })),

      addTransaction: (tx) => {
        const id = uid('tx');
        update((s) => {
          const pocketIds = s.pockets.map((p) => p.id);
          const pocketId = tx.pocketId ?? (tx.amount < 0 ? guessPocket(tx.merchant, pocketIds, s.rules) : undefined);
          const rules = tx.pocketId && tx.source === 'manual' ? learn(s, tx.merchant, tx.pocketId) : s.rules;
          return {
            ...s,
            rules,
            transactions: [{ ...tx, id, pocketId, needsReview: tx.amount < 0 && !pocketId }, ...s.transactions].sort(byDateDesc),
          };
        });
        return id;
      },
      updateTransaction: (id, patch) =>
        update((s) => {
          const current = s.transactions.find((t) => t.id === id);
          if (!current) return s;
          const next = { ...current, ...patch };
          if (next.amount > 0) next.needsReview = false;
          else if (patch.pocketId) next.needsReview = false;
          const rules = patch.pocketId ? learn(s, next.merchant, patch.pocketId) : s.rules;
          return { ...s, rules, transactions: s.transactions.map((t) => (t.id === id ? next : t)).sort(byDateDesc) };
        }),
      deleteTransaction: (id) => update((s) => ({ ...s, transactions: s.transactions.filter((t) => t.id !== id) })),
      categorise: (txId, pocketId) =>
        update((s) => {
          const tx = s.transactions.find((t) => t.id === txId);
          if (!tx) return s;
          const key = merchantKey(tx.merchant);
          const pocketName = s.pockets.find((p) => p.id === pocketId)?.name;
          return {
            ...s,
            rules: learn(s, tx.merchant, pocketId),
            // Apply the lesson to every other unreviewed transaction from the same merchant.
            transactions: s.transactions.map((t) =>
              t.id === txId || (isLearnable(tx.merchant) && t.needsReview && t.amount < 0 && merchantKey(t.merchant) === key)
                ? { ...t, pocketId, needsReview: false, note: pocketName }
                : t,
            ),
          };
        }),
      importTransactions: (items, source) => {
        const s = stateRef.current;
        const pocketIds = s.pockets.map((p) => p.id);
        const isDuplicate = (p: ParsedTransaction) =>
          s.transactions.some(
            (t) => t.amount === p.amount && isSameDay(new Date(t.date), p.date) && merchantKey(t.merchant) === merchantKey(p.merchant),
          );
        const fresh = items.filter((p) => !isDuplicate(p));
        const created: Transaction[] = fresh.map((p) => {
          const pocketId = p.amount < 0 ? guessPocket(p.merchant, pocketIds, s.rules) : undefined;
          return {
            id: uid('tx'),
            merchant: p.merchant,
            amount: p.amount,
            date: p.date.toISOString(),
            pocketId,
            note: p.amount > 0 ? 'Income' : s.pockets.find((x) => x.id === pocketId)?.name ?? 'Uncategorised',
            needsReview: p.amount < 0 && !pocketId,
            source,
          };
        });
        if (created.length) update((st) => ({ ...st, transactions: [...created, ...st.transactions].sort(byDateDesc) }));
        return { added: created.length, duplicates: items.length - fresh.length, needsReview: created.filter((t) => t.needsReview).length };
      },

      addPocket: (pocket) => {
        const id = uid('pocket');
        update((s) => ({ ...s, pockets: [...s.pockets, { ...pocket, id }] }));
        return id;
      },
      updatePocket: (id, patch) => update((s) => ({ ...s, pockets: s.pockets.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      deletePocket: (id) =>
        update((s) => ({
          ...s,
          pockets: s.pockets.filter((p) => p.id !== id),
          // Orphaned spending goes back to review rather than silently vanishing from budgets.
          transactions: s.transactions.map((t) => (t.pocketId === id ? { ...t, pocketId: undefined, needsReview: t.amount < 0 } : t)),
          rules: Object.fromEntries(Object.entries(s.rules).filter(([, v]) => v !== id)),
          bills: s.bills.map((b) => (b.pocketId === id ? { ...b, pocketId: undefined } : b)),
        })),
      setPocketBudget: (pocketId, budget) =>
        update((s) => ({ ...s, pockets: s.pockets.map((p) => (p.id === pocketId ? { ...p, budget } : p)) })),
      moveBudget: (fromId, toId, amount) =>
        update((s) => ({
          ...s,
          pockets: s.pockets.map((p) =>
            p.id === fromId ? { ...p, budget: p.budget - amount } : p.id === toId ? { ...p, budget: p.budget + amount } : p,
          ),
        })),

      addGoal: (goal) => {
        const id = uid('goal');
        update((s) => ({ ...s, goals: [...s.goals, { ...goal, id, contributions: [] }] }));
        return id;
      },
      updateGoal: (goalId, patch) =>
        update((s) => ({
          ...s,
          goals: s.goals.map((g) => {
            if (g.id !== goalId) return g;
            const next = { ...g, ...patch };
            // Turning auto-save on mid-month starts from next payday, not retroactively.
            if (patch.autoSave && !g.autoSave) next.lastAutoSave = monthKey(new Date());
            return next;
          }),
        })),
      deleteGoal: (goalId) =>
        update((s) => ({
          ...s,
          goals: s.goals.filter((g) => g.id !== goalId),
          transactions: s.transactions.map((t) => (t.goalId === goalId ? { ...t, goalId: undefined } : t)),
        })),
      addToGoal: (goalId, amount, label = amount < 0 ? 'Withdrawal' : 'Manual Add') =>
        update((s) => ({
          ...s,
          goals: s.goals.map((g) =>
            g.id === goalId
              ? { ...g, contributions: [{ id: uid('c'), label, amount, date: new Date().toISOString() }, ...g.contributions] }
              : g,
          ),
        })),

      addBill: (bill) => {
        const id = uid('bill');
        update((s) => ({ ...s, bills: [...s.bills, { ...bill, id }] }));
        return id;
      },
      updateBill: (id, patch) => update((s) => ({ ...s, bills: s.bills.map((b) => (b.id === id ? { ...b, ...patch } : b)) })),
      deleteBill: (id) => update((s) => ({ ...s, bills: s.bills.filter((b) => b.id !== id) })),
      payBill: (billId) =>
        update((s) => {
          const bill = s.bills.find((b) => b.id === billId);
          if (!bill) return s;
          const pocketId = s.pockets.some((p) => p.id === bill.pocketId)
            ? bill.pocketId
            : s.pockets.find((p) => p.fixed)?.id ?? s.pockets[0]?.id;
          const paid: Transaction = {
            id: uid('tx'), merchant: bill.name, amount: -bill.amount, date: new Date().toISOString(),
            note: 'Bill', pocketId, source: 'bill',
          };
          return {
            ...s,
            bills: bill.recurring
              ? s.bills.map((b) => (b.id === billId ? { ...b, dueDate: addMonths(new Date(b.dueDate), 1).toISOString() } : b))
              : s.bills.filter((b) => b.id !== billId),
            transactions: [paid, ...s.transactions].sort(byDateDesc),
          };
        }),

      fileCharges: () =>
        update((s) => {
          const target = s.pockets.find((p) => p.id === 'essentials') ?? s.pockets.find((p) => p.fixed);
          if (!target) return s;
          let changed = false;
          const transactions = s.transactions.map((t) => {
            if (!t.needsReview || t.amount >= 0 || !classifyCharge(`${t.merchant} ${t.note ?? ''}`)) return t;
            changed = true;
            return { ...t, pocketId: target.id, needsReview: false, note: target.name };
          });
          return changed ? { ...s, transactions } : s;
        }),
      setReminders: (patch) => update((s) => ({ ...s, reminders: { ...s.reminders, ...patch } })),
      loadSampleData: () => update((s) => applyRecurring({ ...s, ...sampleData(s.pockets, s.income) })),
      reset: () => update(() => initialState()),
    };
  }, [update]);

  const syncNow = useCallback(() => runSync(true), [runSync]);
  const value = useMemo(() => ({ state, hydrated, sync, syncNow, ...actions }), [state, hydrated, sync, syncNow, actions]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}
