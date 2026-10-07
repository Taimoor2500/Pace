import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { IconBadge } from '@/components/icon-badge';
import { PressableScale } from '@/components/pressable-scale';
import { ProgressBar } from '@/components/progress-bar';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/text';
import { longDate, rs } from '@/lib/format';
import { JapanArt } from '@/illustrations/japan';
import { goalSaved } from '@/store/selectors';
import { useStore } from '@/store/store';
import type { Goal } from '@/store/types';
import { colors, radius, shadow, space, tints } from '@/theme';

export default function Goals() {
  const { state } = useStore();
  const [featured, ...rest] = state.goals;

  return (
    <Screen tabs>
      <View style={styles.titleRow}>
        <Txt variant="display" style={{ fontSize: 28 }}>Your Goals</Txt>
        <PressableScale onPress={() => router.push('/add-goal')} style={styles.add} accessibilityLabel="Add goal">
          <Ionicons name="add" size={24} color={colors.ink} />
        </PressableScale>
      </View>

      {!featured ? (
        <View style={styles.empty}>
          <Txt style={{ fontSize: 56 }}>🎯</Txt>
          <Txt variant="title">Dream a little</Txt>
          <Txt variant="body" style={{ textAlign: 'center', color: colors.ink60 }}>
            A trip, a car, a safety net — give your savings somewhere to go.
          </Txt>
          <Button label="Create your first goal" icon="add" onPress={() => router.push('/add-goal')} style={{ alignSelf: 'stretch', marginTop: space.md }} />
        </View>
      ) : (
        <>
          <PressableScale onPress={() => router.push(`/goal/${featured.id}`)} style={[styles.featured, shadow(2)]}>
            <View style={styles.featuredArt}>
              {featured.art === 'japan' ? (
                <JapanArt height={150} />
              ) : (
                <View style={[styles.featuredFallback, { backgroundColor: tints[featured.tint].bg }]}>
                  <Ionicons name={featured.icon} size={56} color={tints[featured.tint].fg} />
                </View>
              )}
              <View style={styles.featuredTitle}>
                <Txt variant="title">{featured.name} {featured.flag}</Txt>
              </View>
            </View>
            <FeaturedBody goal={featured} />
          </PressableScale>

          {rest.length > 0 && (
            <Card style={{ paddingVertical: space.xxs }}>
              {rest.map((g, i) => {
                const saved = goalSaved(g);
                const pct = Math.round((saved / g.target) * 100);
                return (
                  <PressableScale key={g.id} onPress={() => router.push(`/goal/${g.id}`)} style={[styles.row, i > 0 && styles.divider]}>
                    <IconBadge icon={g.icon} tint={g.tint} size={44} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Txt variant="bodyStrong">{g.name}</Txt>
                      <Txt variant="caption" money>{rs(saved)} of {rs(g.target)}</Txt>
                      <ProgressBar value={saved / g.target} color={tints[g.tint].fg} height={4} style={{ marginTop: 4 }} />
                    </View>
                    <Txt variant="captionStrong" money style={{ color: colors.ink60, minWidth: 36, textAlign: 'right' }}>{pct}%</Txt>
                  </PressableScale>
                );
              })}
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}

function FeaturedBody({ goal }: { goal: Goal }) {
  const saved = goalSaved(goal);
  const pct = Math.round((saved / goal.target) * 100);
  return (
    <View style={{ padding: space.md, gap: space.xs }}>
      <Txt variant="title" money style={{ fontSize: 24, lineHeight: 30 }}>{rs(saved)}</Txt>
      <Txt variant="caption" money>of {rs(goal.target)}</Txt>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xs }}>
        <ProgressBar value={saved / goal.target} color={tints.red.fg} style={{ flex: 1 }} />
        <Txt variant="captionStrong" money>{pct}%</Txt>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space.xxs }}>
        <Ionicons name="locate" size={14} color={colors.accent} />
        <Txt variant="caption">Target • {longDate(new Date(goal.targetDate))}</Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: space.md },
  add: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.hairline },
  featured: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.hairline },
  featuredArt: { height: 150, overflow: 'hidden' },
  featuredFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  featuredTitle: { position: 'absolute', left: space.md, top: space.md, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: radius.sm, paddingHorizontal: space.sm, paddingVertical: space.xxs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.ink10 },
  empty: { alignItems: 'center', gap: space.xs, paddingVertical: space.xxl },
});
