import { HStack, Image, ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, glassEffect, font, foregroundStyle, lineLimit, minimumScaleFactor, monospacedDigit, padding, progressViewStyle, tint, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { WidgetSnapshot } from '../snapshot';

/** Long-press → Edit Widget lets the user pick which pocket (or "Safe to spend") this widget shows. */
export type PocketWidgetConfig = { pocket: string };

const PocketWidget = (props: WidgetSnapshot, env: WidgetEnvironment<PocketWidgetConfig>) => {
  'widget';
  // iOS frosted material — the wallpaper blurs through. (Defined inside: widget code runs in its own runtime.)
  const GLASS = { type: 'material', material: 'ultraThin' } as const;
  const ink = { type: 'hierarchical', style: 'primary' } as const;
  const muted = { type: 'hierarchical', style: 'secondary' } as const;

  if (!props.signedIn || props.pockets.length === 0) {
    return (
      <VStack alignment="leading" spacing={6} modifiers={[containerBackground(GLASS, 'widget'), widgetURL('pace://')]}>
        <Image systemName="leaf.fill" color="#1F9D4C" size={22} />
        <Spacer />
        <Text modifiers={[font({ size: 15, weight: 'semibold' }), foregroundStyle(ink)]}>Pace</Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(muted)]}>{props.signedIn ? 'Finish setup to see your pockets' : 'Sign in to see your pockets'}</Text>
      </VStack>
    );
  }

  const choice = env.configuration?.pocket ?? 'food';
  if (choice === 'safe') {
    return (
      <VStack alignment="leading" spacing={4} modifiers={[containerBackground(GLASS, 'widget'), widgetURL('pace://')]}>
        <HStack>
          <Image
          systemName="leaf.fill"
          color="#1F9D4C"
          size={16}
          modifiers={[padding({ top: 8, bottom: 8, leading: 8, trailing: 8 }), glassEffect({ glass: { variant: 'regular', tint: '#1F9D4C33' }, shape: 'roundedRectangle', cornerRadius: 12 })]}
        />
          <Spacer />
          <Text modifiers={[font({ size: 11 }), foregroundStyle(muted)]}>{props.month}</Text>
        </HStack>
        <Spacer />
        <Text modifiers={[font({ size: 24, weight: 'bold' }), monospacedDigit(), foregroundStyle(ink), lineLimit(1), minimumScaleFactor(0.6)]}>{props.safeToday}</Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(muted)]}>safe to spend today</Text>
        <ProgressView value={props.cycle} modifiers={[progressViewStyle('linear'), tint('#1F9D4C'), padding({ top: 4 })]} />
        <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle('#1F9D4C'), lineLimit(1), minimumScaleFactor(0.7)]}>{props.pace}</Text>
      </VStack>
    );
  }

  const p = props.pockets.find((x) => x.id === choice) ?? props.pockets.find((x) => x.id !== 'essentials') ?? props.pockets[0];
  return (
    <VStack alignment="leading" spacing={4} modifiers={[containerBackground(GLASS, 'widget'), widgetURL(p.url)]}>
      <HStack>
        <Image
          systemName={p.symbol as never}
          color={p.fg}
          size={18}
          modifiers={[padding({ top: 8, bottom: 8, leading: 8, trailing: 8 }), glassEffect({ glass: { variant: 'regular', tint: `${p.fg}33` }, shape: 'roundedRectangle', cornerRadius: 12 })]}
        />
        <Spacer />
        <Text modifiers={[font({ size: 11 }), foregroundStyle(muted)]}>{props.month}</Text>
      </HStack>
      <Spacer />
      <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(ink), lineLimit(1)]}>{p.name}</Text>
      <Text modifiers={[font({ size: 18, weight: 'bold' }), monospacedDigit(), foregroundStyle(p.over ? '#E5484D' : ink), lineLimit(1), minimumScaleFactor(0.6)]}>{p.left}</Text>
      <Text modifiers={[font({ size: 11 }), monospacedDigit(), foregroundStyle(muted), lineLimit(1)]}>{p.of}</Text>
      <ProgressView value={p.used} modifiers={[progressViewStyle('linear'), tint(p.over ? '#E5484D' : p.fg), padding({ top: 4 })]} />
    </VStack>
  );
};

export default createWidget<WidgetSnapshot, PocketWidgetConfig>('PocketWidget', PocketWidget);
