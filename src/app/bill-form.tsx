import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { AmountPicker } from '@/components/amount-picker';
import { Button } from '@/components/button';
import { FieldLabel, FormSheet } from '@/components/form-sheet';
import { haptic } from '@/components/haptics';
import { IconButton } from '@/components/nav-header';
import { IconPicker } from '@/components/pickers';
import { TextField } from '@/components/text-field';
import { Txt } from '@/components/text';
import { confirm } from '@/lib/confirm';
import { longDate, startOfDay } from '@/lib/format';
import { useStore } from '@/store/store';
import type { IconName } from '@/store/types';
import { colors, radius, space, tints } from '@/theme';
import { close } from '@/lib/nav';

const BILL_ICONS: IconName[] = ['flash', 'water', 'flame', 'wifi', 'phone-portrait', 'tv', 'card', 'home', 'car', 'school', 'medkit', 'musical-notes'];

/** Next date with the given day-of-month, from today. */
function nextDue(day: number): Date {
  const now = startOfDay(new Date());
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), day);
  return thisMonth >= now ? thisMonth : new Date(now.getFullYear(), now.getMonth() + 1, day);
}

export default function BillForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state, addBill, updateBill, deleteBill } = useStore();
  const existing = state.bills.find((b) => b.id === id);
  const defaultPocket = state.pockets.find((p) => p.fixed)?.id ?? state.pockets[0]?.id;

  const [name, setName] = useState(existing?.name ?? '');
  const [amount, setAmount] = useState(existing?.amount ?? 0);
  const [day, setDay] = useState(existing ? new Date(existing.dueDate).getDate() : new Date().getDate());
  const [recurring, setRecurring] = useState(existing?.recurring ?? true);
  const [icon, setIcon] = useState<IconName>(existing?.icon ?? 'flash');
  const [pocketId, setPocketId] = useState(existing?.pocketId ?? defaultPocket);

  const due = existing && new Date(existing.dueDate).getDate() === day ? new Date(existing.dueDate) : nextDue(day);
  const valid = name.trim().length > 0 && amount > 0;

  const save = () => {
    const fields = { name: name.trim(), amount, dueDate: due.toISOString(), recurring, icon, tint: existing?.tint ?? ('blue' as const), pocketId };
    if (existing) updateBill(existing.id, fields);
    else addBill(fields);
    haptic.success();
    close();
  };

  const remove = async () => {
    if (existing && (await confirm('Delete bill?', `${existing.name} will no longer be tracked.`))) {
      deleteBill(existing.id);
      close();
    }
  };

  return (
    <FormSheet
      title={existing ? 'Edit Bill' : 'New Bill'}
      left={existing ? <IconButton icon="trash-outline" label="Delete bill" onPress={remove} /> : undefined}
      footer={<Button label={existing ? 'Save Changes' : 'Add Bill'} onPress={save} disabled={!valid} />}
    >
      <FieldLabel>Name</FieldLabel>
      <TextField value={name} onChangeText={setName} placeholder="e.g. K-Electric, Netflix, Rent" autoFocus={!existing} />

      <FieldLabel>Amount</FieldLabel>
      <AmountPicker value={amount} onChange={setAmount} presets={[1500, 3500, 5000, 25000]} />

      <FieldLabel>Due on</FieldLabel>
      <View style={styles.stepper}>
        <Pressable onPress={() => setDay(day <= 1 ? 28 : day - 1)} style={styles.stepBtn} accessibilityLabel="Earlier day">
          <Ionicons name="remove" size={20} color={colors.ink} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Txt variant="title">Day {day}</Txt>
          <Txt variant="caption">Next: {longDate(due)}</Txt>
        </View>
        <Pressable onPress={() => setDay(day >= 28 ? 1 : day + 1)} style={styles.stepBtn} accessibilityLabel="Later day">
          <Ionicons name="add" size={20} color={colors.ink} />
        </Pressable>
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Txt variant="bodyStrong">Repeats monthly</Txt>
          <Txt variant="caption">Rolls to next month when you mark it paid</Txt>
        </View>
        <Switch value={recurring} onValueChange={setRecurring} trackColor={{ true: colors.accent, false: colors.ink10 }} thumbColor={colors.surface} />
      </View>

      <FieldLabel>Paid from</FieldLabel>
      <View style={styles.chips}>
        {state.pockets.map((p) => {
          const on = p.id === pocketId;
          return (
            <Pressable key={p.id} onPress={() => setPocketId(p.id)} style={[styles.chip, { backgroundColor: on ? tints[p.tint].bg : colors.surface, borderColor: on ? tints[p.tint].fg : colors.hairline }]}>
              <Txt variant="captionStrong" style={{ color: on ? tints[p.tint].fg : colors.ink60 }}>{p.name}</Txt>
            </Pressable>
          );
        })}
      </View>

      <FieldLabel>Icon</FieldLabel>
      <IconPicker value={icon} onChange={setIcon} tint={existing?.tint ?? 'blue'} icons={BILL_ICONS} />
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space.sm, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline },
  stepBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.ink05, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, marginTop: space.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  chip: { paddingHorizontal: space.sm, height: 36, borderRadius: radius.pill, borderWidth: 1.5, justifyContent: 'center' },
});
