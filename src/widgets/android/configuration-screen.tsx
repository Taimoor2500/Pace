import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { WidgetConfigurationScreenProps } from 'react-native-android-widget';
import type { WidgetSnapshot } from '../snapshot';
import { readChoices, readSnapshot, setChoice } from './storage';
import { pocketWidget } from './widgets';

/**
 * Shown by Android when a "Pace pocket" widget is added (or reconfigured): pick which pocket it tracks.
 * Runs as a separate lightweight screen, so it uses plain React Native views.
 */
export function PocketConfigurationScreen({ widgetInfo, renderWidget, setResult }: WidgetConfigurationScreenProps) {
  const [snapshot, setSnapshot] = useState<WidgetSnapshot | null>(null);
  const [current, setCurrent] = useState<string | undefined>();

  useEffect(() => {
    readSnapshot().then(setSnapshot);
    readChoices().then((c) => setCurrent(c[widgetInfo.widgetId]));
  }, [widgetInfo.widgetId]);

  const choose = async (id: string) => {
    await setChoice(widgetInfo.widgetId, id);
    if (snapshot) renderWidget(pocketWidget(snapshot, id, widgetInfo));
    setResult('ok');
  };

  const options = [{ id: 'safe', name: 'Safe to spend today', fg: '#1F9D4C' }, ...(snapshot?.pockets ?? [])];

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Choose a pocket</Text>
      <Text style={styles.sub}>This widget will show what’s left in it this month.</Text>
      {snapshot && !snapshot.signedIn ? (
        <Text style={styles.sub}>Open Pace and sign in first, then add the widget again.</Text>
      ) : (
        <ScrollView contentContainerStyle={{ gap: 8, paddingVertical: 12 }}>
          {options.map((o) => (
            <Pressable key={o.id} onPress={() => choose(o.id)} style={({ pressed }) => [styles.option, current === o.id && styles.selected, pressed && { opacity: 0.6 }]}>
              <View style={[styles.dot, { backgroundColor: o.fg }]} />
              <Text style={styles.optionText}>{o.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      <Pressable onPress={() => setResult('cancel')} style={styles.cancel}>
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E9EFE8', padding: 24, paddingTop: 48 },
  title: { fontSize: 22, fontWeight: '700', color: '#0E1116' },
  sub: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: 'rgba(14,17,22,0.06)' },
  selected: { borderColor: '#1F9D4C' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  optionText: { fontSize: 16, fontWeight: '600', color: '#0E1116' },
  cancel: { alignItems: 'center', padding: 16 },
  cancelText: { fontSize: 15, color: '#6B7280', fontWeight: '600' },
});
