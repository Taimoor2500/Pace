import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BarChart } from '@/components/bar-chart';
import { Card } from '@/components/card';
import { IconBadge } from '@/components/icon-badge';
import { IconButton, NavHeader } from '@/components/nav-header';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { Txt } from '@/components/text';
import { CHARGE_LABEL, isTax, taxYearOf, type ChargeKind } from '@/lib/charges';
import { notify } from '@/lib/confirm';
import { shareCsv, taxCsv } from '@/lib/export';
import { haptic } from '@/components/haptics';
import { monthName, rs, shortDate } from '@/lib/format';
import { taxSummary } from '@/store/selectors';
import { useStore } from '@/store/store';
import type { IconName } from '@/store/types';
import { colors, radius, space, tints, type TintName } from '@/theme';

const KIND_STYLE: Record<ChargeKind, { icon: IconName; tint: TintName }> = {
  wht: { icon: 'receipt', tint: 'purple' },
  excise: { icon: 'pricetag', tint: 'blue' },
  'other-tax': { icon: 'document-text', tint: 'teal' },
  zakat: { icon: 'heart', tint: 'green' },
  fee: { icon: 'card', tint: 'amber' },
};

export default function Taxes() {
  const { state } = useStore();
  const current = taxYearOf(new Date());
  const [year, setYear] = useState(current);
  const s = taxSummary(state, year);
  const range = `${monthName(s.start)} ${s.start.getFullYear()} – Jun ${year}`;
  const taxKinds: ChargeKind[] = ['wht', 'excise', 'other-tax'];
  const alsoKinds: ChargeKind[] = ['zakat', 'fee'];
  const hasAny = s.items.length > 0;

  const go = (d: number) => {
    haptic.select();
    setYear((y) => y + d);
  };

  return (
    <Screen>
      <NavHeader
        title="Taxes & charges"
        right={
          hasAny ? (
            <IconButton
              icon="share-outline"
              label="Export for tax filing"
              onPress={() => shareCsv(taxCsv(s.items), `pace-tax-year-${year}.csv`, `Tax year ${year}`).catch(() => notify('Export failed', 'Please try again.'))}
            />
          ) : undefined
        }
      />

      <View style={styles.yearRow}>
        <Pressable onPress={() => go(-1)} hitSlop={8} style={styles.yearBtn} accessibilityLabel="Previous tax year">
          <Ionicons name="chevron-back" size={20} color={colors.ink} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Txt variant="title">Tax year {year}</Txt>
          <Txt variant="caption">{range}</Txt>
        </View>
        <Pressable
          onPress={() => year < current && go(1)}
          disabled={year >= current}
          hitSlop={8}
          style={[styles.yearBtn, year >= current && { opacity: 0.25 }]}
          accessibilityLabel="Next tax year"
        >
          <Ionicons name="chevron-forward" size={20} color={colors.ink} />
        </Pressable>
      </View>

      <Card style={styles.hero}>
        <Txt variant="caption">Tax paid{year === current ? ' so far' : ''}</Txt>
        <Txt variant="display" money style={{ fontSize: 36, lineHeight: 44 }}>{rs(s.taxTotal)}</Txt>
        <Txt variant="caption" style={{ textAlign: 'center' }}>Withholding tax, excise and other taxes deducted from your accounts</Txt>
      </Card>

      {!hasAny ? (
        <Card style={{ alignItems: 'center', gap: space.xs, paddingVertical: space.xl }}>
          <Txt style={{ fontSize: 40 }}>🧾</Txt>
          <Txt variant="bodyStrong">No taxes found for this tax year</Txt>
          <Txt variant="caption" style={{ textAlign: 'center' }}>
            Pace spots lines like “WHT U/S 231A”, “FED ON SMS ALERT” and “ZAKAT” in imported statements and bank SMS.
          </Txt>
        </Card>
      ) : (
        <>
          <Card style={{ paddingVertical: space.xxs }}>
            {taxKinds.map((k, i) => (
              <Row key={k} kind={k} amount={s.byKind[k]} first={i === 0} />
            ))}
          </Card>

          {(s.byKind.zakat !== 0 || s.byKind.fee !== 0) && (
            <View>
              <SectionHeader title="Also deducted" />
              <Card style={{ paddingVertical: space.xxs }}>
                {alsoKinds.map((k, i) => (
                  <Row key={k} kind={k} amount={s.byKind[k]} first={i === 0} />
                ))}
              </Card>
            </View>
          )}

          {s.months.some((m) => m.tax > 0) && (
            <Card style={{ padding: space.lg }}>
              <Txt variant="bodyStrong" style={{ marginBottom: space.md }}>Tax by month</Txt>
              <BarChart
                values={s.months.map((m) => Math.max(0, m.tax))}
                color={tints.purple.fg}
                mutedColor={tints.purple.bg}
                height={120}
                formatValue={(v, i) => `${monthName(s.months[i].month)} · ${rs(v)}`}
                initialSelected={s.months.reduce((best, m, i, arr) => (m.tax > arr[best].tax ? i : best), 0)}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space.xs }}>
                <Txt variant="caption">Jul</Txt>
                <Txt variant="caption">Jan</Txt>
                <Txt variant="caption">Jun</Txt>
              </View>
            </Card>
          )}

          <View>
            <SectionHeader title={`${s.items.length} deduction${s.items.length === 1 ? '' : 's'}`} />
            <Card style={{ paddingVertical: space.xxs }}>
              {s.items.map((t, i) => {
                const st = KIND_STYLE[t.kind];
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => router.push(`/transaction/${t.id}`)}
                    style={({ pressed }) => [styles.row, i > 0 && styles.divider, pressed && { opacity: 0.6 }]}
                  >
                    <IconBadge icon={st.icon} tint={st.tint} size={36} rounded={false} />
                    <View style={{ flex: 1 }}>
                      <Txt variant="bodyStrong" numberOfLines={1}>{t.merchant}</Txt>
                      <Txt variant="caption">{shortDate(new Date(t.date))}, {new Date(t.date).getFullYear()} · {isTax(t.kind) ? 'Tax' : CHARGE_LABEL[t.kind]}</Txt>
                    </View>
                    <Txt variant="bodyStrong" money style={t.amount > 0 ? { color: colors.accent } : undefined}>
                      {t.amount > 0 ? `+${rs(t.amount)}` : rs(-t.amount)}
                    </Txt>
                  </Pressable>
                );
              })}
            </Card>
          </View>

          <View style={styles.note}>
            <Ionicons name="information-circle" size={18} color={tints.blue.fg} />
            <Txt variant="caption" style={{ flex: 1, color: colors.ink80 }}>
              Some withholding tax can be adjusted against your annual income tax. Ask your bank for a WHT certificate,
              and check with a tax advisor when filing with FBR. Use the share button above to export this year’s list.
            </Txt>
          </View>
        </>
      )}
    </Screen>
  );
}

function Row({ kind, amount, first }: { kind: ChargeKind; amount: number; first: boolean }) {
  const st = KIND_STYLE[kind];
  return (
    <View style={[styles.row, !first && styles.divider]}>
      <IconBadge icon={st.icon} tint={st.tint} size={36} rounded={false} />
      <Txt variant="body" style={{ flex: 1, color: colors.ink }}>{CHARGE_LABEL[kind]}</Txt>
      <Txt variant="bodyStrong" money style={amount === 0 ? { color: colors.ink40 } : undefined}>{rs(amount)}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  yearBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, alignItems: 'center', justifyContent: 'center' },
  hero: { alignItems: 'center', gap: space.xxs, paddingVertical: space.lg, backgroundColor: '#FAF8FF' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.ink10 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xs, padding: space.sm, borderRadius: radius.md, backgroundColor: tints.blue.bg },
});
