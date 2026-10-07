// Custom entry: starts Expo Router, and on Android registers the home-screen widget task + pocket picker.
import 'expo-router/entry';
import { Platform } from 'react-native';

if (Platform.OS === 'android') {
  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { registerWidgetConfigurationScreen, registerWidgetTaskHandler } = require('react-native-android-widget');
    registerWidgetTaskHandler(require('./src/widgets/android/task-handler').widgetTaskHandler);
    registerWidgetConfigurationScreen(require('./src/widgets/android/configuration-screen').PocketConfigurationScreen);
    /* eslint-enable @typescript-eslint/no-require-imports */
  } catch {
    // Widgets need a development/store build; ignore in Expo Go.
  }
}
