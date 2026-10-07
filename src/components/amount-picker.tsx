import { StyleSheet, TextInput, View } from 'react-native';
import { formatNumber } from '@/lib/format';
import { colors, fonts, radius, space } from '@/theme';
import { PressableScale } from './pressable-scale';
import { Txt } from './text';

/** Quick-pick chips first (selection over manual input), with a precise field as fallback. */
export function AmountPicker({ value, onChange, presets }: { value: number; onChange: (n: number) => void; presets: number[] }) {
  return (
    <View style={{ gap: space.sm }}>
      <View style={styles.field}>
        <Txt variant="title" style={{ color: colors.ink40 }}>Rs.</Txt>
        <TextInput
          value={value ? formatNumber(value) : ''}
          onChangeText={(t) => onChange(Number(t.replace(/\D/g, '')) || 0)}
          placeholder="0"
          placeholderTextColor={colors.ink10}
          keyboardType="number-pad"
          accessibilityLabel="Amount"
          style={styles.input}
          maxLength={11}
        />
      </View>
      <View style={styles.chips}>
        {presets.map((p) => {
          const on = p === value;
          return (
            <PressableScale key={p} onPress={() => onChange(p)} style={[styles.chip, on && styles.chipOn]}>
              <Txt variant="captionStrong" money style={{ color: on ? colors.onInk : colors.ink }}>
                {p >= 1000 ? `${formatNumber(p / 1000)}k` : formatNumber(p)}
              </Txt>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', gap: space.xs, height: 72, paddingHorizontal: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline },
  input: { flex: 1, minWidth: 0, fontFamily: fonts.bold, fontSize: 32, color: colors.ink, padding: 0, fontVariant: ['tabular-nums'] },
  chips: { flexDirection: 'row', gap: space.xs },
  chip: { flex: 1, height: 40, borderRadius: radius.pill, backgroundColor: colors.ink05, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: colors.ink },
});
