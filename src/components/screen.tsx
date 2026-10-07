import type { ReactNode } from 'react';
import { ScrollView, View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, space } from '@/theme';

/** Height reserved at the bottom of tab screens for the floating tab bar. */
export const TAB_BAR_SPACE = 104;

type Props = Omit<ScrollViewProps, 'contentContainerStyle'> & {
  children: ReactNode;
  /** Pinned content below the scroll area — CTAs live here, in the thumb zone. */
  footer?: ReactNode;
  tabs?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  edgeToEdgeTop?: boolean;
};

export function Screen({ children, footer, tabs, contentStyle, edgeToEdgeTop, ...rest }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        {...rest}
        contentContainerStyle={[
          {
            paddingTop: edgeToEdgeTop ? 0 : insets.top + space.xs,
            paddingHorizontal: space.lg,
            paddingBottom: tabs ? TAB_BAR_SPACE + insets.bottom : space.lg,
            gap: space.lg,
          },
          contentStyle,
        ]}
      >
        {children}
      </ScrollView>
      {footer && (
        <View style={{ paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: Math.max(insets.bottom, space.md) + space.xs, backgroundColor: colors.canvas }}>
          {footer}
        </View>
      )}
    </View>
  );
}
