import { ScrollView, View } from 'react-native';
import { colors, radius, space, tints } from '@/theme';
import { PressableScale } from './pressable-scale';
import { Txt } from './text';

type Option<T extends string> = { value: T; label: string; badge?: number };

/** Pill filter chips. `fill` stretches options to equal width (segmented control). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  fill,
}: { options: Option<T>[]; value: T; onChange: (v: T) => void; fill?: boolean }) {
  const items = options.map((o) => {
    const active = o.value === value;
    return (
      <PressableScale
        key={o.value}
        onPress={() => onChange(o.value)}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        style={{
          flex: fill ? 1 : undefined,
          height: 36,
          paddingHorizontal: space.md,
          borderRadius: radius.pill,
          backgroundColor: active ? colors.ink : fill ? 'transparent' : colors.surface,
          borderWidth: fill ? 0 : 1,
          borderColor: colors.hairline,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        <Txt variant="captionStrong" style={{ color: active ? colors.onInk : colors.ink60 }}>{o.label}</Txt>
        {!!o.badge && (
          <View style={{ minWidth: 18, height: 18, borderRadius: 9, backgroundColor: tints.red.fg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
            <Txt variant="captionStrong" style={{ color: colors.onInk, fontSize: 11, lineHeight: 14 }}>{o.badge}</Txt>
          </View>
        )}
      </PressableScale>
    );
  });
  if (fill) {
    return (
      <View style={{ flexDirection: 'row', backgroundColor: colors.ink05, borderRadius: radius.pill, padding: 4 }}>{items}</View>
    );
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.xs }}>
      {items}
    </ScrollView>
  );
}
