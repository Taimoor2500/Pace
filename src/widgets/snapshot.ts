import { monthName, rs } from '@/lib/format';
import { pocketStatuses, today } from '@/store/selectors';
import type { AppState, IconName } from '@/store/types';
import { tints } from '@/theme';

/**
 * Everything a home-screen widget shows, pre-formatted. Widgets run outside the app (SwiftUI on iOS, a headless
 * task on Android), so they get display-ready strings rather than raw state.
 */
export type WidgetPocket = {
  id: string;
  name: string;
  /** SF Symbol for iOS. */
  symbol: string;
  /** Ionicons name (Android widgets draw it as SVG). */
  icon: string;
  /** "Rs. 31,950" — the headline number. */
  amount: string;
  /** "left" or "over". */
  status: 'left' | 'over';
  fg: string;
  bg: string;
  left: string;
  of: string;
  /** 0–1, for the progress bar. */
  used: number;
  over: boolean;
  url: string;
};

export type WidgetSnapshot = {
  signedIn: boolean;
  updatedAt: string;
  month: string;
  safeToday: string;
  pace: string;
  /** 0–1 position in the pay cycle. */
  cycle: number;
  pockets: WidgetPocket[];
};

/** Ionicons → SF Symbols, for the pocket icons Pace offers. */
const SF: Partial<Record<IconName, string>> = {
  home: 'house.fill', cafe: 'cup.and.saucer.fill', restaurant: 'fork.knife', car: 'car.fill', bus: 'bus.fill',
  'bag-handle': 'bag.fill', cart: 'cart.fill', 'game-controller': 'gamecontroller.fill', airplane: 'airplane',
  medkit: 'cross.case.fill', school: 'graduationcap.fill', barbell: 'dumbbell.fill', paw: 'pawprint.fill',
  gift: 'gift.fill', heart: 'heart.fill', shirt: 'tshirt.fill', 'phone-portrait': 'iphone', wifi: 'wifi',
  flash: 'bolt.fill', tv: 'tv.fill', card: 'creditcard.fill', cash: 'banknote.fill', people: 'person.2.fill',
  sparkles: 'sparkles',
};

export const SIGNED_OUT_SNAPSHOT: WidgetSnapshot = {
  signedIn: false, updatedAt: new Date(0).toISOString(), month: '', safeToday: '', pace: '', cycle: 0, pockets: [],
};

export function buildSnapshot(state: AppState, now = new Date()): WidgetSnapshot {
  if (!state.onboarded) return { ...SIGNED_OUT_SNAPSHOT, signedIn: true, updatedAt: now.toISOString() };
  const t = today(state, now);
  return {
    signedIn: true,
    updatedAt: now.toISOString(),
    month: monthName(now, true),
    safeToday: rs(t.safeToday),
    pace: t.ahead >= 0 ? `${rs(t.ahead)} ahead of pace` : `${rs(-t.ahead)} over pace`,
    cycle: t.progress,
    pockets: pocketStatuses(state, now).map((p) => ({
      id: p.id,
      name: p.name,
      symbol: SF[p.icon] ?? 'circle.fill',
      icon: p.icon,
      amount: rs(Math.abs(p.left)),
      status: p.left < 0 ? 'over' : 'left',
      fg: tints[p.tint].fg,
      bg: tints[p.tint].bg,
      left: p.left < 0 ? `${rs(-p.left)} over` : `${rs(p.left)} left`,
      of: `of ${rs(p.budget)}`,
      used: Math.max(0, Math.min(1, p.used)),
      over: p.left < 0,
      url: `pace://pocket/${p.id}`,
    })),
  };
}

/** The pocket a widget instance should show; falls back to the first flexible pocket. */
export function pickPocket(s: WidgetSnapshot, id: string | undefined): WidgetPocket | undefined {
  return s.pockets.find((p) => p.id === id) ?? s.pockets.find((p) => p.id !== 'essentials') ?? s.pockets[0];
}
