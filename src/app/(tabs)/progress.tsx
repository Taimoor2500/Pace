import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { BarChart } from '@/components/bar-chart';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { MonthSwitcher } from '@/components/month-switcher';
import { IconButton } from '@/components/nav-header';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/text';
import { addMonths, daysInMonth, isSameMonth, monthName, rs } from '@/lib/format';
import { monthKey } from '@/store/recurring';
import { insights, monthlyReview, monthStart, taxSummary, weeklyTrend } from '@/store/selectors';
import { taxYearOf } from '@/lib/charges';
import { useStore } from '@/store/store';
import { colors, radius, space, tints, type TintName } from '@/theme';

type Stat = { emoji: string; value: string; label: string; tint: TintName };

const signed = (n: number) => `${n >= 0 ? '+' : '-'}${rs(n)}`;

export default function Progress() {
  const { state } = useStore();
  const now = new Date();
  const [month, setMonth] = useState(() => monthStart(now));
  const current = isSameMonth(month, now);
  const s = insights(state, month, now);
  const trendEnd = current ? now : new Date(month.getFullYear(), month.getMonth(), daysInMonth(month));
  const trend = weeklyTrend(state, 14, trendEnd);
  const reviewMonth = current ? addMonths(monthStart(now), -1) : month;
  const review = monthlyReview(state, reviewMonth);
  const tax = taxSummary(state, taxYearOf(now));

  const stats: Stat[] = [
    { emoji: '✨', value: String(s.wins), label: 'days under budget', tint: 'purple' },
    { emoji: '🔥', value: `${s.streak} day${s.streak === 1 ? '' : 's'}`, label: current ? 'current streak' : 'streak at month end', tint: 'amber' },
    {
      emoji: '🍽️',
      value: s.diningChange === null ? '—' : `${Math.abs(s.diningChange)}%`,
      label: s.diningChange === null ? 'dining vs last month' : s.diningChange >= 0 ? 'less dining out' : 'more dining out',
      tint: 'red',
    },
    { emoji: '💰', value: signed(s.ahead), label: s.ahead >= 0 ? 'under plan' : 'over plan', tint: 'green' },
    { emoji: '🌿', value: String(s.noSpend), label: 'no-spend days', tint: 'teal' },
    { emoji: '📈', value: signed(s.net), label: 'net (income − spend)', tint: 'blue' },
  ];

  const labels = trend.filter((_, i) => i % 4 === 1).map((b) => monthName(b.start));
  const hasTrend = trend.some((b) => b.total > 0);

  return (
    <Screen tabs>
      <View style={styles.titleRow}>
        <MonthSwitcher month={month} onChange={setMonth} large />
        <IconButton
          icon="share-outline"
          label="Share progress"
          onPress={() =>
            Share.share({
              message: `${monthName(month, true)} on Pace 🌱 ${s.ahead >= 0 ? `${rs(s.ahead)} under plan` : `${rs(-s.ahead)} over plan`}, ${s.wins} days under budget, ${s.streak}-day streak.`,
            })
          }
        />
      </View>

      {!s.hasActivity ? (
        <Card style={styles.empty}>
          <Txt style={{ fontSize: 40 }}>📊</Txt>
          <Txt variant="bodyStrong">No activity {current ? 'yet this month' : `in ${monthName(month, true)}`}</Txt>
          <Txt variant="caption" style={{ textAlign: 'center' }}>
            {current ? 'Log or import a few transactions and your streaks, trends and insights appear here.' : 'Try a more recent month.'}
          </Txt>
          {current && <Button label="Import bank SMS" icon="download" variant="secondary" onPress={() => router.push('/import-sms')} style={{ alignSelf: 'stretch', marginTop: space.xs }} />}
        </Card>
      ) : (
        <View style={styles.grid}>
          {stats.map((st) => (
            <View key={st.label} style={styles.stat}>
              <View style={[styles.statIcon, { backgroundColor: tints[st.tint].bg }]}>
                <Txt style={{ fontSize: 16 }}>{st.emoji}</Txt>
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="bodyStrong" money numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{st.value}</Txt>
                <Txt variant="caption" numberOfLines={2}>{st.label}</Txt>
              </View>
            </View>
          ))}
        </View>
      )}

      {hasTrend && (
        <Card style={{ padding: space.lg }}>
          <View style={styles.trendHeader}>
            <Txt variant="bodyStrong">Spending Trend</Txt>
            {s.vsLast !== null && (
              <View style={[styles.pill, { backgroundColor: s.vsLast <= 0 ? colors.accentSoft : colors.dangerSoft }]}>
                <Txt variant="captionStrong" style={{ color: s.vsLast <= 0 ? colors.accent : colors.danger }}>
                  {s.vsLast > 0 ? '+' : ''}{s.vsLast}% vs last month
                </Txt>
              </View>
            )}
          </View>
          <BarChart
            key={monthKey(month)}
            values={trend.map((b) => b.total)}
            color={tints.blue.fg}
            mutedColor="#C9DBFC"
            height={150}
            initialSelected={trend.length - 1}
            formatValue={(v) => rs(v)}
          />
          <View style={styles.axis}>
            {labels.map((l, i) => <Txt key={i} variant="caption">{l}</Txt>)}
          </View>
          <Txt variant="caption" style={{ marginTop: space.sm }}>Weekly totals · tap a bar for details</Txt>
        </Card>
      )}

      <PressableScale onPress={() => router.push('/taxes')} style={styles.taxCard}>
        <View style={[styles.statIcon, { backgroundColor: tints.purple.bg, width: 44, height: 44 }]}>
          <Ionicons name="receipt" size={22} color={tints.purple.fg} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt variant="bodyStrong">Taxes paid · Tax year {tax.taxYear}</Txt>
          <Txt variant="caption">{tax.items.length ? `${rs(tax.taxTotal)} so far · WHT, FED & more` : 'Track WHT, FED and zakat deducted by your bank'}</Txt>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.ink40} />
      </PressableScale>

      {review.hasData && (
        <PressableScale onPress={() => router.push({ pathname: '/review', params: { month: monthKey(reviewMonth) } })} style={styles.reviewCard}>
          <Txt style={{ fontSize: 32 }}>🌱</Txt>
          <View style={{ flex: 1 }}>
            <Txt variant="bodyStrong" style={{ color: colors.onInk }}>
              {current ? `Your ${monthName(reviewMonth, true)} review is ready` : `${monthName(reviewMonth, true)} review`}
            </Txt>
            <Txt variant="caption" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {review.saved >= 0 ? `You spent ${rs(review.saved)} less than planned` : `${rs(-review.saved)} over plan — see where it went`}
            </Txt>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.onInk} />
        </PressableScale>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: space.md, marginLeft: -space.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  stat: { flexBasis: '45%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: space.xs, padding: space.sm, minHeight: 72, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline },
  statIcon: { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  trendHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md },
  pill: { paddingHorizontal: space.xs, paddingVertical: 4, borderRadius: radius.pill },
  axis: { flexDirection: 'row', justifyContent: 'space-around', marginTop: space.xs },
  taxCard: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline },
  reviewCard: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.ink },
  empty: { alignItems: 'center', gap: space.xs, paddingVertical: space.xl },
});
