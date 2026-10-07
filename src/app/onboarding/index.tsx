import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/button';
import { Logo } from '@/components/logo';
import { Txt } from '@/components/text';
import { Landscape } from '@/illustrations/landscape';
import { colors, radius, space } from '@/theme';

const SLIDES = [
  { title: 'A calmer\nway to money', body: 'Budget, save and reach your goals without the stress.' },
  { title: 'Know what’s\nsafe to spend', body: 'One number each morning. No spreadsheets, no guilt.' },
  { title: 'Grow towards\nwhat matters', body: 'Pockets for everyday life, goals for the big dreams.' },
];

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const skip = () => router.push('/onboarding/profile');

  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <View style={StyleSheet.absoluteFill}>
          <View style={{ flex: 1 }} />
          <Landscape height={height * 0.55} />
        </View>
        <View style={[styles.brand, { top: insets.top + space.xs }]}>
          <Logo size={28} />
        </View>
        <Pressable onPress={skip} hitSlop={12} style={[styles.skip, { top: insets.top + space.xs }]} accessibilityRole="button">
          <Txt variant="captionStrong">Skip</Txt>
        </Pressable>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
          style={{ marginTop: insets.top + space.xxl + space.md }}
        >
          {SLIDES.map((s) => (
            <View key={s.title} style={{ width, paddingHorizontal: space.lg, gap: space.sm }}>
              <Txt variant="display" style={{ fontSize: 34 }}>{s.title}</Txt>
              <Txt variant="body" style={{ maxWidth: 280 }}>{s.body}</Txt>
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space.md) + space.xs }]}>
        <View style={styles.dots} accessibilityLabel={`Slide ${page + 1} of ${SLIDES.length}`}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
        </View>
        <Button label="Get Started" trailingIcon="arrow-forward" onPress={() => router.push('/onboarding/profile')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  hero: { flex: 1, backgroundColor: '#DCEFF5', overflow: 'hidden' },
  brand: { position: 'absolute', left: space.lg, zIndex: 2, height: 36, justifyContent: 'center' },
  skip: { position: 'absolute', right: space.lg, zIndex: 2, paddingVertical: space.xs, paddingHorizontal: space.sm },
  sheet: {
    marginTop: -space.xl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.canvas,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    gap: space.lg,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.ink10 },
  dotActive: { width: 20, backgroundColor: colors.ink },
});
