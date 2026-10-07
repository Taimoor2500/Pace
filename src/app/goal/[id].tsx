import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { IconBadge } from '@/components/icon-badge';
import { BackButton, IconButton, NavHeader } from '@/components/nav-header';
import { ProgressBar } from '@/components/progress-bar';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { Txt } from '@/components/text';
import { longDate, rs, shortDate } from '@/lib/format';
import { JapanArt } from '@/illustrations/japan';
import { goalProjection } from '@/store/selectors';
import { useStore } from '@/store/store';
import { colors, radius, space, tints } from '@/theme';

export default function GoalDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { state, updateGoal } = useStore();
  const goal = state.goals.find((g) => g.id === id);

  if (!goal) {
    return (
      <Screen>
        <NavHeader />
        <Txt variant="title">This goal no longer exists.</Txt>
      </Screen>
    );
  }

  const tint = tints[goal.tint];
  const p = goalProjection(goal);
  const pct = Math.min(100, Math.round((p.saved / goal.target) * 100));
  const done = p.remaining === 0;

  const toggleAuto = (on: boolean) => {
    if (on && goal.monthly <= 0) router.push({ pathname: '/add-money', params: { goal: goal.id, mode: 'monthly' } });
    else updateGoal(goal.id, { autoSave: on });
  };

  return (
    <Screen
      edgeToEdgeTop
      contentStyle={{ paddingHorizontal: 0 }}
      footer={
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Button label="Add money" icon="add" onPress={() => router.push({ pathname: '/add-money', params: { goal: goal.id } })} style={{ flex: 1 }} />
          <Button
            label="Withdraw"
            icon="arrow-up"
            variant="secondary"
            disabled={p.saved <= 0}
            onPress={() => router.push({ pathname: '/add-money', params: { goal: goal.id, mode: 'withdraw' } })}
            style={{ flex: 1 }}
          />
        </View>
      }
    >
      <View style={{ height: 240 + insets.top, backgroundColor: tint.bg }}>
        {goal.art === 'japan' ? (
          <JapanArt height={240 + insets.top} />
        ) : (
          <View style={styles.fallbackArt}>
            <IconBadge icon={goal.icon} tint={goal.tint} size={112} />
          </View>
        )}
        <View style={[styles.topBar, { top: insets.top + space.xs }]}>
          <BackButton light />
          <IconButton icon="create-outline" label="Edit goal" light onPress={() => router.push({ pathname: '/add-goal', params: { id: goal.id } })} />
        </View>
      </View>

      <View style={styles.sheet}>
        <View style={{ gap: space.xxs }}>
          <Txt variant="display" style={{ fontSize: 28 }}>{goal.name} {goal.flag}</Txt>
          <Txt variant="title" money style={{ fontSize: 24, lineHeight: 30 }}>{rs(p.saved)}</Txt>
          <Txt variant="caption" money>of {rs(goal.target)}</Txt>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <ProgressBar value={p.saved / goal.target} color={done ? colors.accent : tint.fg} height={10} style={{ flex: 1 }} />
          <Txt variant="captionStrong" money>{pct}%</Txt>
        </View>

        <View style={[styles.pace, { backgroundColor: done ? colors.accentSoft : p.onTrack ? '#F6F7FB' : tints.amber.bg }]}>
          <IconBadge icon={done ? 'trophy' : 'calendar'} tint={done ? 'green' : p.onTrack ? 'red' : 'amber'} size={40} rounded={false} />
          <Txt variant="caption" style={{ flex: 1, color: colors.ink80, fontSize: 13, lineHeight: 18 }}>
            {done
              ? 'Goal reached! Time to make it happen. 🎉'
              : p.ready
                ? <>At {rs(goal.monthly)}/month you’ll be ready by <Txt variant="captionStrong" style={{ fontSize: 13 }}>{longDate(p.ready)}</Txt>{p.onTrack ? ' — on track for your target.' : `, after your ${longDate(new Date(goal.targetDate))} target. Try saving a little more each month.`}</>
                : 'Set a monthly amount to see when you’ll get there.'}
          </Txt>
        </View>

        <Card style={styles.autoCard}>
          <IconBadge icon="repeat" tint="green" size={40} rounded={false} />
          <Pressable style={{ flex: 1 }} onPress={() => router.push({ pathname: '/add-money', params: { goal: goal.id, mode: 'monthly' } })}>
            <Txt variant="bodyStrong">Auto-save {goal.monthly > 0 ? rs(goal.monthly) : ''}</Txt>
            <Txt variant="caption">
              {goal.autoSave ? `Added every payday (day ${state.payday}) · tap to change` : 'Move money in automatically each payday'}
            </Txt>
          </Pressable>
          <Switch
            value={!!goal.autoSave}
            onValueChange={toggleAuto}
            disabled={done}
            trackColor={{ true: colors.accent, false: colors.ink10 }}
            thumbColor={colors.surface}
            accessibilityLabel="Auto-save"
          />
        </Card>

        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Card style={styles.mini}>
            <Ionicons name="flag-outline" size={20} color={colors.ink60} />
            <View>
              <Txt variant="bodyStrong" money>{rs(p.remaining)}</Txt>
              <Txt variant="caption">to go</Txt>
            </View>
          </Card>
          <Card style={styles.mini}>
            <Ionicons name="hourglass-outline" size={20} color={colors.ink60} />
            <View>
              <Txt variant="bodyStrong" money>{p.monthsToTarget} months</Txt>
              <Txt variant="caption">to target date</Txt>
            </View>
          </Card>
        </View>

        <View>
          <SectionHeader title="Contributions" />
          {goal.contributions.length ? (
            <Card style={{ paddingVertical: space.xxs }}>
              {goal.contributions.slice(0, 8).map((c, i) => {
                const out = c.amount < 0;
                return (
                  <View key={c.id} style={[styles.row, i > 0 && styles.divider]}>
                    <IconBadge
                      icon={out ? 'arrow-up' : c.label === 'Auto-save' || c.label.startsWith('Salary') ? 'repeat' : c.label === 'Opening balance' ? 'flag' : 'hand-left'}
                      tint={out ? 'red' : c.label === 'Auto-save' || c.label.startsWith('Salary') ? 'green' : 'amber'}
                      size={36}
                      rounded={false}
                    />
                    <View style={{ flex: 1 }}>
                      <Txt variant="bodyStrong">{c.label}</Txt>
                      <Txt variant="caption">{shortDate(new Date(c.date))}, {new Date(c.date).getFullYear()}</Txt>
                    </View>
                    <Txt variant="bodyStrong" money style={{ color: out ? colors.danger : colors.accent }}>
                      {out ? '-' : '+'}{rs(Math.abs(c.amount))}
                    </Txt>
                  </View>
                );
              })}
            </Card>
          ) : (
            <Card style={{ alignItems: 'center', gap: space.xs, paddingVertical: space.lg }}>
              <Txt style={{ fontSize: 32 }}>🪴</Txt>
              <Txt variant="bodyStrong">Plant the first seed</Txt>
              <Txt variant="caption" style={{ textAlign: 'center' }}>Even Rs. 1,000 today gets the ball rolling.</Txt>
            </Card>
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fallbackArt: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: { position: 'absolute', left: space.md, right: space.md, flexDirection: 'row', justifyContent: 'space-between' },
  sheet: {
    marginTop: -space.xl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.canvas,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    gap: space.md,
  },
  pace: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.sm, borderRadius: radius.md },
  autoCard: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.sm },
  mini: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.ink10 },
});
