import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { getNotifications } from '@/lib/notifications';
import { syncReminders } from '@/lib/reminders';
import { publishWidgets } from '@/widgets/publish';
import { buildSnapshot } from '@/widgets/snapshot';
import { useStore } from '@/store/store';

/** Keeps scheduled reminders in sync with settings and bills. */
function useReminderSync() {
  const { state, hydrated } = useStore();
  const key = JSON.stringify([state.reminders, state.bills.map((b) => [b.id, b.name, b.amount, b.dueDate])]);
  useEffect(() => {
    if (!hydrated || !state.onboarded) return;
    syncReminders(state).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures the relevant parts of state
  }, [key, hydrated, state.onboarded]);
}

/** Tapping a reminder opens the screen it points to (including the one that launched the app). */
function useNotificationRouting() {
  const handled = useRef<string | null>(null);
  useEffect(() => {
    const N = getNotifications();
    if (!N) return;
    const open = (response: { notification: { request: { identifier: string; content: { data?: Record<string, unknown> } } } } | null) => {
      const id = response?.notification.request.identifier;
      const url = response?.notification.request.content.data?.url;
      if (!id || handled.current === id || typeof url !== 'string') return;
      handled.current = id;
      router.push(url as never);
    };
    N.getLastNotificationResponseAsync().then(open).catch(() => {});
    const sub = N.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, []);
}

/** Android "Share → Pace": bank SMS text goes to the SMS importer, CSV files to the statement importer. */
function useIncomingShares() {
  const { state, hydrated } = useStore();
  useEffect(() => {
    if (Platform.OS !== 'android' || !hydrated || !state.onboarded) return;
    const check = () => {
      let payloads: Sharing.SharePayload[] = [];
      try {
        payloads = Sharing.getSharedPayloads();
      } catch {
        return; // Not available in this build (e.g. Expo Go).
      }
      if (!payloads.length) return;
      const text = payloads.filter((p) => p.shareType === 'text').map((p) => p.value).join('\n\n');
      const file = payloads.find((p) => p.shareType === 'file' || /csv|comma|excel|spreadsheet|plain/.test(p.mimeType ?? ''));
      try {
        Sharing.clearSharedPayloads();
      } catch {}
      if (text) router.push({ pathname: '/import-sms', params: { text } });
      else if (file) router.push({ pathname: '/import-statement', params: { uri: file.value, mime: file.mimeType ?? '' } });
    };
    check();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => sub.remove();
  }, [hydrated, state.onboarded]);
}

/** One pass after the account loads: re-file taxes/fees that were imported before Pace recognised them. */
function useFileCharges() {
  const { fileCharges, hydrated } = useStore();
  useEffect(() => {
    if (hydrated) fileCharges();
  }, [hydrated, fileCharges]);
}

/** Keeps home-screen widgets in step with the app (batched; no-op in Expo Go). */
function useWidgetSync() {
  const { state, hydrated } = useStore();
  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(() => publishWidgets(buildSnapshot(state)).catch(() => {}), 1500);
    return () => clearTimeout(t);
  }, [state, hydrated]);
  // Refresh on return to the app so "safe to spend today" rolls over to the new day.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && hydrated && publishWidgets(buildSnapshot(state)).catch(() => {}));
    return () => sub.remove();
  }, [state, hydrated]);
}

export function AppEffects() {
  useWidgetSync();
  useFileCharges();
  useReminderSync();
  useNotificationRouting();
  useIncomingShares();
  return null;
}
