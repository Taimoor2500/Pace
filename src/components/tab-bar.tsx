import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, shadow, space } from '@/theme';
import type { IconName } from '@/store/types';
import { haptic } from './haptics';
import { PressableScale } from './pressable-scale';
import { Txt } from './text';

const TABS: Record<string, { label: string; icon: IconName; active: IconName }> = {
  index: { label: 'Today', icon: 'home-outline', active: 'home' },
  plan: { label: 'Plan', icon: 'calendar-clear-outline', active: 'calendar-clear' },
  goals: { label: 'Goals', icon: 'flag-outline', active: 'flag' },
  progress: { label: 'Progress', icon: 'stats-chart-outline', active: 'stats-chart' },
};

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const renderTab = (index: number) => {
    const route = state.routes[index];
    const meta = TABS[route.name];
    if (!meta) return null;
    const focused = state.index === index;
    const color = focused ? colors.accent : colors.ink40;
    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={meta.label}
        style={styles.tab}
        onPress={() => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            haptic.select();
            navigation.navigate(route.name);
          }
        }}
      >
        <Ionicons name={focused ? meta.active : meta.icon} size={22} color={color} />
        <Txt variant="caption" style={{ color, fontSize: 11, lineHeight: 14 }}>{meta.label}</Txt>
      </Pressable>
    );
  };

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, space.xs) }]}>
      {renderTab(0)}
      {renderTab(1)}
      <View style={styles.tab}>
        <View style={styles.fabGlow} pointerEvents="none" />
        <PressableScale
          onPress={() => router.push('/add-expense')}
          accessibilityRole="button"
          accessibilityLabel="Add expense"
          scaleTo={0.9}
          style={styles.fab}
        >
          <Ionicons name="add" size={30} color={colors.onInk} />
        </PressableScale>
      </View>
      {renderTab(2)}
      {renderTab(3)}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: space.xs,
    paddingHorizontal: space.xs,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.ink10,
    ...(Platform.OS === 'web' ? {} : shadow(2)),
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 52 },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    ...shadow(2, colors.accent),
  },
  fabGlow: { position: 'absolute', width: 64, height: 64, borderRadius: 32, backgroundColor: colors.accent12 },
});
