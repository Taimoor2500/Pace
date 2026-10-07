import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';
import { colors, space } from '@/theme';
import { Txt } from './text';

export function SectionHeader({ title, action = 'See all', onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm }}>
      <Txt variant="bodyStrong">{title}</Txt>
      {onAction && (
        <Pressable onPress={onAction} hitSlop={12} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Txt variant="caption">{action}</Txt>
          <Ionicons name="chevron-forward" size={14} color={colors.ink60} />
        </Pressable>
      )}
    </View>
  );
}
