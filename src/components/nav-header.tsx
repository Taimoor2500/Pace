import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, space } from '@/theme';
import { close } from '@/lib/nav';
import type { IconName } from '@/store/types';
import { Txt } from './text';

export function IconButton({ icon, onPress, label, light }: { icon: IconName; onPress: () => void; label: string; light?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.iconBtn, light && styles.iconBtnLight, pressed && { opacity: 0.6 }]}
    >
      <Ionicons name={icon} size={22} color={colors.ink} />
    </Pressable>
  );
}

export function BackButton({ light }: { light?: boolean }) {
  return (
    <IconButton
      icon="chevron-back"
      label="Back"
      light={light}
      onPress={close}
    />
  );
}

/** Compact top bar: back · (title) · right accessory. */
export function NavHeader({ title, right, back = true }: { title?: string; right?: ReactNode; back?: boolean }) {
  return (
    <View style={styles.bar}>
      <View style={styles.side}>{back && <BackButton />}</View>
      {title ? <Txt variant="bodyStrong">{title}</Txt> : <View />}
      <View style={[styles.side, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  side: { width: 48 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginLeft: -10 },
  iconBtnLight: { backgroundColor: 'rgba(255,255,255,0.9)', marginLeft: 0 },
});
