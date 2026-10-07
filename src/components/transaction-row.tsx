import { Pressable, StyleSheet, View } from 'react-native';
import { colors, space } from '@/theme';
import { signedRs } from '@/lib/format';
import type { Pocket, Transaction } from '@/store/types';
import { MerchantAvatar } from './merchant-avatar';
import { Txt } from './text';

export function TransactionRow({
  tx,
  pocket,
  subtitle,
  trailingCaption,
  onPress,
}: { tx: Transaction; pocket?: Pocket; subtitle: string; trailingCaption?: string; onPress?: () => void }) {
  const income = tx.amount > 0;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
      accessibilityLabel={`${tx.merchant}, ${signedRs(tx.amount)}, ${subtitle}`}
    >
      <MerchantAvatar name={tx.merchant} tint={pocket?.tint ?? (income ? 'green' : 'gray')} icon={pocket?.icon ?? (income ? 'arrow-down' : 'help')} />
      <View style={styles.main}>
        <Txt variant="bodyStrong" numberOfLines={1}>{tx.merchant}</Txt>
        <Txt variant="caption" numberOfLines={1}>{subtitle}</Txt>
      </View>
      <View style={styles.trailing}>
        <Txt variant="bodyStrong" money style={{ color: income ? colors.accent : colors.ink }}>{signedRs(tx.amount)}</Txt>
        {trailingCaption && <Txt variant="caption">{trailingCaption}</Txt>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm, minHeight: 56 },
  main: { flex: 1, gap: 2 },
  trailing: { alignItems: 'flex-end', gap: 2 },
});
