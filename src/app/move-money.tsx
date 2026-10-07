import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AmountPicker } from '@/components/amount-picker';
import { Button } from '@/components/button';
import { FieldLabel, FormSheet } from '@/components/form-sheet';
import { haptic } from '@/components/haptics';
import { IconBadge } from '@/components/icon-badge';
import { PressableScale } from '@/components/pressable-scale';
import { Txt } from '@/components/text';
import { rs } from '@/lib/format';
import { close } from '@/lib/nav';
import { pocketStatuses } from '@/store/selectors';
import { useStore } from '@/store/store';
import { colors, radius, space, tints } from '@/theme';

export default function MoveMoney() {
  const { to } = useLocalSearchParams<{ to?: string }>();
  const { state, moveBudget } = useStore();
  const statuses = pocketStatuses(state);
  const target = statuses.find((p) => p.id === to);
  const sources = statuses.filter((p) => p.id !== to && p.left > 0).sort((a, b) => b.left - a.left);
  const [from, setFrom] = useState(sources[0]?.id);
  const [amount, setAmount] = useState(2000);
  const source = sources.find((p) => p.id === from);

  if (!target) {
    return (
      <FormSheet title="Move money" footer={<Button label="Close" variant="secondary" onPress={close} />}>
        <Txt variant="body" style={{ marginTop: space.lg }}>This pocket no longer exists.</Txt>
      </FormSheet>
    );
  }
  const tooMuch = !!source && amount > source.left;

  return (
    <FormSheet
      title="Move money"
      footer={
        <Button
          label={`Move ${rs(amount)}`}
          disabled={!source || amount <= 0 || tooMuch}
          onPress={() => {
            moveBudget(source!.id, target.id, amount);
            haptic.success();
            close();
          }}
        />
      }
    >
      <View style={{ gap: space.xxs, marginTop: space.sm }}>
        <Txt variant="title">Move money to {target.name}</Txt>
        <Txt variant="caption">Rebalance your plan — your total budget stays the same.</Txt>
      </View>

      <FieldLabel>From</FieldLabel>
      {sources.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.xs }} style={{ flexGrow: 0 }}>
          {sources.map((p) => {
            const on = p.id === from;
            return (
              <PressableScale
                key={p.id}
                onPress={() => setFrom(p.id)}
                accessibilityState={{ selected: on }}
                style={[styles.src, { borderColor: on ? tints[p.tint].fg : colors.hairline, backgroundColor: on ? tints[p.tint].bg : colors.surface }]}
              >
                <IconBadge icon={p.icon} tint={p.tint} size={32} />
                <Txt variant="captionStrong" numberOfLines={1}>{p.name}</Txt>
                <Txt variant="caption" money>{rs(p.left)} left</Txt>
              </PressableScale>
            );
          })}
        </ScrollView>
      ) : (
        <Txt variant="caption">No other pocket has money left this month.</Txt>
      )}

      <FieldLabel>Amount</FieldLabel>
      <AmountPicker value={amount} onChange={setAmount} presets={[1000, 2000, 5000, 10000]} />
      {tooMuch && (
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <Ionicons name="alert-circle" size={16} color={colors.danger} />
          <Txt variant="caption" style={{ color: colors.danger }}>{source!.name} only has {rs(source!.left)} left.</Txt>
        </View>
      )}
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  src: { width: 132, padding: space.sm, gap: 6, borderRadius: radius.md, borderWidth: 1.5 },
});
