import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addDays, formatNumber, isSameDay, longDate, rs, startOfDay } from '@/lib/format';
import { guessPocket } from '@/lib/categorize';
import { confirm } from '@/lib/confirm';
import { pocketStatuses } from '@/store/selectors';
import { useStore } from '@/store/store';
import type { Transaction } from '@/store/types';
import { colors, fonts, radius, shadow, space, tints } from '@/theme';
import { Button } from './button';
import { haptic } from './haptics';
import { IconButton } from './nav-header';
import { PressableScale } from './pressable-scale';
import { Segmented } from './segmented';
import { Txt } from './text';
import { close } from '@/lib/nav';

type Kind = 'expense' | 'income';

type Props = {
  /** Editing an existing transaction. */
  existing?: Transaction;
  /** Prefill for new transactions (e.g. from a pace:// deep link). */
  initial?: { amount?: number; merchant?: string; kind?: Kind };
};

export function TransactionForm({ existing, initial }: Props) {
  const insets = useSafeAreaInsets();
  const { state, addTransaction, updateTransaction, deleteTransaction } = useStore();
  const editing = !!existing;

  const [kind, setKind] = useState<Kind>(existing ? (existing.amount > 0 ? 'income' : 'expense') : initial?.kind ?? 'expense');
  const [amount, setAmount] = useState(existing ? Math.abs(existing.amount) : initial?.amount ?? 0);
  const [merchant, setMerchant] = useState(existing?.merchant ?? initial?.merchant ?? '');
  const [pocketId, setPocketId] = useState<string | undefined>(
    existing?.pocketId ??
      (initial?.merchant ? guessPocket(initial.merchant, state.pockets.map((p) => p.id), state.rules) : undefined) ??
      state.pockets.find((p) => !p.fixed)?.id ??
      state.pockets[0]?.id,
  );
  const [date, setDate] = useState(existing ? new Date(existing.date) : new Date());
  const [goalId, setGoalId] = useState<string | undefined>(existing?.goalId);
  const [saved, setSaved] = useState(false);
  const pop = useRef(new Animated.Value(0)).current;

  // Suggest a pocket as the user types a merchant we recognise.
  useEffect(() => {
    if (editing || kind !== 'expense' || !merchant) return;
    const guess = guessPocket(merchant, state.pockets.map((p) => p.id), state.rules);
    if (guess) setPocketId(guess);
  }, [merchant, kind, editing, state.pockets, state.rules]);

  const pocket = state.pockets.find((p) => p.id === pocketId);
  const canSave = amount > 0 && (kind === 'income' || !!pocket);

  const save = () => {
    if (!canSave) return;
    const when = new Date(date);
    if (!editing && isSameDay(when, new Date())) {
      const n = new Date();
      when.setHours(n.getHours(), n.getMinutes());
    }
    const fields = {
      merchant: merchant.trim() || (kind === 'income' ? 'Income' : pocket!.name),
      amount: kind === 'income' ? amount : -amount,
      date: when.toISOString(),
      pocketId: kind === 'expense' ? pocketId : undefined,
      note: kind === 'income' ? 'Income' : pocket!.name,
      goalId: kind === 'expense' ? goalId : undefined,
    };
    if (editing) {
      updateTransaction(existing!.id, { ...fields, needsReview: false });
      haptic.success();
      close();
      return;
    }
    addTransaction({ ...fields, source: 'manual' });
    haptic.success();
    setSaved(true);
  };

  const remove = async () => {
    if (!existing) return;
    if (await confirm('Delete transaction?', `${existing.merchant} · ${rs(Math.abs(existing.amount))}`)) {
      deleteTransaction(existing.id);
      close();
    }
  };

  useEffect(() => {
    if (!saved) return;
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, bounciness: 14, speed: 10 }).start();
    const t = setTimeout(() => close(), 1300);
    return () => clearTimeout(t);
  }, [saved, pop]);

  if (saved) {
    const left = pocket ? pocketStatuses(state).find((p) => p.id === pocket.id)?.left ?? 0 : 0;
    return (
      <View style={[styles.root, styles.success]}>
        <Animated.View style={[styles.successBadge, { transform: [{ scale: pop }] }]}>
          <Ionicons name="checkmark" size={48} color={colors.onInk} />
        </Animated.View>
        <Txt variant="title">Saved</Txt>
        <Txt variant="body" style={{ textAlign: 'center' }}>
          {kind === 'income'
            ? `${rs(amount)} added to this month’s income 💸`
            : left >= 0
              ? `${rs(left)} left in ${pocket!.name}. Nicely tracked ✨`
              : `${pocket!.name} is ${rs(-left)} over — you’ve got this.`}
        </Txt>
      </View>
    );
  }

  const today = startOfDay(new Date());
  const dayChips = [0, -1, -2].map((offset) => ({ offset, d: addDays(today, offset) }));

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? space.md : insets.top + space.xs }]}>
        {editing ? <IconButton icon="trash-outline" label="Delete transaction" onPress={remove} /> : <View style={{ width: 44 }} />}
        <Txt variant="bodyStrong">{editing ? 'Edit Transaction' : kind === 'income' ? 'Add Income' : 'Add Expense'}</Txt>
        <IconButton icon="close" label="Close" onPress={() => close()} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Segmented
          fill
          value={kind}
          onChange={setKind}
          options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]}
        />

        <View style={[styles.amountCard, shadow(1)]}>
          <Txt variant="title" style={{ color: colors.ink40 }}>Rs.</Txt>
          <TextInput
            autoFocus={!editing}
            value={amount ? formatNumber(amount) : ''}
            onChangeText={(t) => setAmount(Number(t.replace(/\D/g, '')) || 0)}
            placeholder="0"
            placeholderTextColor={colors.ink10}
            keyboardType="number-pad"
            accessibilityLabel="Amount"
            style={[styles.amountInput, kind === 'income' && { color: colors.accent }]}
            maxLength={11}
          />
        </View>

        {existing?.needsReview && (
          <View style={styles.reviewNote}>
            <Ionicons name="alert-circle" size={16} color={tints.amber.fg} />
            <Txt variant="caption" style={{ flex: 1 }}>Imported automatically — pick a pocket to confirm. Pace will remember it for {existing.merchant}.</Txt>
          </View>
        )}

        {kind === 'expense' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.xs }}>
            {state.pockets.map((p) => {
              const on = p.id === pocketId;
              const t = tints[p.tint];
              return (
                <PressableScale
                  key={p.id}
                  onPress={() => setPocketId(p.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={p.name}
                  style={[styles.cat, { backgroundColor: on ? t.bg : colors.surface, borderColor: on ? t.fg : colors.hairline }]}
                >
                  <Ionicons name={p.icon} size={24} color={t.fg} />
                  <Txt variant="caption" numberOfLines={1} style={{ color: on ? t.fg : colors.ink60, fontSize: 11, maxWidth: 68 }}>{p.name.split(' ')[0]}</Txt>
                </PressableScale>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.field}>
          <Ionicons name="calendar-outline" size={20} color={colors.ink60} />
          <Txt variant="body" style={{ flex: 1, color: colors.ink }}>{longDate(date)}</Txt>
          <Pressable onPress={() => setDate(addDays(date, -1))} hitSlop={8} style={styles.dateBtn} accessibilityLabel="Previous day">
            <Ionicons name="chevron-back" size={18} color={colors.ink} />
          </Pressable>
          <Pressable
            onPress={() => addDays(date, 1) <= addDays(today, 1) && setDate(addDays(date, 1))}
            hitSlop={8}
            style={[styles.dateBtn, startOfDay(date) >= today && { opacity: 0.3 }]}
            accessibilityLabel="Next day"
          >
            <Ionicons name="chevron-forward" size={18} color={colors.ink} />
          </Pressable>
        </View>
        <View style={styles.chips}>
          {dayChips.map(({ offset, d }) => {
            const on = isSameDay(d, date);
            return (
              <Pressable key={offset} onPress={() => setDate(d)} style={[styles.chip, on && styles.chipOn]}>
                <Txt variant="captionStrong" style={{ color: on ? colors.onInk : colors.ink60 }}>
                  {offset === 0 ? 'Today' : offset === -1 ? 'Yesterday' : '2 days ago'}
                </Txt>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.field}>
          <Ionicons name={kind === 'income' ? 'briefcase-outline' : 'storefront-outline'} size={20} color={colors.ink60} />
          <TextInput
            value={merchant}
            onChangeText={setMerchant}
            placeholder={kind === 'income' ? 'From? (e.g. Salary)' : 'Where? (e.g. KFC)'}
            placeholderTextColor={colors.ink40}
            style={styles.textInput}
            returnKeyType="done"
          />
        </View>

        {kind === 'expense' && state.goals.length > 0 && (
          <View style={[styles.field, { flexWrap: 'wrap' }]}>
            <Ionicons name="flag-outline" size={20} color={colors.ink60} />
            <Txt variant="body" style={{ flex: 1, color: colors.ink }}>For a goal</Txt>
            <Switch
              value={!!goalId}
              onValueChange={(on) => setGoalId(on ? state.goals[0].id : undefined)}
              trackColor={{ true: colors.accent, false: colors.ink10 }}
              thumbColor={colors.surface}
            />
            {!!goalId && (
              <View style={[styles.chips, { width: '100%', paddingTop: space.xs, marginTop: 0 }]}>
                {state.goals.map((g) => (
                  <Pressable key={g.id} onPress={() => setGoalId(g.id)} style={[styles.chip, goalId === g.id && styles.chipOn]}>
                    <Txt variant="captionStrong" style={{ color: goalId === g.id ? colors.onInk : colors.ink60 }}>{g.name}</Txt>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <View style={{ paddingHorizontal: space.lg, paddingBottom: Math.max(insets.bottom, space.md) + space.xs, paddingTop: space.xs }}>
        <Button label={editing ? 'Save Changes' : kind === 'income' ? 'Save Income' : 'Save Expense'} onPress={save} disabled={!canSave} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingBottom: space.xs },
  body: { paddingHorizontal: space.lg, paddingTop: space.sm, gap: space.md, paddingBottom: space.lg },
  amountCard: { flexDirection: 'row', alignItems: 'center', gap: space.xs, height: 96, paddingHorizontal: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline },
  amountInput: { flex: 1, minWidth: 0, fontFamily: fonts.bold, fontSize: 40, color: colors.ink, padding: 0, fontVariant: ['tabular-nums'] },
  reviewNote: { flexDirection: 'row', alignItems: 'center', gap: space.xs, padding: space.sm, borderRadius: radius.md, backgroundColor: tints.amber.bg },
  cat: { width: 76, height: 76, borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', gap: 4 },
  field: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 56, paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline },
  dateBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.ink05, alignItems: 'center', justifyContent: 'center' },
  textInput: { flex: 1, minWidth: 0, fontFamily: fonts.regular, fontSize: 15, color: colors.ink, padding: 0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginTop: -space.xs },
  chip: { paddingHorizontal: space.sm, height: 32, borderRadius: radius.pill, backgroundColor: colors.ink05, justifyContent: 'center' },
  chipOn: { backgroundColor: colors.ink },
  success: { alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingHorizontal: space.xl },
  successBadge: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginBottom: space.md, ...shadow(3, colors.accent) },
});
