import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, shadow, space } from '@/theme';
import type { IconName } from '@/store/types';
import { PressableScale } from './pressable-scale';
import { Txt } from './text';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
  icon?: IconName;
  trailingIcon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = 'primary', icon, trailingIcon, disabled, style }: Props) {
  const primary = variant === 'primary';
  const fg = primary ? colors.onInk : colors.ink;
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.base, primary ? styles.primary : styles.secondary, disabled && styles.disabled, style]}
    >
      {primary && <View pointerEvents="none" style={styles.innerHighlight} />}
      {icon && <Ionicons name={icon} size={18} color={fg} />}
      <Txt variant="bodyStrong" style={{ color: fg }}>{label}</Txt>
      {trailingIcon && <Ionicons name={trailingIcon} size={18} color={fg} style={styles.trailing} />}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 56,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    paddingHorizontal: space.lg,
    overflow: 'hidden',
  },
  primary: { backgroundColor: colors.ink, ...shadow(2) },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.ink10 },
  disabled: { opacity: 0.4 },
  // Subtle white inner highlight for dimension.
  innerHighlight: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: radius.pill,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  trailing: { position: 'absolute', right: space.lg },
});
