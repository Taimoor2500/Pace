import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { AmountPicker } from '@/components/amount-picker';
import { Button } from '@/components/button';
import { FieldLabel, FormSheet } from '@/components/form-sheet';
import { haptic } from '@/components/haptics';
import { IconBadge } from '@/components/icon-badge';
import { IconButton } from '@/components/nav-header';
import { IconPicker, TintPicker } from '@/components/pickers';
import { TextField } from '@/components/text-field';
import { Txt } from '@/components/text';
import { confirm } from '@/lib/confirm';
import { useStore } from '@/store/store';
import type { IconName } from '@/store/types';
import { colors, radius, space, type TintName } from '@/theme';
import { close } from '@/lib/nav';

export default function PocketForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state, addPocket, updatePocket, deletePocket } = useStore();
  const existing = state.pockets.find((p) => p.id === id);

  const [name, setName] = useState(existing?.name ?? '');
  const [icon, setIcon] = useState<IconName>(existing?.icon ?? 'sparkles');
  const [tint, setTint] = useState<TintName>(existing?.tint ?? 'teal');
  const [budget, setBudget] = useState(existing?.budget ?? 10000);
  const [fixed, setFixed] = useState(existing?.fixed ?? false);
  const valid = name.trim().length > 0 && budget >= 0;

  const save = () => {
    const fields = { name: name.trim(), icon, tint, budget, fixed };
    if (existing) {
      updatePocket(existing.id, fields);
      close();
    } else {
      const newId = addPocket(fields);
      router.replace(`/pocket/${newId}`);
    }
    haptic.success();
  };

  const remove = async () => {
    if (!existing) return;
    const used = state.transactions.filter((t) => t.pocketId === existing.id).length;
    const ok = await confirm(
      `Delete ${existing.name}?`,
      used ? `${used} transaction${used > 1 ? 's' : ''} will move to “Needs review” so you can re-file them.` : 'This pocket has no transactions.',
    );
    if (ok) {
      deletePocket(existing.id);
      router.dismissTo('/(tabs)/plan');
    }
  };

  return (
    <FormSheet
      title={existing ? 'Edit Pocket' : 'New Pocket'}
      left={existing && state.pockets.length > 1 ? <IconButton icon="trash-outline" label="Delete pocket" onPress={remove} /> : undefined}
      footer={<Button label={existing ? 'Save Changes' : 'Create Pocket'} onPress={save} disabled={!valid} />}
    >
      <View style={{ alignItems: 'center', paddingVertical: space.sm }}>
        <IconBadge icon={icon} tint={tint} size={72} rounded={false} />
      </View>
      <FieldLabel>Name</FieldLabel>
      <TextField value={name} onChangeText={setName} placeholder="e.g. Gym, Kids, Pets" autoFocus={!existing} maxLength={24} />
      <FieldLabel>Monthly budget</FieldLabel>
      <AmountPicker value={budget} onChange={setBudget} presets={[5000, 10000, 20000, 40000]} />
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Txt variant="bodyStrong">Fixed costs</Txt>
          <Txt variant="caption">Rent, utilities, fees — kept out of “safe to spend”</Txt>
        </View>
        <Switch value={fixed} onValueChange={setFixed} trackColor={{ true: colors.accent, false: colors.ink10 }} thumbColor={colors.surface} />
      </View>
      <FieldLabel>Colour</FieldLabel>
      <TintPicker value={tint} onChange={setTint} />
      <FieldLabel>Icon</FieldLabel>
      <IconPicker value={icon} onChange={setIcon} tint={tint} />
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, marginTop: space.xs },
});
