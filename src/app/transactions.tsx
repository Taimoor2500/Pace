import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptic } from '@/components/haptics';
import { IconBadge } from '@/components/icon-badge';
import { BackButton, IconButton } from '@/components/nav-header';
import { PressableScale } from '@/components/pressable-scale';
import { Segmented } from '@/components/segmented';
import { Txt } from '@/components/text';
import { TransactionRow } from '@/components/transaction-row';
import { isSameMonth, monthName, relativeDay, startOfDay, time } from '@/lib/format';
import { useStore } from '@/store/store';
import type { Transaction } from '@/store/types';
import { colors, fonts, radius, space, tints } from '@/theme';

type Filter = 'all' | 'review' | 'income' | 'expenses';

export default function Transactions() {
  const params = useLocalSearchParams<{ filter?: Filter; pocket?: string; month?: string }>();
  const insets = useSafeAreaInsets();
  const { state, categorise } = useStore();
  const [filter, setFilter] = useState<Filter>(params.filter ?? 'all');
  const [pocketId, setPocketId] = useState(params.pocket);
  const [month, setMonth] = useState(() => {
    const m = params.month?.match(/^(\d{4})-(\d{2})$/);
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, 1) : undefined;
  });
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const now = new Date();

  const reviewCount = state.transactions.filter((t) => t.needsReview).length;
  const pocketFilter = state.pockets.find((p) => p.id === pocketId);

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = state.transactions.filter((t) => {
      if (filter === 'review' && !t.needsReview) return false;
      if (filter === 'income' && t.amount <= 0) return false;
      if (filter === 'expenses' && t.amount >= 0) return false;
      if (pocketId && t.pocketId !== pocketId) return false;
      if (month && !isSameMonth(new Date(t.date), month)) return false;
      if (q && !`${t.merchant} ${t.note ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const groups = new Map<number, Transaction[]>();
    for (const t of list) {
      const key = startOfDay(new Date(t.date)).getTime();
      groups.set(key, [...(groups.get(key) ?? []), t]);
    }
    return [...groups.entries()].map(([key, data]) => ({ title: relativeDay(new Date(key), now), data }));
  }, [state.transactions, filter, pocketId, month, query]);

  // Never a blank search: suggest frequent merchants.
  const suggestions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of state.transactions.slice(0, 80)) counts.set(t.merchant, (counts.get(t.merchant) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([m]) => m);
  }, [state.transactions]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas, paddingTop: insets.top + space.xs }}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <BackButton />
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <IconButton icon={searching ? 'close' : 'search'} label="Search" onPress={() => { setSearching((s) => !s); setQuery(''); }} />
            <IconButton icon="add" label="Add transaction" onPress={() => router.push('/add-expense')} />
          </View>
        </View>
        <Txt variant="display" style={{ fontSize: 28 }}>Transactions</Txt>

        {searching && (
          <View style={{ gap: space.sm }}>
            <View style={styles.search}>
              <Ionicons name="search" size={18} color={colors.ink40} />
              <TextInput
                autoFocus
                value={query}
                onChangeText={setQuery}
                placeholder="Search merchants or categories"
                placeholderTextColor={colors.ink40}
                style={styles.searchInput}
                returnKeyType="search"
              />
            </View>
            {!query && (
              <View style={styles.suggest}>
                <Txt variant="caption" style={{ width: '100%' }}>Frequent</Txt>
                {suggestions.map((m) => (
                  <Pressable key={m} onPress={() => setQuery(m)} style={styles.suggestChip}>
                    <Ionicons name="time-outline" size={14} color={colors.ink60} />
                    <Txt variant="caption" style={{ color: colors.ink }}>{m}</Txt>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'review', label: 'Needs review', badge: reviewCount },
            { value: 'income', label: 'Income' },
            { value: 'expenses', label: 'Expenses' },
          ]}
        />
        {(pocketFilter || month) && (
          <View style={{ flexDirection: 'row', gap: space.xs }}>
            {pocketFilter && (
              <Pressable onPress={() => setPocketId(undefined)} style={[styles.pocketChip, { backgroundColor: tints[pocketFilter.tint].bg }]}>
                <Txt variant="captionStrong" style={{ color: tints[pocketFilter.tint].fg }}>{pocketFilter.name}</Txt>
                <Ionicons name="close" size={14} color={tints[pocketFilter.tint].fg} />
              </Pressable>
            )}
            {month && (
              <Pressable onPress={() => setMonth(undefined)} style={[styles.pocketChip, { backgroundColor: colors.ink05 }]}>
                <Txt variant="captionStrong">{monthName(month, true)} {month.getFullYear()}</Txt>
                <Ionicons name="close" size={14} color={colors.ink} />
              </Pressable>
            )}
          </View>
        )}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(t) => t.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: insets.bottom + space.xl }}
        renderSectionHeader={({ section }) => (
          <Txt variant="captionStrong" style={styles.sectionTitle}>{section.title}</Txt>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', gap: space.xs, paddingVertical: space.xxl }}>
            <Txt style={{ fontSize: 40 }}>{filter === 'review' ? '✅' : '🔍'}</Txt>
            <Txt variant="bodyStrong">{filter === 'review' ? 'All caught up!' : 'No transactions found'}</Txt>
            <Txt variant="caption">{filter === 'review' ? 'Every transaction is categorised.' : 'Try a different filter or search.'}</Txt>
          </View>
        }
        renderItem={({ item }) => {
          const pocket = state.pockets.find((p) => p.id === item.pocketId);
          const open = expanded === item.id;
          return (
            <View style={styles.item}>
              <TransactionRow
                tx={item}
                pocket={pocket}
                subtitle={time(new Date(item.date))}
                trailingCaption={item.needsReview ? 'Tap to categorise' : pocket?.name ?? item.note}
                onPress={item.needsReview ? () => setExpanded(open ? null : item.id) : () => router.push(`/transaction/${item.id}`)}
              />
              {item.needsReview && open && (
                <View style={styles.categorise}>
                  {state.pockets.map((p) => (
                    <PressableScale
                      key={p.id}
                      onPress={() => { haptic.success(); categorise(item.id, p.id); setExpanded(null); }}
                      style={[styles.catChip, { backgroundColor: tints[p.tint].bg }]}
                    >
                      <IconBadge icon={p.icon} tint={p.tint} size={24} />
                      <Txt variant="captionStrong">{p.name}</Txt>
                    </PressableScale>
                  ))}
                  <PressableScale onPress={() => router.push(`/transaction/${item.id}`)} style={[styles.catChip, { backgroundColor: colors.ink05, paddingLeft: space.sm }]}>
                    <Ionicons name="create-outline" size={14} color={colors.ink} />
                    <Txt variant="captionStrong">Edit</Txt>
                  </PressableScale>
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space.lg, gap: space.md, paddingBottom: space.xs },
  search: { flexDirection: 'row', alignItems: 'center', gap: space.xs, height: 48, borderRadius: radius.md, paddingHorizontal: space.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline },
  searchInput: { flex: 1, minWidth: 0, fontFamily: fonts.regular, fontSize: 15, color: colors.ink, padding: 0 },
  suggest: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  suggestChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space.sm, height: 32, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline },
  pocketChip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: space.sm, height: 32, borderRadius: radius.pill },
  sectionTitle: { marginTop: space.md, marginBottom: space.xxs, color: colors.ink60 },
  item: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: space.sm, marginBottom: space.xs, borderWidth: 1, borderColor: colors.hairline },
  categorise: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, paddingBottom: space.sm },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 4, paddingRight: space.sm, height: 32, borderRadius: radius.pill },
});
