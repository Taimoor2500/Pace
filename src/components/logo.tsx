import { View } from 'react-native';
import Svg, { ClipPath, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { colors } from '@/theme';
import { Txt } from './text';

/** The leaf-P: a stem and a leaf that together read as "P" — steady growth. Source: assets/brand/pace-icon.svg */
function Mark({ fg, vein }: { fg: string; vein: string }) {
  return (
    <G transform="translate(-44 -44)">
      <Path d="M400 790 V450" stroke={fg} strokeWidth={108} strokeLinecap="round" fill="none" />
      <Path
        d="M354 440 C380 330 560 262 712 300 C740 420 690 560 560 610 C490 636 414 628 354 598 Z"
        fill={fg}
        stroke={fg}
        strokeWidth={16}
        strokeLinejoin="round"
      />
      <Path d="M440 572 C520 520 604 440 658 344" stroke={vein} strokeWidth={28} strokeLinecap="round" fill="none" />
    </G>
  );
}

/** App-icon tile (rounded square, green gradient). */
export function LogoTile({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024" accessibilityLabel="Pace">
      <Defs>
        <LinearGradient id="paceBg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#2FBF68" />
          <Stop offset="1" stopColor="#127A3A" />
        </LinearGradient>
        <ClipPath id="paceClip">
          <Rect width="1024" height="1024" rx="232" />
        </ClipPath>
      </Defs>
      <G clipPath="url(#paceClip)">
        <Rect width="1024" height="1024" fill="url(#paceBg)" />
        <Mark fg="#FFFFFF" vein={colors.accent} />
      </G>
    </Svg>
  );
}

/** Tile + "Pace" wordmark. */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.3 }} accessibilityRole="header" accessibilityLabel="Pace">
      <LogoTile size={size} />
      <Txt variant="title" style={{ fontSize: size * 0.66, lineHeight: size * 0.8, letterSpacing: -0.5 }}>Pace</Txt>
    </View>
  );
}
