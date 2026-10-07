import { Platform } from 'react-native';
import type { WidgetSnapshot } from './snapshot';

let last = '';

/**
 * Pushes the latest snapshot to home-screen widgets. Safe everywhere: widgets need a development/store build,
 * so in Expo Go (or on web) the native modules are missing and this quietly does nothing.
 */
export async function publishWidgets(snapshot: WidgetSnapshot): Promise<void> {
  const { updatedAt: _ignored, ...comparable } = snapshot;
  const key = JSON.stringify(comparable);
  if (key === last) return;
  last = key;

  if (Platform.OS === 'ios') {
    try {
      /* eslint-disable @typescript-eslint/no-require-imports */
      require('./ios/pocket-widget').default.updateSnapshot(snapshot);
      require('./ios/pockets-widget').default.updateSnapshot(snapshot);
      /* eslint-enable @typescript-eslint/no-require-imports */
    } catch {
      // expo-widgets isn't available (Expo Go).
    }
    return;
  }

  if (Platform.OS === 'android') {
    try {
      const { writeSnapshot, readChoices } = await import('./android/storage');
      await writeSnapshot(snapshot);
      const { requestWidgetUpdate } = await import('react-native-android-widget');
      const { pocketWidget, pocketsWidget } = await import('./android/widgets');
      const choices = await readChoices();
      await requestWidgetUpdate({
        widgetName: 'PocketWidget',
        renderWidget: (info) => pocketWidget(snapshot, choices[info.widgetId], info),
        widgetNotFound: () => {},
      });
      await requestWidgetUpdate({
        widgetName: 'PocketsWidget',
        renderWidget: (info) => pocketsWidget(snapshot, info),
        widgetNotFound: () => {},
      });
    } catch {
      // react-native-android-widget isn't available (Expo Go).
    }
  }
}
