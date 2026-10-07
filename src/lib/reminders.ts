import { Platform } from 'react-native';
import { rs } from './format';
import { getNotifications } from './notifications';
import type { AppState } from '@/store/types';

const CHANNEL = 'reminders';
let handlerSet = false;

function setup() {
  const N = getNotifications();
  if (!N) return null;
  if (!handlerSet) {
    N.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
    });
    handlerSet = true;
  }
  return N;
}

/** Asks for permission if needed. Returns whether notifications can be shown. */
export async function ensurePermission(): Promise<boolean> {
  const N = setup();
  if (!N) return false;
  if (Platform.OS === 'android') {
    await N.setNotificationChannelAsync(CHANNEL, { name: 'Reminders', importance: N.AndroidImportance.DEFAULT });
  }
  const current = await N.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await N.requestPermissionsAsync();
  return asked.granted;
}

/** Replaces all scheduled reminders with ones matching the current settings and bills. */
export async function syncReminders(state: AppState): Promise<void> {
  const N = setup();
  if (!N) return;
  await N.cancelAllScheduledNotificationsAsync();
  const { daily, bills, hour } = state.reminders;
  if (!daily && !bills) return;
  const perm = await N.getPermissionsAsync();
  if (!perm.granted) return;

  if (daily) {
    await N.scheduleNotificationAsync({
      content: { title: 'How did today go?', body: 'Log today’s spending in 10 seconds to keep your pace accurate.', data: { url: '/add-expense' } },
      trigger: { type: N.SchedulableTriggerInputTypes.DAILY, hour, minute: 0, channelId: CHANNEL },
    });
  }
  if (bills) {
    const now = Date.now();
    for (const bill of state.bills) {
      const due = new Date(bill.dueDate);
      const at = new Date(due.getFullYear(), due.getMonth(), due.getDate() - 1, 10, 0);
      if (at.getTime() <= now) continue;
      await N.scheduleNotificationAsync({
        content: { title: `${bill.name} is due tomorrow`, body: `${rs(bill.amount)} — tap to mark it paid.`, data: { url: '/plan?tab=bills' } },
        trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
      });
    }
  }
}
