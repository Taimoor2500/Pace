import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/button';
import { IconBadge } from '@/components/icon-badge';
import { NavHeader } from '@/components/nav-header';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/text';
import { useStore } from '@/store/store';
import type { IconName, TrackingMethod } from '@/store/types';
import { colors, radius, shadow, space, type TintName } from '@/theme';

const OPTIONS: { id: TrackingMethod; title: string; body: string; icon: IconName; tint: TintName; tag?: string }[] = [
  { id: 'notifications', title: 'Track from bank SMS', body: 'Share or paste alerts — auto-categorised', icon: 'notifications', tint: 'green', tag: 'Recommended for Pakistan' },
  { id: 'quick-add', title: 'Quick add', body: 'Add expenses in seconds', icon: 'flash', tint: 'blue' },
  { id: 'statement', title: 'Import statement', body: 'Upload bank statements (CSV)', icon: 'document-text', tint: 'purple' },
  { id: 'manual', title: 'Track manually', body: 'Full control, no automation', icon: 'create', tint: 'pink' },
];

export default function Track() {
  const { state, setTrackingMethods } = useStore();
  const selected = state.trackingMethods;
  const toggle = (id: TrackingMethod) =>
    setTrackingMethods(selected.includes(id) ? selected.filter((m) => m !== id) : [...selected, id]);

  return (
    <Screen footer={<Button label="Continue" disabled={!selected.length} onPress={() => router.push('/onboarding/budget')} />}>
      <NavHeader />
      <View style={{ gap: space.xs }}>
        <Txt variant="display" style={{ fontSize: 28, lineHeight: 34 }}>How do you want{'\n'}to track your money?</Txt>
        <Txt variant="body" style={{ color: colors.ink60 }}>Choose one or more. You can always change this later.</Txt>
      </View>
      <View style={{ gap: space.sm }}>
        {OPTIONS.map((o) => {
          const on = selected.includes(o.id);
          return (
            <PressableScale
              key={o.id}
              onPress={() => toggle(o.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              style={[styles.option, on && styles.optionOn]}
            >
              <IconBadge icon={o.icon} tint={o.tint} size={48} />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt variant="bodyStrong">{o.title}</Txt>
                {o.tag ? (
                  <View style={styles.tag}><Txt variant="caption" style={{ color: colors.accent }}>{o.tag}</Txt></View>
                ) : (
                  <Txt variant="caption">{o.body}</Txt>
                )}
              </View>
              <View style={[styles.check, on && styles.checkOn]}>
                {on && <Ionicons name="checkmark" size={14} color={colors.onInk} />}
              </View>
            </PressableScale>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.hairline,
    ...shadow(1),
  },
  optionOn: { borderColor: colors.accent, backgroundColor: '#FBFEFC', ...shadow(2, colors.accent) },
  tag: { alignSelf: 'flex-start', backgroundColor: colors.accentSoft, borderRadius: radius.pill, paddingHorizontal: space.xs, paddingVertical: 2 },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: colors.ink10, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.accent, borderColor: colors.accent },
});
