import { useLocalSearchParams } from 'expo-router';
import { TransactionForm } from '@/components/transaction-form';

/**
 * New transaction. Accepts prefill params so automations can open it, e.g.
 * pace://add-expense?amount=1250&merchant=KFC  or  pace://add-expense?type=income
 */
export default function AddExpense() {
  const params = useLocalSearchParams<{ amount?: string; merchant?: string; type?: string }>();
  const amount = Number(String(params.amount ?? '').replace(/[^\d.]/g, ''));
  return (
    <TransactionForm
      initial={{
        amount: amount > 0 ? Math.round(amount) : undefined,
        merchant: params.merchant ? String(params.merchant).slice(0, 40) : undefined,
        kind: params.type === 'income' ? 'income' : 'expense',
      }}
    />
  );
}
