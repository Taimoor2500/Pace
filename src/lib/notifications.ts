import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

type NotificationsModule = typeof import('expo-notifications');

let cached: NotificationsModule | null | undefined;

/**
 * Loads expo-notifications on demand. Returns null where it can't work: web, and Expo Go on Android —
 * there, merely importing the package throws (push support was removed from Expo Go in SDK 53),
 * which would crash the app at startup. Never import 'expo-notifications' statically elsewhere.
 */
export function getNotifications(): NotificationsModule | null {
  if (cached !== undefined) return cached;
  const native = Platform.OS === 'ios' || Platform.OS === 'android';
  if (!native || (Platform.OS === 'android' && isRunningInExpoGo())) {
    cached = null;
    return cached;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-notifications') as NotificationsModule;
  } catch {
    cached = null;
  }
  return cached;
}

export function notificationsAvailable(): boolean {
  return getNotifications() !== null;
}
