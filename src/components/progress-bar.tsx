import { useEffect, useRef } from 'react';
import { Animated, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '@/theme';
import { clamp } from '@/lib/format';

export function ProgressBar({
  value,
  color = colors.accent,
  track = colors.ink05,
  height = 8,
  style,
}: { value: number; color?: string; track?: string; height?: number; style?: StyleProp<ViewStyle> }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: clamp(value), duration: 700, useNativeDriver: false }).start();
  }, [anim, value]);
  return (
    <View style={[{ height, borderRadius: height, backgroundColor: track, overflow: 'hidden' }, style]}>
      <Animated.View
        style={{
          height,
          borderRadius: height,
          backgroundColor: color,
          width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }}
      />
    </View>
  );
}
