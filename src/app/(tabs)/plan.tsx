import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { haptic } from '@/components/haptics';
import { IconBadge } from '@/components/icon-badge';
import { MonthSwitcher } from '@/components/month-switcher';
import { PressableScale } from '@/components/pressable-scale';
import { ProgressBar } from '@/components/progress-bar';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { Txt } from '@/components/text';
import { TransactionRow } from '@/components/transaction-row';
import { isSameMonth, relativeDay, rs, shortDate, startOfDay } from '@/lib/format';
import { incomeIn, pace, pocketStatuses, totalBudget, totalSpent } from '@/store/selectors';
import { useStore } from '@/store/store';
import { colors, radius, space, tints } from '@/theme';

type Tab = 'spending' | 'bills' | 'income';

export default function Plan() {
  const params = useLocalSearchParams<{ tab?: Tab }>();
  const [tab, setTab] = useState<Tab>(params.tab ?? 'spending');
  const [month, setMonth] = useState(() => new Date());
  useEffect(() => {
    if (params.tab) setTab(params.tab);
  }, [params.tab]);

  const { state, payBill } = useStore();
  const now = new Date();
  const current = isSameMonth(month, now);
  const pockets = pocketStatuses(state, month);
  const p = pace(state, month, now);
  const budget = totalBudget(state);
  const underPct = budget > 0 ? Math.round((p.ahead / budget) * 100) : 0;
  const income = incomeIn(state, month);
  const incomeTotal = income.reduce((s, t) => s + t.amount, 0);
  const bills = [...state.bills].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const today = startOfDay(now);

  return (
    <Screen tabs>
      <View style={styles.titleRow}>
        <Txt variant="display" style={{ fontSize: 28 }}>Your Pockets</Txt>
        <MonthSwitcher month={month} onChange={setMonth} />
      </View>

      <Segmented
        fill
        value={tab}
        onChange={setTab}
        options={[
          { value: 'spending', label: 'Spending' },
          { value: 'bills', label: 'Bills' },
          { value: 'income', label: 'Income' },
        ]}
      />

      {tab === 'spending' && (
        <>
          <View style={styles.summary}>
            <View>
              <Txt variant="caption">Spent {current ? 'this month' : 'in month'}</Txt>
              <Txt variant="title" money>{rs(totalSpent(state, month))}</Txt>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Txt variant="caption">Planned</Txt>
              <Txt variant="bodyStrong" money style={{ color: colors.ink60 }}>{rs(budget)}</Txt>
            </View>
          </View>
          <View style={styles.grid}>
            {pockets.map((pk) => {
              const tint = tints[pk.tint];
              const over = pk.left < 0;
              return (
                <PressableScale
                  key={pk.id}
                  onPress={() => router.push(`/pocket/${pk.id}`)}
                  accessibilityLabel={`${pk.name}, ${rs(pk.left)} left of ${rs(pk.budget)}`}
                  style={[styles.pocket, { backgroundColor: tint.bg }]}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={styles.pocketIcon}><Ionicons name={pk.icon} size={22} color={tint.fg} /></View>
                    {pk.fixed && <Ionicons name="lock-closed" size={14} color={tint.fg} style={{ opacity: 0.6 }} />}
                  </View>
                  <View style={{ gap: 2 }}>
                    <Txt variant="caption" style={{ color: colors.ink80 }} numberOfLines={1}>{pk.name}</Txt>
                    <Txt variant="bodyStrong" money style={over ? { color: colors.danger } : undefined}>
                      {over ? `${rs(-pk.left)} over` : `${rs(pk.left)} left`}
                    </Txt>
                    <Txt variant="caption" money>of {rs(pk.budget)}</Txt>
                  </View>
                  <ProgressBar value={pk.used} color={over ? colors.danger : tint.fg} track="rgba(255,255,255,0.7)" height={6} />
                </PressableScale>
              );
            })}
            <PressableScale onPress={() => router.push('/pocket-form')} style={[styles.pocket, styles.newPocket]} accessibilityLabel="New pocket">
              <Ionicons name="add-circle-outline" size={28} color={colors.ink40} />
              <Txt variant="captionStrong" style={{ color: colors.ink60 }}>New pocket</Txt>
            </PressableScale>
          </View>
          {p.spent > 0 && (
            <Card style={styles.insight}>
              <View style={styles.insightIcon}><Txt style={{ fontSize: 22 }}>{underPct >= 0 ? '🌱' : '🧭'}</Txt></View>
              <View style={{ flex: 1 }}>
                <Txt variant="bodyStrong">
                  {underPct >= 0 ? `You’re ${underPct}% under budget` : `You’re ${-underPct}% over ${current ? 'pace' : 'budget'}`}
                </Txt>
                <Txt variant="caption">
                  {underPct >= 0
                    ? `Nice job! You’ve spent ${rs(p.ahead)} less than planned${current ? ' so far' : ''}.`
                    : 'Try trimming a flexible pocket — tap one to rebalance.'}
                </Txt>
              </View>
            </Card>
          )}
        </>
      )}

      {tab === 'bills' && (
        <>
          {bills.length ? (
            <Card style={{ paddingVertical: space.xxs }}>
              {bills.map((b, i) => {
                const due = new Date(b.dueDate);
                const overdue = due < today;
                return (
                  <Pressable
                    key={b.id}
                    onPress={() => router.push({ pathname: '/bill-form', params: { id: b.id } })}
                    style={({ pressed }) => [styles.row, i > 0 && styles.divider, pressed && { opacity: 0.6 }]}
                  >
                    <IconBadge icon={b.icon} tint={b.tint} size={40} rounded={false} />
                    <View style={{ flex: 1 }}>
                      <Txt variant="bodyStrong">{b.name}</Txt>
                      <Txt variant="caption" style={overdue ? { color: colors.danger } : undefined}>
                        {overdue ? 'Overdue' : 'Due'} {relativeDay(due, now)} · {rs(b.amount)}{b.recurring ? ' · monthly' : ''}
                      </Txt>
                    </View>
                    <PressableScale
                      onPress={() => { haptic.success(); payBill(b.id); }}
                      style={styles.payBtn}
                      accessibilityLabel={`Mark ${b.name} as paid`}
                    >
                      <Txt variant="captionStrong" style={{ color: colors.accent }}>Mark paid</Txt>
                    </PressableScale>
                  </Pressable>
                );
              })}
            </Card>
          ) : (
            <Empty emoji="🧾" title="No bills yet" body="Add rent, utilities and subscriptions so Pace can remind you and plan around them." />
          )}
          <Button label="Add bill" icon="add" variant="secondary" onPress={() => router.push('/bill-form')} />
        </>
      )}

      {tab === 'income' && (
        <>
          {income.length ? (
            <>
              <View style={styles.summary}>
                <View>
                  <Txt variant="caption">Income {current ? 'this month' : 'in month'}</Txt>
                  <Txt variant="title" money style={{ color: colors.accent }}>{rs(incomeTotal)}</Txt>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Txt variant="caption">Expected</Txt>
                  <Txt variant="bodyStrong" money style={{ color: colors.ink60 }}>{rs(state.income)}</Txt>
                </View>
              </View>
              <Card style={{ paddingVertical: space.xxs }}>
                {income.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    tx={tx}
                    subtitle={shortDate(new Date(tx.date))}
                    trailingCaption={tx.note}
                    onPress={() => router.push(`/transaction/${tx.id}`)}
                  />
                ))}
              </Card>
            </>
          ) : (
            <Empty emoji="💸" title="No income logged" body={current ? 'Log your salary when it lands to see your true net for the month.' : 'Nothing recorded for this month.'} />
          )}
          {current && <Button label="Add income" icon="add" variant="secondary" onPress={() => router.push({ pathname: '/add-expense', params: { type: 'income' } })} />}
        </>
      )}
    </Screen>
  );
}

function Empty({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  return (
    <View style={{ alignItems: 'center', gap: space.xs, paddingVertical: space.xl }}>
      <Txt style={{ fontSize: 48 }}>{emoji}</Txt>
      <Txt variant="title">{title}</Txt>
      <Txt variant="body" style={{ textAlign: 'center', color: colors.ink60 }}>{body}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: space.md, flexWrap: 'wrap', gap: space.xs },
  summary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  pocket: { flexGrow: 1, flexBasis: '45%', borderRadius: radius.lg, padding: space.md, gap: space.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)' },
  newPocket: { backgroundColor: 'transparent', borderStyle: 'dashed', borderColor: colors.ink10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', minHeight: 120 },
  pocketIcon: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: 'rgba(255,255,255,0.75)', alignItems: 'center', justifyContent: 'center' },
  insight: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: '#F5FBF6' },
  insightIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.ink10 },
  payBtn: { paddingHorizontal: space.sm, height: 36, borderRadius: radius.pill, backgroundColor: colors.accentSoft, justifyContent: 'center' },
});
