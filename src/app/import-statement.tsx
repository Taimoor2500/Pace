import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Button } from '@/components/button';
import { haptic } from '@/components/haptics';
import { ImportPreview } from '@/components/import-preview';
import { NavHeader } from '@/components/nav-header';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/text';
import { notify } from '@/lib/confirm';
import { parseStatement } from '@/lib/csv-statement';
import { fileFromUri, pickFile, type PickedFile } from '@/lib/read-file';
import { parseSpreadsheet } from '@/lib/spreadsheet';
import type { ParsedTransaction } from '@/lib/sms-parser';
import { useStore } from '@/store/store';
import { colors, radius, space, tints } from '@/theme';
import { close } from '@/lib/nav';

type Kind = 'csv' | 'spreadsheet' | 'pdf' | 'unknown';

function kindOf(name: string, mime?: string | null): Kind {
  const ext = name.toLowerCase().split('.').pop() ?? '';
  if (['csv', 'txt', 'tsv'].includes(ext) || /csv|comma-separated|text\/plain/.test(mime ?? '')) return 'csv';
  if (['xlsx', 'xls', 'xlsm', 'ods'].includes(ext) || /spreadsheet|excel|officedocument\.spreadsheetml|opendocument\.spreadsheet/.test(mime ?? '')) {
    return 'spreadsheet';
  }
  if (ext === 'pdf' || mime === 'application/pdf') return 'pdf';
  return 'unknown';
}

export default function ImportStatement() {
  const params = useLocalSearchParams<{ uri?: string; mime?: string }>();
  const { importTransactions } = useStore();
  const [fileName, setFileName] = useState<string | null>(null);
  const [items, setItems] = useState<ParsedTransaction[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState(0);

  const load = useCallback(async (file: PickedFile) => {
    setError(null);
    setItems([]);
    setFileName(file.name);
    let kind = kindOf(file.name, file.mime);
    try {
      if (kind === 'pdf') {
        setError('PDF statements can’t be read reliably on the phone. In your bank’s app or website, download the statement as Excel (.xlsx) or CSV instead.');
        return;
      }
      let res;
      if (kind === 'unknown') {
        // No helpful extension/type (common on Android): sniff the content. XLSX files are zips ("PK"), XLS starts with D0 CF.
        const bytes = await file.bytes();
        kind = (bytes[0] === 0x50 && bytes[1] === 0x4b) || (bytes[0] === 0xd0 && bytes[1] === 0xcf) ? 'spreadsheet' : 'csv';
        res = kind === 'spreadsheet' ? parseSpreadsheet(bytes) : parseStatement(await file.text());
      } else {
        res = kind === 'spreadsheet' ? parseSpreadsheet(await file.bytes()) : parseStatement(await file.text());
      }
      console.info('[import] parsed', { kind, found: res.transactions.length, skipped: res.skipped, error: res.error });
      setItems(res.transactions);
      setSkipped(res.skipped);
      setSelected(new Set(res.transactions.map((_, i) => i)));
      if (res.error) setError(res.error);
      else if (!res.transactions.length) setError('No transactions found in this file.');
    } catch (e) {
      console.warn('[import] failed', kind, String((e as Error)?.message ?? e), (e as Error)?.stack?.split('\n').slice(0, 3).join(' | '));
      setError(
        kind === 'spreadsheet'
          ? 'Couldn’t read this spreadsheet. If it’s password-protected, remove the password or export it as CSV.'
          : 'Couldn’t read that file. Export the statement as CSV or Excel (.xlsx) and try again.',
      );
    }
  }, []);

  // Opened via Android "Share to Pace" with a file.
  useEffect(() => {
    if (params.uri) load(fileFromUri(String(params.uri), params.mime ? String(params.mime) : null));
  }, [params.uri, params.mime, load]);

  const pick = async () => {
    try {
      const file = await pickFile();
      if (!file) {
        console.info('[import] picker canceled');
        return;
      }
      console.info('[import] picked', { name: file.name, mime: file.mime, size: file.size });
      await load(file);
    } catch (e) {
      console.warn('[import] picker error', String((e as Error)?.message ?? e));
      setError(`Couldn’t open the file picker: ${String((e as Error)?.message ?? e)}`);
    }
  };

  const doImport = () => {
    const res = importTransactions(items.filter((_, i) => selected.has(i)), 'statement');
    haptic.success();
    notify(
      `Imported ${res.added} transaction${res.added === 1 ? '' : 's'}`,
      [res.duplicates ? `${res.duplicates} duplicates skipped.` : '', res.needsReview ? `${res.needsReview} need a pocket — see “Needs review”.` : '']
        .filter(Boolean).join('\n') || 'All set.',
    );
    close();
  };

  return (
    <Screen
      footer={
        items.length ? (
          <Button label={`Import ${selected.size} transaction${selected.size === 1 ? '' : 's'}`} onPress={doImport} disabled={!selected.size} />
        ) : (
          <Button label="Choose statement file" icon="document-attach" onPress={pick} />
        )
      }
    >
      <NavHeader />
      <View style={{ gap: space.xs }}>
        <Txt variant="display" style={{ fontSize: 28 }}>Import statement</Txt>
        <Txt variant="body" style={{ color: colors.ink60 }}>
          Upload an Excel (.xlsx, .xls) or CSV export from your bank. Pace detects the date, description and amount (or debit/credit) columns automatically.
        </Txt>
      </View>

      <PressableScale onPress={pick} style={styles.drop}>
        <Ionicons name={fileName ? 'document-text' : 'cloud-upload-outline'} size={32} color={colors.accent} />
        <Txt variant="bodyStrong">{fileName ?? 'Choose a file'}</Txt>
        <Txt variant="caption">{fileName ? 'Tap to choose a different file' : 'Excel or CSV from HBL, Meezan, UBL, Alfalah, MCB, SadaPay, NayaPay…'}</Txt>
      </PressableScale>

      {error && (
        <View style={[styles.note, { backgroundColor: tints.amber.bg }]}>
          <Ionicons name="information-circle" size={18} color={tints.amber.fg} />
          <Txt variant="caption" style={{ flex: 1, color: colors.ink80 }}>{error}</Txt>
        </View>
      )}

      {items.length > 0 && (
        <View style={{ gap: space.xs }}>
          <Txt variant="captionStrong">
            Found {items.length} transactions{skipped ? ` · ${skipped} rows skipped (no date or amount)` : ''}
          </Txt>
          <ImportPreview
            items={items}
            selected={selected}
            onToggle={(i) => setSelected((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; })}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  drop: { alignItems: 'center', gap: space.xs, paddingVertical: space.xl, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.accent12, backgroundColor: colors.surface },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xs, padding: space.sm, borderRadius: radius.md },
});
