import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, space } from '@/theme';
import { IconButton } from './nav-header';
import { Txt } from './text';
import { close } from '@/lib/nav';

/** Modal scaffold: title bar with close, scrolling body, pinned footer CTA. */
export function FormSheet({ title, children, footer, left }: { title: string; children: ReactNode; footer: ReactNode; left?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? space.md : insets.top + space.xs }]}>
        {left ?? <View style={{ width: 44 }} />}
        <Txt variant="bodyStrong">{title}</Txt>
        <IconButton icon="close" label="Close" onPress={() => close()} />
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">{children}</ScrollView>
      <View style={{ paddingHorizontal: space.lg, paddingBottom: Math.max(insets.bottom, space.md) + space.xs, paddingTop: space.xs }}>{footer}</View>
    </KeyboardAvoidingView>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <Txt variant="captionStrong" style={{ marginTop: space.xs }}>{children}</Txt>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingBottom: space.xs },
  body: { paddingHorizontal: space.lg, gap: space.sm, paddingBottom: space.lg },
});
