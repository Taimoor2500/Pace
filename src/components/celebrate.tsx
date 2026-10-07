import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { colors, tints } from '@/theme';

const PIECES = Array.from({ length: 18 }, (_, i) => ({
  angle: (i / 18) * Math.PI * 2,
  dist: 70 + (i % 3) * 28,
  color: [tints.green.fg, tints.amber.fg, tints.pink.fg, tints.blue.fg, tints.purple.fg][i % 5],
  size: 6 + (i % 3) * 2,
}));

/** Confetti burst — reserved for real peak moments (goal reached, great month). */
export function Celebrate({ children }: { children: React.ReactNode }) {
  const t = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(t, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, bounciness: 14, speed: 8, useNativeDriver: true }),
    ]).start();
  }, [t, scale]);
  return (
    <View style={styles.wrap}>
      {PIECES.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            borderRadius: i % 2 ? p.size / 2 : 2,
            backgroundColor: p.color,
            opacity: t.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(p.angle) * p.dist] }) },
              { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(p.angle) * p.dist] }) },
              { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${180 + i * 20}deg`] }) },
            ],
          }}
        />
      ))}
      <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', minHeight: 160, backgroundColor: colors.canvas },
});
