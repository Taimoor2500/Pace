import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/**
 * 60/30/10 colour system.
 * 60% — sage canvas (white cards sit on it), 30% — ink, 10% — Pace green accent.
 */
export const colors = {
  canvas: '#E9EFE8',
  surface: '#FFFFFF',
  surfaceMuted: '#DFE7DE',
  hairline: 'rgba(14, 17, 22, 0.06)',

  ink: '#0E1116',
  ink80: 'rgba(14, 17, 22, 0.80)',
  ink60: 'rgba(14, 17, 22, 0.60)',
  ink40: 'rgba(14, 17, 22, 0.40)',
  ink10: 'rgba(14, 17, 22, 0.10)',
  ink05: 'rgba(14, 17, 22, 0.05)',
  onInk: '#FFFFFF',

  accent: '#1F9D4C',
  accentSoft: '#E8F6ED',
  accent05: 'rgba(31, 157, 76, 0.05)',
  accent12: 'rgba(31, 157, 76, 0.12)',

  danger: '#E5484D',
  dangerSoft: '#FDECEC',
  warning: '#F59E0B',
} as const;

export type Tint = { fg: string; bg: string };

/** Colour-coded category tints: soft solid background + saturated foreground. */
export const tints = {
  green: { fg: '#1F9D4C', bg: '#E8F6ED' },
  red: { fg: '#E5484D', bg: '#FDECEC' },
  blue: { fg: '#3B7BF6', bg: '#EAF1FE' },
  purple: { fg: '#8B5CF6', bg: '#F1ECFE' },
  pink: { fg: '#E8487F', bg: '#FDEBF2' },
  amber: { fg: '#F08C00', bg: '#FFF3DF' },
  teal: { fg: '#0EA5A4', bg: '#E3F6F5' },
  gray: { fg: '#5B6170', bg: '#EFEFEC' },
} satisfies Record<string, Tint>;

export type TintName = keyof typeof tints;

/** 8-point grid. */
export const space = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

export const fonts = {
  regular: 'Inter_400Regular',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

/** Four sizes: display 34 · title 20 · body 15 · caption 12. */
export const type = {
  display: { fontFamily: fonts.bold, fontSize: 34, lineHeight: 40, letterSpacing: -0.8, color: colors.ink },
  title: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 26, letterSpacing: -0.3, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.ink80 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22, color: colors.ink },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, color: colors.ink60 },
  captionStrong: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, color: colors.ink },
  money: { ...tabular },
} satisfies Record<string, TextStyle>;

/** Soft, ink-tinted shadows. Never harsh. */
export function shadow(level: 1 | 2 | 3 = 1, tint: string = '#0E1116'): ViewStyle {
  const map = {
    1: { y: 2, r: 8, o: 0.05, e: 1 },
    2: { y: 8, r: 24, o: 0.08, e: 4 },
    3: { y: 16, r: 32, o: 0.12, e: 8 },
  }[level];
  return Platform.select<ViewStyle>({
    android: { elevation: map.e, shadowColor: tint },
    default: {
      shadowColor: tint,
      shadowOffset: { width: 0, height: map.y },
      shadowRadius: map.r,
      shadowOpacity: map.o,
    },
  })!;
}
