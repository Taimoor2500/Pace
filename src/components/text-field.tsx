import { StyleSheet, TextInput, type TextInputProps } from 'react-native';
import { colors, fonts, radius, space } from '@/theme';

export function TextField(props: TextInputProps) {
  return <TextInput placeholderTextColor={colors.ink40} {...props} style={[styles.input, props.style]} />;
}

const styles = StyleSheet.create({
  input: {
    height: 56, paddingHorizontal: space.md, borderRadius: radius.md, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.hairline, fontFamily: fonts.regular, fontSize: 15, color: colors.ink,
  },
});
