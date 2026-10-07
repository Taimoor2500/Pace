import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AmountPicker } from '@/components/amount-picker';
import { Button } from '@/components/button';
import { FieldLabel, FormSheet } from '@/components/form-sheet';
import { haptic } from '@/components/haptics';
import { IconBadge } from '@/components/icon-badge';
import { IconButton } from '@/components/nav-header';
import { PressableScale } from '@/components/pressable-scale';
import { TextField } from '@/components/text-field';
import { Txt } from '@/components/text';
import { confirm } from '@/lib/confirm';
import { addMonths, longDate, monthsBetween, rs } from '@/lib/format';
import { goalSaved } from '@/store/selectors';
import { useStore } from '@/store/store';
import type { IconName } from '@/store/types';
import { colors, radius, space, tints, type TintName } from '@/theme';
import { close } from '@/lib/nav';

const KINDS: { name: string; icon: IconName; tint: TintName }[] = [
  { name: 'Travel', icon: 'airplane', tint: 'pink' },
  { name: 'Emergency', icon: 'umbrella', tint: 'amber' },
  { name: 'Car', icon: 'car-sport', tint: 'red' },
  { name: 'Home', icon: 'home', tint: 'purple' },
  { name: 'Education', icon: 'school', tint: 'blue' },
  { name: 'Wedding', icon: 'heart', tint: 'pink' },
  { name: 'Gadget', icon: 'phone-portrait', tint: 'teal' },
  { name: 'Other', icon: 'sparkles', tint: 'green' },
];
const HORIZONS = [6, 12, 24, 36, 60];

export default function AddGoal() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state, addGoal, updateGoal, deleteGoal } = useStore();
  const existing = state.goals.find((g) => g.id === id);
  const saved = existing ? goalSaved(existing) : 0;

  const [kind, setKind] = useState(KINDS.find((k) => k.icon === existing?.icon) ?? KINDS[0]);
  const [name, setName] = useState(existing?.name ?? '');
  const [target, setTarget] = useState(existing?.target ?? 200000);
  const [months, setMonths] = useState(() => {
    if (!existing) return 12;
    const m = monthsBetween(new Date(), new Date(existing.targetDate));
    return HORIZONS.reduce((best, h) => (Math.abs(h - m) < Math.abs(best - m) ? h : best), HORIZONS[0]);
  });
  const remaining = Math.max(0, target - saved);
  const monthly = Math.ceil(remaining / months / 500) * 500;

  const save = () => {
    const fields = {
      name: name.trim() || kind.name,
      target,
      monthly,
      targetDate: addMonths(new Date(), months).toISOString(),
      icon: kind.icon,
      tint: kind.tint,
    };
    haptic.success();
    if (existing) {
      updateGoal(existing.id, fields);
      close();
    } else {
      router.replace(`/goal/${addGoal(fields)}`);
    }
  };

  const remove = async () => {
    if (!existing) return;
    if (await confirm(`Delete ${existing.name}?`, saved > 0 ? `${rs(saved)} of earmarked savings will be released. Your bank balance isn’t affected.` : 'This goal has no savings yet.')) {
      deleteGoal(existing.id);
      router.dismissTo('/(tabs)/goals');
    }
  };

  return (
    <FormSheet
      title={existing ? 'Edit Goal' : 'New Goal'}
      left={existing ? <IconButton icon="trash-outline" label="Delete goal" onPress={remove} /> : undefined}
      footer={<Button label={existing ? 'Save Changes' : 'Create Goal'} onPress={save} disabled={target <= 0} />}
    >
      <FieldLabel>What are you saving for?</FieldLabel>
      <View style={styles.kinds}>
        {KINDS.map((k) => {
          const on = k.name === kind.name;
          return (
            <PressableScale
              key={k.name}
              onPress={() => setKind(k)}
              accessibilityState={{ selected: on }}
              style={[styles.kind, { borderColor: on ? tints[k.tint].fg : colors.hairline, backgroundColor: on ? tints[k.tint].bg : colors.surface }]}
            >
              <IconBadge icon={k.icon} tint={k.tint} size={36} />
              <Txt variant="caption" style={{ color: colors.ink, fontSize: 11 }}>{k.name}</Txt>
            </PressableScale>
          );
        })}
      </View>

      <TextField
        value={name}
        onChangeText={setName}
        placeholder={`Name it (e.g. ${kind.name === 'Travel' ? 'Istanbul 2027' : `${kind.name} fund`})`}
        maxLength={28}
        style={{ marginVertical: space.xs }}
      />

      <FieldLabel>Target amount</FieldLabel>
      <AmountPicker value={target} onChange={setTarget} presets={[100000, 250000, 500000, 1000000]} />

      <FieldLabel>By when?</FieldLabel>
      <View style={{ flexDirection: 'row', gap: space.xs }}>
        {HORIZONS.map((m) => (
          <PressableScale key={m} onPress={() => setMonths(m)} style={[styles.horizon, m === months && styles.horizonOn]}>
            <Txt variant="captionStrong" style={{ color: m === months ? colors.onInk : colors.ink }}>{m < 12 ? `${m} mo` : `${m / 12} yr`}</Txt>
          </PressableScale>
        ))}
      </View>

      <View style={styles.summary}>
        <Txt style={{ fontSize: 24 }}>🗓️</Txt>
        <Txt variant="caption" style={{ flex: 1, color: colors.ink80, fontSize: 13, lineHeight: 18 }}>
          {remaining === 0
            ? 'Already fully funded!'
            : <>Save <Txt variant="captionStrong" style={{ fontSize: 13 }}>{rs(monthly)}/month</Txt> to reach it by {longDate(addMonths(new Date(), months))}.</>}
        </Txt>
      </View>
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  kinds: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  kind: { flexBasis: '22%', flexGrow: 1, alignItems: 'center', gap: 4, paddingVertical: space.sm, borderRadius: radius.md, borderWidth: 1.5 },
  horizon: { flex: 1, height: 44, borderRadius: radius.pill, backgroundColor: colors.ink05, alignItems: 'center', justifyContent: 'center' },
  horizonOn: { backgroundColor: colors.ink },
  summary: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.md, backgroundColor: colors.accentSoft, marginTop: space.xs },
});
