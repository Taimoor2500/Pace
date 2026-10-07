import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AmountPicker } from '@/components/amount-picker';
import { Button } from '@/components/button';
import { Celebrate } from '@/components/celebrate';
import { FormSheet } from '@/components/form-sheet';
import { haptic } from '@/components/haptics';
import { Txt } from '@/components/text';
import { longDate, rs } from '@/lib/format';
import { close } from '@/lib/nav';
import { goalProjection, goalSaved } from '@/store/selectors';
import { useStore } from '@/store/store';
import { colors, space } from '@/theme';

type Mode = 'add' | 'withdraw' | 'monthly';

export default function AddMoney() {
  const params = useLocalSearchParams<{ goal?: string; mode?: Mode }>();
  const mode: Mode = params.mode === 'withdraw' || params.mode === 'monthly' ? params.mode : 'add';
  const { state, addToGoal, updateGoal } = useStore();
  const goal = state.goals.find((g) => g.id === params.goal);
  const [amount, setAmount] = useState(mode === 'monthly' ? goal?.monthly || 10000 : mode === 'withdraw' ? 0 : 10000);
  const [done, setDone] = useState(false);
  const [reachedNow, setReachedNow] = useState(false);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(close, reachedNow ? 2600 : 1600);
    return () => clearTimeout(t);
  }, [done, reachedNow]);

  if (!goal) {
    return (
      <FormSheet title="Goal" footer={<Button label="Close" variant="secondary" onPress={close} />}>
        <Txt variant="body" style={{ marginTop: space.lg }}>This goal no longer exists.</Txt>
      </FormSheet>
    );
  }

  const saved = goalSaved(goal);
  const p = goalProjection(goal);
  const tooMuch = mode === 'withdraw' && amount > saved;

  const submit = () => {
    if (amount <= 0 || tooMuch) return;
    if (mode === 'withdraw') {
      addToGoal(goal.id, -amount, 'Withdrawal');
      haptic.success();
      close();
      return;
    }
    if (mode === 'monthly') updateGoal(goal.id, { monthly: amount, autoSave: true });
    else {
      addToGoal(goal.id, amount);
      setReachedNow(saved < goal.target && saved + amount >= goal.target);
    }
    haptic.success();
    setDone(true);
  };

  if (done) {
    return (
      <View style={styles.success}>
        <Celebrate>
          <Txt style={{ fontSize: 64 }}>{reachedNow ? '🏆' : mode === 'monthly' ? '🔁' : '🌱'}</Txt>
        </Celebrate>
        <Txt variant="title" style={{ textAlign: 'center' }}>
          {reachedNow ? `${goal.name} is fully funded!` : mode === 'monthly' ? 'Auto-save is on' : `${rs(amount)} closer!`}
        </Txt>
        <Txt variant="body" style={{ textAlign: 'center' }}>
          {reachedNow
            ? 'You did it. Every rupee, on purpose.'
            : mode === 'monthly'
              ? `${rs(amount)} moves into ${goal.name} every payday (day ${state.payday}).`
              : p.ready
                ? `At this pace you’ll reach ${goal.name} by ${longDate(p.ready)}.`
                : `${rs(p.remaining)} to go.`}
        </Txt>
      </View>
    );
  }

  const copy = {
    add: { title: 'Add money', heading: `Add to ${goal.name}`, sub: `${rs(p.remaining)} to go · ${Math.round((saved / goal.target) * 100)}% there`, cta: `Add ${rs(amount)}` },
    withdraw: { title: 'Withdraw', heading: `Withdraw from ${goal.name}`, sub: saved > 0 ? `You can withdraw up to ${rs(saved)}` : 'Nothing saved in this goal yet', cta: `Withdraw ${rs(amount)}` },
    monthly: { title: 'Auto-save', heading: 'Monthly auto-save', sub: `Added to ${goal.name} on payday (day ${state.payday}) each month.`, cta: 'Turn on auto-save' },
  }[mode];
  const presets =
    mode === 'monthly' ? [10000, 15000, 25000, 40000]
      : mode === 'withdraw' ? [...new Set([1000, 5000, 10000, saved])].filter((v) => v > 0 && v <= saved)
        : [5000, 10000, 25000, 50000];

  return (
    <FormSheet title={copy.title} footer={<Button label={copy.cta} onPress={submit} disabled={amount <= 0 || tooMuch} />}>
      <View style={{ gap: space.xxs, marginTop: space.sm, marginBottom: space.xs }}>
        <Txt variant="title">{copy.heading}</Txt>
        <Txt variant="caption">{copy.sub}</Txt>
      </View>
      <AmountPicker value={amount} onChange={setAmount} presets={presets} />
      <View style={styles.hint}>
        <Ionicons name={tooMuch ? 'alert-circle' : 'information-circle-outline'} size={16} color={tooMuch ? colors.danger : colors.ink60} />
        <Txt variant="caption" style={{ flex: 1, color: tooMuch ? colors.danger : colors.ink60 }}>
          {tooMuch
            ? `You only have ${rs(saved)} in this goal.`
            : mode === 'monthly'
              ? `${Math.ceil(p.remaining / Math.max(amount, 1))} months to go at this rate.`
              : 'Money stays in your bank account — Pace earmarks it for this goal.'}
        </Txt>
      </View>
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  success: { flex: 1, backgroundColor: colors.canvas, padding: space.lg, gap: space.md, alignItems: 'center', justifyContent: 'center' },
  hint: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.xs },
});
