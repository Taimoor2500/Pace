import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { tints, type TintName } from '@/theme';
import type { IconName } from '@/store/types';

export function IconBadge({ icon, tint, size = 40, rounded = true }: { icon: IconName; tint: TintName; size?: number; rounded?: boolean }) {
  const t = tints[tint];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: rounded ? size / 2 : size * 0.3,
        backgroundColor: t.bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={icon} size={Math.round(size * 0.5)} color={t.fg} />
    </View>
  );
}
