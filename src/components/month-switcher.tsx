import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { addMonths, isSameMonth, monthName } from '@/lib/format';
import { colors, space } from '@/theme';
import { haptic } from './haptics';
import { Txt } from './text';

/** ‹ October › — browse past months; can't go beyond the current month. */
export function MonthSwitcher({ month, onChange, large }: { month: Date; onChange: (m: Date) => void; large?: boolean }) {
  const now = new Date();
  const atLatest = isSameMonth(month, now);
  const label = `${monthName(month, true)}${month.getFullYear() !== now.getFullYear() ? ` ${month.getFullYear()}` : ''}`;
  const go = (delta: number) => {
    haptic.select();
    onChange(addMonths(new Date(month.getFullYear(), month.getMonth(), 1), delta));
  };
  return (
    <View style={styles.row}>
      <Pressable onPress={() => go(-1)} hitSlop={8} style={styles.btn} accessibilityLabel="Previous month">
        <Ionicons name="chevron-back" size={large ? 20 : 16} color={colors.ink} />
      </Pressable>
      <Txt variant={large ? 'display' : 'captionStrong'} style={large ? { fontSize: 28 } : undefined}>{label}</Txt>
      <Pressable onPress={() => !atLatest && go(1)} hitSlop={8} style={[styles.btn, atLatest && { opacity: 0.25 }]} disabled={atLatest} accessibilityLabel="Next month">
        <Ionicons name="chevron-forward" size={large ? 20 : 16} color={colors.ink} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.xxs },
  btn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
});
