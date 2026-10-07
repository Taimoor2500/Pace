import { router } from 'expo-router';

/** Closes the current screen; if it was opened directly (deep link, notification), falls back to Today. */
export function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)');
}
