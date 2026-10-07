import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import type { IconName } from '@/store/types';
import { colors, radius, space, tints, type TintName } from '@/theme';
import { haptic } from './haptics';

export const POCKET_ICONS: IconName[] = [
  'home', 'cafe', 'restaurant', 'car', 'bus', 'bag-handle', 'cart', 'game-controller', 'airplane', 'medkit',
  'school', 'barbell', 'paw', 'gift', 'heart', 'shirt', 'phone-portrait', 'wifi', 'flash', 'tv', 'card', 'cash',
  'people', 'sparkles',
];

export function IconPicker({ value, onChange, tint, icons = POCKET_ICONS }: { value: IconName; onChange: (i: IconName) => void; tint: TintName; icons?: IconName[] }) {
  const t = tints[tint];
  return (
    <View style={styles.wrap}>
      {icons.map((icon) => {
        const on = icon === value;
        return (
          <Pressable
            key={icon}
            onPress={() => { haptic.select(); onChange(icon); }}
            accessibilityLabel={icon}
            accessibilityState={{ selected: on }}
            style={[styles.icon, { backgroundColor: on ? t.bg : colors.surface, borderColor: on ? t.fg : colors.hairline }]}
          >
            <Ionicons name={icon} size={20} color={on ? t.fg : colors.ink60} />
          </Pressable>
        );
      })}
    </View>
  );
}

export function TintPicker({ value, onChange }: { value: TintName; onChange: (t: TintName) => void }) {
  return (
    <View style={styles.wrap}>
      {(Object.keys(tints) as TintName[]).map((name) => {
        const on = name === value;
        return (
          <Pressable
            key={name}
            onPress={() => { haptic.select(); onChange(name); }}
            accessibilityLabel={`${name} colour`}
            accessibilityState={{ selected: on }}
            style={[styles.swatch, { backgroundColor: tints[name].bg, borderColor: on ? tints[name].fg : 'transparent' }]}
          >
            <View style={[styles.dot, { backgroundColor: tints[name].fg }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  icon: { width: 44, height: 44, borderRadius: radius.sm, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 16, height: 16, borderRadius: 8 },
});
