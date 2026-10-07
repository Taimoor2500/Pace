import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { IconBadge } from '@/components/icon-badge';
import { NavHeader } from '@/components/nav-header';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/text';
import { formatNumber, rs } from '@/lib/format';
import { recommendedPockets } from '@/store/seed';
import { useStore } from '@/store/store';
import { colors, fonts, radius, space } from '@/theme';

export default function Budget() {
  const { state, setIncome, completeOnboarding } = useStore();
  const input = useRef<TextInput>(null);
  const [payday, setPayday] = useState(state.payday);
  const [sample, setSample] = useState(false);
  const pockets = useMemo(() => recommendedPockets(state.income), [state.income]);
  const planned = pockets.reduce((s, p) => s + p.budget, 0);
  const savings = state.income - planned;

  const finish = () => {
    completeOnboarding({ name: state.name, income: state.income, payday, pockets, sample });
    if (router.canDismiss()) router.dismissAll();
    router.replace('/(tabs)');
  };

  return (
    <Screen footer={<Button label="Start using Pace" onPress={finish} disabled={state.income < 10000} />}>
      <NavHeader />
      <View style={{ gap: space.xs }}>
        <Txt variant="display" style={{ fontSize: 28, lineHeight: 34 }}>Set up your{'\n'}monthly budget</Txt>
        <Txt variant="body" style={{ color: colors.ink60 }}>Tell us your monthly income and we’ll help you plan your spending.</Txt>
      </View>

      <PressableScale onPress={() => input.current?.focus()} haptics={false}>
        <Card style={styles.income}>
          <IconBadge icon="wallet" tint="amber" size={44} />
          <View style={{ flex: 1 }}>
            <Txt variant="caption">Monthly income</Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Txt variant="title" money style={{ marginRight: 6 }}>Rs.</Txt>
              <TextInput
                ref={input}
                value={state.income ? formatNumber(state.income) : ''}
                onChangeText={(t) => setIncome(Number(t.replace(/\D/g, '')) || 0)}
                keyboardType="number-pad"
                accessibilityLabel="Monthly income"
                style={styles.incomeInput}
                maxLength={11}
              />
            </View>
          </View>
          <Ionicons name="pencil" size={18} color={colors.ink40} />
        </Card>
      </PressableScale>

      <Card style={styles.income}>
        <IconBadge icon="calendar" tint="green" size={44} />
        <View style={{ flex: 1 }}>
          <Txt variant="caption">Salary arrives on</Txt>
          <Txt variant="title">Day {payday}</Txt>
        </View>
        <Pressable onPress={() => setPayday(payday <= 1 ? 28 : payday - 1)} style={styles.stepBtn} accessibilityLabel="Earlier payday">
          <Ionicons name="remove" size={18} color={colors.ink} />
        </Pressable>
        <Pressable onPress={() => setPayday(payday >= 28 ? 1 : payday + 1)} style={styles.stepBtn} accessibilityLabel="Later payday">
          <Ionicons name="add" size={18} color={colors.ink} />
        </Pressable>
      </Card>

      <View>
        <Txt variant="bodyStrong" style={{ marginBottom: space.xs }}>Recommended pockets</Txt>
        <Card style={{ paddingVertical: space.xs }}>
          {pockets.map((p, i) => (
            <View key={p.id} style={[styles.row, i > 0 && styles.divider]}>
              <IconBadge icon={p.icon} tint={p.tint} size={32} />
              <Txt variant="body" style={{ flex: 1, color: colors.ink }}>{p.name}</Txt>
              <Txt variant="bodyStrong" money>{rs(p.budget)}</Txt>
            </View>
          ))}
        </Card>
        {savings > 0 && (
          <View style={styles.savings}>
            <Ionicons name="sparkles" size={16} color={colors.accent} />
            <Txt variant="caption" style={{ color: colors.accent, flex: 1 }}>
              {rs(savings)} left over each month for savings & goals. You can fine-tune pockets anytime.
            </Txt>
          </View>
        )}
      </View>

      <View style={styles.sampleRow}>
        <View style={{ flex: 1 }}>
          <Txt variant="bodyStrong">Start with sample data</Txt>
          <Txt variant="caption">Explore with 3 months of example activity. You can erase it later in Settings.</Txt>
        </View>
        <Switch value={sample} onValueChange={setSample} trackColor={{ true: colors.accent, false: colors.ink10 }} thumbColor={colors.surface} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  income: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  incomeInput: { flex: 1, minWidth: 0, fontFamily: fonts.semibold, fontSize: 20, color: colors.ink, padding: 0, fontVariant: ['tabular-nums'] },
  stepBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.ink05, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.ink10 },
  savings: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.sm, paddingHorizontal: space.xs },
  sampleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline },
});
