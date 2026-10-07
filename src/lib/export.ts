import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform, Share } from 'react-native';
import { CHARGE_LABEL } from './charges';
import type { TaxItem } from '@/store/selectors';
import type { AppState } from '@/store/types';

const esc = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (rows: (string | number)[][]) => rows.map((r) => r.map(esc).join(',')).join('\n');

export function transactionsCsv(state: AppState): string {
  const pocket = (id?: string) => state.pockets.find((p) => p.id === id)?.name ?? '';
  const rows = state.transactions.map((t) => [t.date.slice(0, 10), t.merchant, t.amount, pocket(t.pocketId), t.note ?? '', t.source ?? 'manual']);
  return toCsv([['Date', 'Description', 'Amount', 'Pocket', 'Note', 'Source'], ...rows]);
}

export function taxCsv(items: TaxItem[]): string {
  return toCsv([['Date', 'Description', 'Type', 'Amount paid'], ...items.map((t) => [t.date.slice(0, 10), t.merchant, CHARGE_LABEL[t.kind], -t.amount])]);
}

/** Shares a CSV file (download on web, text share where files aren't supported). */
export async function shareCsv(csv: string, filename: string, title: string): Promise<void> {
  if (Platform.OS === 'web') {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = filename;
    a.click();
    return;
  }
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(csv);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text', dialogTitle: title });
  } else {
    await Share.share({ message: csv });
  }
}

/** Shares all transactions as a CSV file. */
export function exportTransactions(state: AppState): Promise<void> {
  return shareCsv(transactionsCsv(state), `pace-transactions-${new Date().toISOString().slice(0, 10)}.csv`, 'Export transactions');
}
