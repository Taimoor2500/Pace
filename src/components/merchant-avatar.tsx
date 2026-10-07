import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { tints, type TintName } from '@/theme';
import type { IconName } from '@/store/types';
import { Txt } from './text';

/** Recognisable merchants get a coloured monogram; everything else falls back to the pocket tint. */
const KNOWN: Record<string, { bg: string; fg: string }> = {
  Starbucks: { bg: '#00704A', fg: '#FFFFFF' },
  Uber: { bg: '#000000', fg: '#FFFFFF' },
  Careem: { bg: '#36B37E', fg: '#FFFFFF' },
  KFC: { bg: '#E4002B', fg: '#FFFFFF' },
  Spotify: { bg: '#1DB954', fg: '#FFFFFF' },
  Netflix: { bg: '#111111', fg: '#E50914' },
  Carrefour: { bg: '#EAF1FE', fg: '#1E4FB5' },
  Daraz: { bg: '#F85606', fg: '#FFFFFF' },
  Foodpanda: { bg: '#D70F64', fg: '#FFFFFF' },
  'Meezan Transfer': { bg: '#5B2C83', fg: '#FFFFFF' },
  Salary: { bg: '#E8F6ED', fg: '#1F9D4C' },
};

export function MerchantAvatar({ name, tint = 'gray', icon, size = 40 }: { name: string; tint?: TintName; icon?: IconName; size?: number }) {
  const known = KNOWN[name];
  const colors = known ?? tints[tint];
  const bg = known ? known.bg : tints[tint].bg;
  const fg = known ? known.fg : tints[tint].fg;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      {icon && !known ? (
        <Ionicons name={icon} size={size * 0.48} color={fg} />
      ) : (
        <Txt variant="captionStrong" style={{ color: colors.fg, fontSize: size * 0.36, lineHeight: size * 0.44 }}>
          {name.replace(/[^A-Za-z]/g, '').slice(0, 1).toUpperCase() || '?'}
        </Txt>
      )}
    </View>
  );
}
