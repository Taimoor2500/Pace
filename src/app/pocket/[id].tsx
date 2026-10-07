import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BarChart } from '@/components/bar-chart';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { haptic } from '@/components/haptics';
import { IconBadge } from '@/components/icon-badge';
import { IconButton, NavHeader } from '@/components/nav-header';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { Txt } from '@/components/text';
import { TransactionRow } from '@/components/transaction-row';
import { daysInMonth, isSameMonth, monthName, relativeDay, rs, shortDate, time } from '@/lib/format';
import { dailySpend, pocketStatuses } from '@/store/selectors';
import { useStore } from '@/store/store';
import { colors, radius, space, tints } from '@/theme';

export default function PocketDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, setPocketBudget } = useStore();
  const [editing, setEditing] = useState(false);
  const now = new Date();
  const pocket = pocketStatuses(state, now).find((p) => p.id === id);

  if (!pocket) {
    return (
      <Screen>
        <NavHeader />
        <Txt variant="title">Pocket not found</Txt>
      </Screen>
    );
  }

  const tint = tints[pocket.tint];
  const daily = dailySpend(state, now, pocket.id);
  const recent = state.transactions.filter((t) => t.pocketId === pocket.id && t.amount < 0 && isSameMonth(new Date(t.date), now)).slice(0, 4);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth(), daysInMonth(now));
  const over = pocket.left < 0;

  const step = (delta: number) => {
    haptic.select();
    setPocketBudget(pocket.id, Math.max(0, pocket.budget + delta));
  };

  return (
    <Screen
      footer={
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Button label={editing ? 'Done' : 'Adjust Budget'} onPress={() => setEditing((e) => !e)} style={{ flex: 1 }} />
          <Button label="Move Money" variant="secondary" onPress={() => router.push({ pathname: '/move-money', params: { to: pocket.id } })} style={{ flex: 1 }} />
        </View>
      }
    >
      <NavHeader
        right={<IconButton icon="create-outline" label="Edit pocket" onPress={() => router.push({ pathname: '/pocket-form', params: { id: pocket.id } })} />}
      />

      <View style={{ gap: space.md }}>
        <View style={[styles.hero, { backgroundColor: tint.bg }]}>
          <Ionicons name={pocket.icon} size={48} color={tint.fg} />
        </View>
        <View style={styles.titleRow}>
          <Txt variant="display" style={{ fontSize: 28 }}>{pocket.name}</Txt>
          <Txt variant="caption">{monthName(now, true)}</Txt>
        </View>
        <View>
          <Txt variant="title" money style={{ fontSize: 24, lineHeight: 30, color: over ? colors.danger : colors.ink }}>
            {over ? `${rs(-pocket.left)} over` : `${rs(pocket.left)} left`}
          </Txt>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Txt variant="caption" money>of {rs(pocket.budget)}</Txt>
            <Txt variant="caption" money>{Math.round(pocket.used * 100)}% used</Txt>
          </View>
        </View>
      </View>

      {editing && (
        <Card style={styles.editor}>
          <Txt variant="caption">Monthly budget</Txt>
          <View style={styles.stepper}>
            <PressableScale onPress={() => step(-1000)} style={styles.stepBtn} accessibilityLabel="Decrease by 1,000">
              <Ionicons name="remove" size={22} color={colors.ink} />
            </PressableScale>
            <Txt variant="title" money>{rs(pocket.budget)}</Txt>
            <PressableScale onPress={() => step(1000)} style={styles.stepBtn} accessibilityLabel="Increase by 1,000">
              <Ionicons name="add" size={22} color={colors.ink} />
            </PressableScale>
          </View>
          <View style={styles.chips}>
            {[-5000, 5000, 10000].map((d) => (
              <PressableScale key={d} onPress={() => step(d)} style={styles.chip}>
                <Txt variant="captionStrong" money>{d > 0 ? '+' : '-'}{rs(Math.abs(d)).replace('Rs. ', '')}</Txt>
              </PressableScale>
            ))}
          </View>
        </Card>
      )}

      <Card style={{ padding: space.lg }}>
        <BarChart
          values={daily}
          color={tint.fg}
          mutedColor={tint.bg}
          lastActive={now.getDate() - 1}
          reference={pocket.budget / daily.length}
          startLabel={shortDate(monthStart)}
          endLabel={shortDate(monthEnd)}
          height={120}
        />
        <View style={styles.legend}>
          <View style={styles.legendDash} />
          <Txt variant="caption">Daily budget · {rs(pocket.budget / daily.length)}</Txt>
        </View>
      </Card>

      <View>
        <SectionHeader title="Recent spending" onAction={() => router.push({ pathname: '/transactions', params: { pocket: pocket.id } })} />
        {recent.length ? (
          <Card style={{ paddingVertical: space.xxs }}>
            {recent.map((tx) => (
              <TransactionRow
                key={tx.id}
                tx={tx}
                pocket={pocket}
                subtitle={`${relativeDay(new Date(tx.date), now)}, ${time(new Date(tx.date))}`}
                onPress={() => router.push(`/transaction/${tx.id}`)}
              />
            ))}
          </Card>
        ) : (
          <Card style={{ alignItems: 'center', gap: space.xs, paddingVertical: space.lg }}>
            <Txt style={{ fontSize: 32 }}>🫙</Txt>
            <Txt variant="bodyStrong">Nothing spent yet</Txt>
            <Txt variant="caption">Your full {rs(pocket.budget)} is ready when you need it.</Txt>
            <Button label="Log an expense" icon="add" variant="secondary" onPress={() => router.push('/add-expense')} style={{ alignSelf: 'stretch', marginTop: space.xs }} />
          </Card>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { width: 96, height: 96, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  editor: { gap: space.sm },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.ink05, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', gap: space.xs },
  chip: { flex: 1, height: 40, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.ink10, alignItems: 'center', justifyContent: 'center' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.sm },
  legendDash: { width: 16, borderTopWidth: 1, borderStyle: 'dashed', borderColor: colors.ink40 },
});
