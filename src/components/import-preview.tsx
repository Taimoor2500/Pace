import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { guessPocket } from '@/lib/categorize';
import { shortDate, signedRs } from '@/lib/format';
import type { ParsedTransaction } from '@/lib/sms-parser';
import { useStore } from '@/store/store';
import { colors, radius, space, tints } from '@/theme';
import { Txt } from './text';

/** Reviewable list of parsed transactions with per-row include toggles. */
export function ImportPreview({
  items,
  selected,
  onToggle,
}: { items: ParsedTransaction[]; selected: Set<number>; onToggle: (i: number) => void }) {
  const { state } = useStore();
  const ids = state.pockets.map((p) => p.id);
  return (
    <View style={{ gap: space.xs }}>
      {items.map((t, i) => {
        const on = selected.has(i);
        const pocket = t.amount < 0 ? state.pockets.find((p) => p.id === guessPocket(t.merchant, ids, state.rules)) : undefined;
        return (
          <Pressable
            key={i}
            onPress={() => onToggle(i)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            style={[styles.row, !on && { opacity: 0.45 }]}
          >
            <View style={[styles.check, on && styles.checkOn]}>{on && <Ionicons name="checkmark" size={14} color={colors.onInk} />}</View>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="bodyStrong" numberOfLines={1}>{t.merchant}</Txt>
              <View style={{ flexDirection: 'row', gap: space.xs, alignItems: 'center' }}>
                <Txt variant="caption">{shortDate(t.date)}, {t.date.getFullYear()}</Txt>
                {t.amount > 0 ? (
                  <View style={[styles.tag, { backgroundColor: colors.accentSoft }]}><Txt variant="caption" style={{ color: colors.accent, fontSize: 11 }}>Income</Txt></View>
                ) : pocket ? (
                  <View style={[styles.tag, { backgroundColor: tints[pocket.tint].bg }]}><Txt variant="caption" style={{ color: tints[pocket.tint].fg, fontSize: 11 }}>{pocket.name}</Txt></View>
                ) : (
                  <View style={[styles.tag, { backgroundColor: tints.amber.bg }]}><Txt variant="caption" style={{ color: tints.amber.fg, fontSize: 11 }}>Needs review</Txt></View>
                )}
              </View>
            </View>
            <Txt variant="bodyStrong" money style={{ color: t.amount > 0 ? colors.accent : colors.ink }}>{signedRs(t.amount)}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.sm, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: colors.ink10, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  tag: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.pill },
});
