import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { NavHeader } from '@/components/nav-header';
import { Txt } from '@/components/text';
import { TransactionForm } from '@/components/transaction-form';
import { useStore } from '@/store/store';
import { colors, space } from '@/theme';

export default function EditTransaction() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useStore();
  const tx = state.transactions.find((t) => t.id === id);
  if (!tx) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas, padding: space.lg, paddingTop: space.xxl, gap: space.md }}>
        <NavHeader />
        <Txt variant="title">This transaction no longer exists.</Txt>
      </View>
    );
  }
  return <TransactionForm key={tx.id} existing={tx} />;
}
