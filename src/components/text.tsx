import { Text, type TextProps } from 'react-native';
import { type as typeScale } from '@/theme';

type Variant = keyof typeof typeScale;

export function Txt({ variant = 'body', money, style, ...rest }: TextProps & { variant?: Variant; money?: boolean }) {
  return <Text {...rest} style={[typeScale[variant], money && typeScale.money, style]} />;
}
