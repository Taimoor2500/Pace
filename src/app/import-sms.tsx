import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { haptic } from '@/components/haptics';
import { ImportPreview } from '@/components/import-preview';
import { NavHeader } from '@/components/nav-header';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/text';
import { notify } from '@/lib/confirm';
import { parseSmsBatch } from '@/lib/sms-parser';
import { useStore } from '@/store/store';
import { colors, fonts, radius, space, tints } from '@/theme';
import { close } from '@/lib/nav';

export default function ImportSms() {
  const params = useLocalSearchParams<{ text?: string }>();
  const { importTransactions } = useStore();
  const [text, setText] = useState(params.text ? String(params.text) : '');
  const parsed = useMemo(() => parseSmsBatch(text), [text]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => setSelected(new Set(parsed.map((_, i) => i))), [parsed]);
  useEffect(() => {
    if (params.text) setText(String(params.text));
  }, [params.text]);

  const paste = async () => {
    const clip = await Clipboard.getStringAsync();
    if (clip) setText((t) => (t ? `${t}\n\n${clip}` : clip));
    else notify('Clipboard is empty', 'Copy a bank SMS first, then tap Paste.');
  };

  const doImport = () => {
    const items = parsed.filter((_, i) => selected.has(i));
    const res = importTransactions(items, 'sms');
    haptic.success();
    notify(
      res.added ? `Imported ${res.added} transaction${res.added > 1 ? 's' : ''}` : 'Nothing new to import',
      [
        res.duplicates ? `${res.duplicates} already in Pace — skipped.` : '',
        res.needsReview ? `${res.needsReview} need a pocket — find them under “Needs review”.` : '',
      ].filter(Boolean).join('\n') || 'All set.',
    );
    close();
  };

  return (
    <Screen
      footer={
        <Button
          label={selected.size ? `Import ${selected.size} transaction${selected.size > 1 ? 's' : ''}` : 'Import'}
          onPress={doImport}
          disabled={!selected.size}
        />
      }
    >
      <NavHeader />
      <View style={{ gap: space.xs }}>
        <Txt variant="display" style={{ fontSize: 28 }}>Import bank SMS</Txt>
        <Txt variant="body" style={{ color: colors.ink60 }}>
          Paste alerts from HBL, Meezan, UBL, MCB, JazzCash, Easypaisa and more. Pace pulls out the amount, merchant and date.
        </Txt>
      </View>

      <View style={styles.inputCard}>
        <TextInput
          value={text}
          onChangeText={setText}
          multiline
          placeholder={'PKR 1,250.00 has been debited from your A/C for purchase at KFC on 07-Oct-26 12:30'}
          placeholderTextColor={colors.ink40}
          style={styles.input}
          textAlignVertical="top"
        />
        <View style={styles.inputActions}>
          <PressableScale onPress={paste} style={styles.smallBtn}>
            <Ionicons name="clipboard-outline" size={16} color={colors.ink} />
            <Txt variant="captionStrong">Paste</Txt>
          </PressableScale>
          {!!text && (
            <PressableScale onPress={() => setText('')} style={styles.smallBtn}>
              <Ionicons name="close" size={16} color={colors.ink} />
              <Txt variant="captionStrong">Clear</Txt>
            </PressableScale>
          )}
        </View>
      </View>

      {text.trim().length > 0 && (
        parsed.length ? (
          <View style={{ gap: space.xs }}>
            <Txt variant="captionStrong">Found {parsed.length} transaction{parsed.length > 1 ? 's' : ''}</Txt>
            <ImportPreview
              items={parsed}
              selected={selected}
              onToggle={(i) => setSelected((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; })}
            />
          </View>
        ) : (
          <View style={[styles.note, { backgroundColor: tints.amber.bg }]}>
            <Ionicons name="help-circle" size={18} color={tints.amber.fg} />
            <Txt variant="caption" style={{ flex: 1, color: colors.ink80 }}>
              No transactions recognised. Make sure the message includes an amount (PKR / Rs.) and words like “debited”, “spent” or “received”. OTPs are ignored.
            </Txt>
          </View>
        )
      )}

      <Card>
        <PressableScale onPress={() => setShowHelp((s) => !s)} haptics={false} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Ionicons name="flash" size={20} color={colors.accent} />
          <Txt variant="bodyStrong" style={{ flex: 1 }}>Automate it</Txt>
          <Ionicons name={showHelp ? 'chevron-up' : 'chevron-down'} size={18} color={colors.ink60} />
        </PressableScale>
        {showHelp && (
          <View style={{ gap: space.sm, marginTop: space.sm }}>
            {Platform.OS !== 'android' && (
              <View style={{ gap: 4 }}>
                <Txt variant="captionStrong">iPhone — Shortcuts automation</Txt>
                <Txt variant="caption" style={{ color: colors.ink80 }}>
                  1. Shortcuts → Automation → New → Message.{'\n'}
                  2. Sender: your bank. Message contains: “PKR”. Run immediately.{'\n'}
                  3. Action: “URL Encode” the Message, then “Open URL”:{'\n'}
                  pace://import-sms?text=[Encoded Message]
                </Txt>
              </View>
            )}
            {Platform.OS !== 'ios' && (
              <View style={{ gap: 4 }}>
                <Txt variant="captionStrong">Android — Share to Pace</Txt>
                <Txt variant="caption" style={{ color: colors.ink80 }}>
                  Long-press a bank SMS in Messages → Share → Pace. It opens right here, ready to import. Statement CSV files can be shared to Pace the same way.
                </Txt>
              </View>
            )}
            <Txt variant="caption">Duplicates are skipped automatically, so importing the same message twice is safe.</Txt>
          </View>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  inputCard: { borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, padding: space.md, gap: space.sm },
  input: { minHeight: 120, maxHeight: 240, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.ink, padding: 0 },
  inputActions: { flexDirection: 'row', gap: space.xs },
  smallBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: space.sm, borderRadius: radius.pill, backgroundColor: colors.ink05 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xs, padding: space.sm, borderRadius: radius.md },
});
