import { HStack, Image, ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, glassEffect, font, foregroundStyle, frame, lineLimit, minimumScaleFactor, monospacedDigit, progressViewStyle, tint, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { WidgetSnapshot } from '../snapshot';

/** Medium/large overview: safe-to-spend plus several pockets. */
const PocketsWidget = (props: WidgetSnapshot, env: WidgetEnvironment) => {
  'widget';
  // iOS frosted material — the wallpaper blurs through. (Defined inside: widget code runs in its own runtime.)
  const GLASS = { type: 'material', material: 'ultraThin' } as const;
  const ink = { type: 'hierarchical', style: 'primary' } as const;
  const muted = { type: 'hierarchical', style: 'secondary' } as const;
  
  if (!props.signedIn || props.pockets.length === 0) {
    return (
      <VStack spacing={6} modifiers={[containerBackground(GLASS, 'widget'), widgetURL('pace://')]}>
        <Image systemName="leaf.fill" color="#1F9D4C" size={24} />
        <Text modifiers={[font({ size: 14, weight: 'semibold' }), foregroundStyle(ink)]}>{props.signedIn ? 'Finish setting up Pace' : 'Sign in to Pace'}</Text>
      </VStack>
    );
  }

  const large = env.widgetFamily === 'systemLarge' || env.widgetFamily === 'systemExtraLarge';
  const shown = props.pockets.slice(0, large ? 7 : 3);

  return (
    <VStack alignment="leading" spacing={large ? 10 : 6} modifiers={[containerBackground(GLASS, 'widget'), widgetURL('pace://plan')]}>
      <HStack>
        <VStack alignment="leading" spacing={0}>
          <Text modifiers={[font({ size: 11 }), foregroundStyle(muted)]}>Safe to spend today</Text>
          <Text modifiers={[font({ size: large ? 26 : 20, weight: 'bold' }), monospacedDigit(), foregroundStyle(ink), lineLimit(1), minimumScaleFactor(0.6)]}>{props.safeToday}</Text>
        </VStack>
        <Spacer />
        <Image systemName="leaf.fill" color="#1F9D4C" size={18} />
      </HStack>
      {shown.map((p) => (
        <HStack key={p.id} spacing={8}>
          <Image
            systemName={p.symbol as never}
            color={p.fg}
            size={12}
            modifiers={[frame({ width: 26, height: 26 }), glassEffect({ glass: { variant: 'regular', tint: `${p.fg}33` }, shape: 'roundedRectangle', cornerRadius: 8 })]}
          />
          <VStack alignment="leading" spacing={2}>
            <HStack>
              <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(ink), lineLimit(1)]}>{p.name}</Text>
              <Spacer />
              <Text modifiers={[font({ size: 12, weight: 'semibold' }), monospacedDigit(), foregroundStyle(p.over ? '#E5484D' : ink), lineLimit(1)]}>{p.left}</Text>
            </HStack>
            <ProgressView value={p.used} modifiers={[progressViewStyle('linear'), tint(p.over ? '#E5484D' : p.fg)]} />
          </VStack>
        </HStack>
      ))}
      {large && <Spacer />}
      {large && <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle('#1F9D4C')]}>{props.pace}</Text>}
    </VStack>
  );
};

export default createWidget<WidgetSnapshot>('PocketsWidget', PocketsWidget);
