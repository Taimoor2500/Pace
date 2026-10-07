import AsyncStorage from '@react-native-async-storage/async-storage';
import { SIGNED_OUT_SNAPSHOT, type WidgetSnapshot } from '../snapshot';

/** Shared between the app and the headless widget task (same process storage on Android). */
const SNAPSHOT_KEY = 'pace:widget:snapshot:v1';
const CHOICES_KEY = 'pace:widget:choices:v1';

export async function readSnapshot(): Promise<WidgetSnapshot> {
  try {
    const raw = await AsyncStorage.getItem(SNAPSHOT_KEY);
    return raw ? (JSON.parse(raw) as WidgetSnapshot) : SIGNED_OUT_SNAPSHOT;
  } catch {
    return SIGNED_OUT_SNAPSHOT;
  }
}

export async function writeSnapshot(s: WidgetSnapshot): Promise<void> {
  await AsyncStorage.setItem(SNAPSHOT_KEY, JSON.stringify(s));
}

/** Which pocket each widget instance shows (widgetId → pocketId | 'safe'). */
export async function readChoices(): Promise<Record<string, string>> {
  try {
    return JSON.parse((await AsyncStorage.getItem(CHOICES_KEY)) ?? '{}');
  } catch {
    return {};
  }
}

export async function setChoice(widgetId: number, pocketId: string | null): Promise<void> {
  const all = await readChoices();
  if (pocketId) all[widgetId] = pocketId;
  else delete all[widgetId];
  await AsyncStorage.setItem(CHOICES_KEY, JSON.stringify(all));
}
