import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Celebrate } from '@/components/celebrate';
import { IconBadge } from '@/components/icon-badge';
import { NavHeader } from '@/components/nav-header';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/text';
import { addMonths, monthName, rs } from '@/lib/format';
import { Sprout } from '@/illustrations/sprout';
import { monthKey } from '@/store/recurring';
import { monthlyReview, monthStart } from '@/store/selectors';
import { useStore } from '@/store/store';
import type { IconName } from '@/store/types';
import { colors, space, type TintName } from '@/theme';

type Row = { icon: IconName; tint: TintName; label: string; sub: string; value: string; valueSub: string; good: boolean };

function parseMonth(param?: string): Date {
  const m = param?.match(/^(\d{4})-(\d{2})$/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, 1) : addMonths(monthStart(new Date()), -1);
}

const change = (pct: number | null, suffix = '') =>
  pct === null ? 'No earlier data' : `${pct <= 0 ? '↓' : '↑'} ${Math.abs(pct)}%${suffix}`;

export default function Review() {
  const params = useLocalSearchParams<{ month?: string }>();
  const { state } = useStore();
  const month = parseMonth(params.month);
  const r = monthlyReview(state, month);
  const great = r.saved >= 0;
  const name = monthName(month, true);

  if (!r.hasData) {
    return (
      <Screen>
        <NavHeader />
        <View style={{ alignItems: 'center', gap: space.xs, paddingTop: space.xxl }}>
          <Sprout size={140} />
          <Txt variant="title">Nothing to review for {name}</Txt>
          <Txt variant="body" style={{ textAlign: 'center', color: colors.ink60 }}>Your first review appears once you’ve tracked a full month.</Txt>
        </View>
      </Screen>
    );
  }

  const rows: Row[] = [
    {
      icon: 'wallet', tint: 'purple', label: 'Total spending', sub: change(r.changeVsPrev, ' vs month before'),
      value: rs(r.spent), valueSub: `of ${rs(r.planned)} planned`, good: (r.changeVsPrev ?? 0) <= 0,
    },
    ...(r.top
      ? [{
          icon: r.top.icon, tint: r.top.tint, label: 'Top category', sub: `${Math.round(r.top.used * 100)}% of its budget`,
          value: r.top.name, valueSub: change(r.topChange), good: r.top.used <= 1,
        } satisfies Row]
      : []),
    {
      icon: 'flag', tint: 'green', label: 'Goals progress', sub: `${r.goalsFunded} goal${r.goalsFunded === 1 ? '' : 's'} funded`,
      value: `+${rs(r.goalTotal)}`, valueSub: 'saved towards goals', good: r.goalTotal > 0,
    },
    {
      icon: 'flame', tint: 'amber', label: 'Best streak', sub: 'Days in a row under daily budget',
      value: `${r.bestStreak} days`, valueSub: r.bestStreak >= 7 ? 'Great rhythm' : 'Keep building', good: r.bestStreak >= 7,
    },
  ];

  return (
    <Screen footer={<Button label="View Full Report" onPress={() => router.push({ pathname: '/transactions', params: { month: monthKey(month) } })} />}>
      <NavHeader />
      <View style={{ alignItems: 'center', gap: space.xs }}>
        {great ? <Celebrate><Sprout size={168} /></Celebrate> : <Sprout size={168} />}
        <Txt variant="display" style={{ textAlign: 'center', fontSize: 28, lineHeight: 34 }}>
          {great ? `Great month,\n${state.name}! 🎉` : `${name}, reviewed`}
        </Txt>
        <Txt variant="body" style={{ textAlign: 'center', color: colors.ink60, maxWidth: 300 }}>
          {great
            ? `You spent ${rs(r.saved)} less than planned in ${name}.`
            : `You went ${rs(-r.saved)} over plan in ${name}. Small tweaks this month will get you back on pace.`}
        </Txt>
      </View>

      <Card style={{ paddingVertical: space.xxs }}>
        {rows.map((row, i) => (
          <View key={row.label} style={[styles.row, i > 0 && styles.divider]}>
            <IconBadge icon={row.icon} tint={row.tint} size={40} rounded={false} />
            <View style={{ flex: 1 }}>
              <Txt variant="bodyStrong">{row.label}</Txt>
              <Txt variant="caption" style={{ color: row.good ? colors.accent : colors.ink60 }}>{row.sub}</Txt>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Txt variant="bodyStrong" money>{row.value}</Txt>
              <Txt variant="caption">{row.valueSub}</Txt>
            </View>
          </View>
        ))}
      </Card>

      <View style={styles.nudge}>
        <Txt style={{ fontSize: 24 }}>👋</Txt>
        <Txt variant="caption" style={{ flex: 1, color: colors.ink80, fontSize: 13, lineHeight: 18 }}>
          New month, fresh pockets. Check in each morning — it takes ten seconds.
        </Txt>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.ink10 },
  nudge: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: 16, backgroundColor: colors.accentSoft },
});
