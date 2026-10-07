import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Card } from '@/components/card';
import { IconBadge } from '@/components/icon-badge';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { Txt } from '@/components/text';
import { TransactionRow } from '@/components/transaction-row';
import { formatNumber, greeting, isSameMonth, relativeDay, rs, shortDate, startOfDay, time } from '@/lib/format';
import { today as todayStats, weeklyChange } from '@/store/selectors';
import { useStore } from '@/store/store';
import type { IconName } from '@/store/types';
import { colors, radius, shadow, space, tints } from '@/theme';

export default function Today() {
  const { state, updateProfile } = useStore();
  const now = new Date();
  const t = todayStats(state, now);
  const foodPocket = state.pockets.find((p) => p.id === 'food') ?? state.pockets.find((p) => /food|dining/i.test(p.name));
  const dining = foodPocket ? weeklyChange(state, foodPocket.id, now) : { pct: 0, saved: 0, hasData: false };
  const bills = [...state.bills].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 3);
  const recent = state.transactions.slice(0, 4);
  const review = state.transactions.filter((x) => x.needsReview).length;
  const onTrack = t.ahead >= 0;
  const hasSpending = state.transactions.some((x) => x.amount < 0);
  const spentThisMonth = state.transactions.some((x) => x.amount < 0 && isSameMonth(new Date(x.date), now));

  const steps: { done: boolean; label: string; icon: IconName; href: Parameters<typeof router.push>[0] }[] = [
    { done: hasSpending, label: 'Log your first expense', icon: 'add-circle', href: '/add-expense' },
    { done: state.bills.length > 0, label: 'Add your monthly bills', icon: 'receipt', href: '/bill-form' },
    {
      done: state.transactions.some((x) => x.source === 'sms' || x.source === 'statement' || x.source === 'sample'),
      label: state.trackingMethods.includes('statement') && !state.trackingMethods.includes('notifications') ? 'Import a bank statement' : 'Import bank SMS',
      icon: 'download',
      href: state.trackingMethods.includes('statement') && !state.trackingMethods.includes('notifications') ? '/import-statement' : '/import-sms',
    },
    { done: state.goals.length > 0, label: 'Set a savings goal', icon: 'flag', href: '/add-goal' },
  ];
  const showSetup = !state.setupDismissed && steps.some((s) => !s.done);

  return (
    <Screen tabs>
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 4 }}>
          <Txt variant="title" style={{ fontSize: 20 }}>{greeting(now)},{'\n'}{state.name} 👋</Txt>
          <Txt variant="caption" style={{ fontSize: 13 }}>
            {!hasSpending ? 'Let’s get your month started.' : onTrack ? 'You’re on track this month!' : 'A little ahead of plan — let’s ease off.'}
          </Txt>
        </View>
        <PressableScale onPress={() => router.push('/settings')} style={styles.avatar} accessibilityLabel="Settings">
          <Txt variant="bodyStrong" style={{ color: tints.pink.fg }}>{state.name.slice(0, 1).toUpperCase()}</Txt>
        </PressableScale>
      </View>

      {/* Hero — the single most important number on the screen. */}
      <View style={[styles.heroWrap, shadow(2, colors.accent)]}>
        <LinearGradient colors={['#F3FBF0', '#E4F5E8', '#F4F8E2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <Svg style={styles.glow}>
            <Defs>
              <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor="#A6E07A" stopOpacity={0.45} />
                <Stop offset="1" stopColor="#A6E07A" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx="50%" cy="50%" r="50%" fill="url(#glow)" />
          </Svg>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Txt variant="display" money style={{ fontSize: 40, lineHeight: 48 }}>
                <Txt variant="title" style={{ fontSize: 24 }}>Rs. </Txt>
                {formatNumber(t.safeToday)}
              </Txt>
              <Txt variant="body">safe to spend today</Txt>
            </View>
            <PressableScale onPress={() => router.push('/plan')} style={styles.heroBtn} accessibilityLabel="Open plan">
              <Ionicons name="arrow-forward" size={20} color={colors.onInk} />
            </PressableScale>
          </View>

          <View style={{ marginTop: space.lg }}>
            <View style={styles.paceTrack}>
              <View style={[styles.paceFill, { width: `${t.progress * 100}%` }]} />
              <View style={[styles.paceDot, { left: `${t.progress * 100}%` }]} />
              <View style={styles.paceEnd} />
            </View>
            <View style={styles.paceLabels}>
              <Txt variant="caption">Today</Txt>
              <Txt variant="caption" style={{ textAlign: 'right' }}>Payday{'\n'}{shortDate(t.payday)}</Txt>
            </View>
          </View>

          <View style={styles.aheadRow}>
            <Ionicons name={onTrack ? 'trending-up' : 'trending-down'} size={16} color={onTrack ? colors.accent : colors.danger} />
            <Txt variant="captionStrong" style={{ color: onTrack ? colors.accent : colors.danger }}>
              {!spentThisMonth
                ? 'Nothing spent yet this month — full budget ready'
                : onTrack ? `You’re ${rs(t.ahead)} ahead of pace` : `${rs(t.ahead)} over pace so far`}
            </Txt>
          </View>
        </LinearGradient>
      </View>

      {showSetup && (
        <Card style={{ gap: space.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Txt variant="bodyStrong" style={{ flex: 1 }}>Get set up</Txt>
            <Txt variant="caption">{steps.filter((s) => s.done).length}/{steps.length}</Txt>
            <Pressable onPress={() => updateProfile({ setupDismissed: true })} hitSlop={12} style={{ marginLeft: space.sm }} accessibilityLabel="Hide setup checklist">
              <Ionicons name="close" size={18} color={colors.ink40} />
            </Pressable>
          </View>
          {steps.map((s) => (
            <Pressable
              key={s.label}
              onPress={() => router.push(s.href)}
              disabled={s.done}
              style={({ pressed }) => [styles.step, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name={s.done ? 'checkmark-circle' : s.icon} size={22} color={s.done ? colors.accent : colors.ink60} />
              <Txt variant="body" style={[{ flex: 1, color: colors.ink }, s.done && { color: colors.ink40, textDecorationLine: 'line-through' }]}>{s.label}</Txt>
              {!s.done && <Ionicons name="chevron-forward" size={16} color={colors.ink40} />}
            </Pressable>
          ))}
        </Card>
      )}

      {bills.length > 0 && (
        <View>
          <SectionHeader title="Coming up" onAction={() => router.push({ pathname: '/plan', params: { tab: 'bills' } })} />
          <Card style={{ paddingVertical: space.xxs }}>
            {bills.map((b, i) => {
              const due = new Date(b.dueDate);
              const overdue = due < startOfDay(now);
              return (
                <Pressable
                  key={b.id}
                  onPress={() => router.push({ pathname: '/bill-form', params: { id: b.id } })}
                  style={({ pressed }) => [styles.billRow, i > 0 && styles.divider, pressed && { opacity: 0.6 }]}
                >
                  <IconBadge icon={b.icon} tint={b.tint} size={40} rounded={false} />
                  <View style={{ flex: 1 }}>
                    <Txt variant="bodyStrong">{b.name}</Txt>
                    <Txt variant="caption" style={overdue ? { color: colors.danger } : undefined}>
                      {overdue ? `Overdue · ${shortDate(due)}` : relativeDay(due, now)}
                    </Txt>
                  </View>
                  <Txt variant="bodyStrong" money>-{rs(b.amount)}</Txt>
                </Pressable>
              );
            })}
          </Card>
        </View>
      )}

      {dining.hasData && dining.pct > 0 && (
        <View style={styles.nudge}>
          <Txt style={{ fontSize: 28 }}>🔥</Txt>
          <View style={{ flex: 1 }}>
            <Txt variant="bodyStrong">Nice! 🎉</Txt>
            <Txt variant="caption" style={{ color: colors.ink80, fontSize: 13, lineHeight: 18 }}>
              Dining is down {dining.pct}% this week. That’s {rs(dining.saved)} less than usual.
            </Txt>
          </View>
        </View>
      )}
      {dining.hasData && dining.pct < -15 && (
        <View style={[styles.nudge, { backgroundColor: tints.blue.bg }]}>
          <Txt style={{ fontSize: 28 }}>💡</Txt>
          <Txt variant="caption" style={{ flex: 1, color: colors.ink80, fontSize: 13, lineHeight: 18 }}>
            Dining is {-dining.pct}% higher than a usual week. A home-cooked dinner or two keeps you on pace.
          </Txt>
        </View>
      )}

      <View>
        <SectionHeader title="Recent" onAction={state.transactions.length ? () => router.push('/transactions') : undefined} />
        {review > 0 && (
          <PressableScale onPress={() => router.push({ pathname: '/transactions', params: { filter: 'review' } })} style={styles.review}>
            <Ionicons name="alert-circle" size={18} color={tints.amber.fg} />
            <Txt variant="captionStrong" style={{ flex: 1 }}>{review} transaction{review > 1 ? 's need' : ' needs'} a quick review</Txt>
            <Ionicons name="chevron-forward" size={16} color={colors.ink40} />
          </PressableScale>
        )}
        {recent.length ? (
          <Card style={{ paddingVertical: space.xxs }}>
            {recent.map((tx) => {
              const pocket = state.pockets.find((p) => p.id === tx.pocketId);
              return (
                <TransactionRow
                  key={tx.id}
                  tx={tx}
                  pocket={pocket}
                  subtitle={`${relativeDay(new Date(tx.date), now)}, ${time(new Date(tx.date))}`}
                  trailingCaption={pocket?.name ?? tx.note}
                  onPress={() => router.push(`/transaction/${tx.id}`)}
                />
              );
            })}
          </Card>
        ) : (
          <Card style={styles.empty}>
            <Txt style={{ fontSize: 36 }}>🧾</Txt>
            <Txt variant="bodyStrong">No spending logged yet</Txt>
            <Txt variant="caption" style={{ textAlign: 'center' }}>Tap the green + below after you buy something — it takes about five seconds.</Txt>
          </Card>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingTop: space.xs },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: tints.pink.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surface, ...shadow(1) },
  heroWrap: { borderRadius: radius.xl, backgroundColor: colors.surface },
  hero: { borderRadius: radius.xl, padding: space.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.accent12 },
  glow: { position: 'absolute', top: -90, right: -80, width: 260, height: 260, pointerEvents: 'none' },
  heroBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  paceTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(14,17,22,0.08)', justifyContent: 'center' },
  paceFill: { position: 'absolute', left: 0, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  paceDot: { position: 'absolute', width: 20, height: 20, marginLeft: -10, borderRadius: 10, backgroundColor: colors.accent, borderWidth: 4, borderColor: '#CDEBD6' },
  paceEnd: { position: 'absolute', right: -2, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: colors.ink10, backgroundColor: colors.surface },
  paceLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.sm },
  aheadRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.md, paddingTop: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.accent12 },
  step: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44 },
  billRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.ink10 },
  nudge: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, backgroundColor: '#FFF6E5' },
  review: { flexDirection: 'row', alignItems: 'center', gap: space.xs, padding: space.sm, borderRadius: radius.md, backgroundColor: tints.amber.bg, marginBottom: space.sm },
  empty: { alignItems: 'center', gap: space.xs, paddingVertical: space.lg },
});
