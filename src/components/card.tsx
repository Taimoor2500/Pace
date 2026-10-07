import { View, type ViewProps } from 'react-native';
import { colors, radius, shadow, space } from '@/theme';

export function Card({ style, ...rest }: ViewProps) {
  return (
    <View
      {...rest}
      style={[
        { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, borderWidth: 1, borderColor: colors.hairline },
        shadow(1),
        style,
      ]}
    />
  );
}
