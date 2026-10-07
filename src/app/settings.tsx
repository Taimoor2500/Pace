import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
import { Card } from '@/components/card';
import { haptic } from '@/components/haptics';
import { IconBadge } from '@/components/icon-badge';
import { LogoTile } from '@/components/logo';
import { NavHeader } from '@/components/nav-header';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/text';
import { confirm, notify } from '@/lib/confirm';
import { exportTransactions } from '@/lib/export';
import { formatNumber, rs } from '@/lib/format';
import { notificationsAvailable } from '@/lib/notifications';
import { ensurePermission } from '@/lib/reminders';
import { totalBudget } from '@/store/selectors';
import { clearLocalCache, useStore } from '@/store/store';
import { useAuth } from '@/auth/auth-provider';
import type { IconName } from '@/store/types';
import { colors, fonts, radius, space, type TintName } from '@/theme';

function Row({ icon, tint, title, subtitle, right, onPress, danger }: {
  icon: IconName; tint: TintName; title: string; subtitle?: string; right?: ReactNode; onPress?: () => void; danger?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]} accessibilityRole={onPress ? 'button' : undefined}>
      <IconBadge icon={icon} tint={tint} size={36} rounded={false} />
      <View style={{ flex: 1 }}>
        <Txt variant="bodyStrong" style={danger ? { color: colors.danger } : undefined}>{title}</Txt>
        {subtitle && <Txt variant="caption">{subtitle}</Txt>}
      </View>
      {right ?? (onPress && <Ionicons name="chevron-forward" size={18} color={colors.ink40} />)}
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: space.xs }}>
      <Txt variant="captionStrong" style={{ color: colors.ink60 }}>{title.toUpperCase()}</Txt>
      <Card style={{ paddingVertical: space.xxs }}>{children}</Card>
    </View>
  );
}

const HOURS = [8, 13, 20, 21, 22];

export default function Settings() {
  const { state, updateProfile, setReminders, loadSampleData, reset, sync, syncNow } = useStore();
  const { session, signOut, deleteAccount } = useAuth();
  const user = session?.user;
  const provider = String(user?.app_metadata?.provider ?? 'email');
  const providerLabel = provider === 'google' ? 'Google' : provider === 'apple' ? 'Apple' : 'Email';
  const syncLabel =
    sync.phase === 'syncing' ? 'Syncing…'
      : sync.phase === 'offline' ? 'Offline — changes will sync when you’re back online'
        : sync.phase === 'error' ? `Sync problem — ${sync.error ?? 'tap to retry'}`
          : sync.lastSyncedAt ? `Synced ${new Date(sync.lastSyncedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Not synced yet';
  const [name, setName] = useState(state.name);
  const [income, setIncome] = useState(state.income);
  const budget = totalBudget(state);

  const toggleReminder = async (key: 'daily' | 'bills', on: boolean) => {
    if (on && !notificationsAvailable()) {
      notify(
        'Reminders unavailable here',
        Platform.OS === 'web'
          ? 'Reminders work in the iOS and Android apps.'
          : 'Expo Go on Android doesn’t support notifications. Install a development build (npx expo run:android) to use reminders.',
      );
      return;
    }
    if (on && !(await ensurePermission())) {
      notify('Notifications are off', 'Allow notifications for Pace in your phone’s Settings to get reminders.');
      return;
    }
    haptic.select();
    setReminders({ [key]: on });
  };

  return (
    <Screen>
      <NavHeader title="Settings" />

      <Section title="Account">
        <Row icon="person-circle" tint="blue" title={user?.email ?? 'Signed in'} subtitle={`Signed in with ${providerLabel}`} />
        <View style={styles.divider}>
          <Row
            icon={sync.phase === 'error' || sync.phase === 'offline' ? 'cloud-offline' : 'cloud-done'}
            tint={sync.phase === 'error' ? 'red' : sync.phase === 'offline' ? 'amber' : 'green'}
            title="Cloud sync"
            subtitle={syncLabel}
            onPress={syncNow}
            right={sync.phase === 'syncing' ? <ActivityIndicator color={colors.accent} /> : <Ionicons name="refresh" size={18} color={colors.ink40} />}
          />
        </View>
        <View style={styles.divider}>
          <Row
            icon="log-out-outline" tint="gray" title="Sign out" subtitle="Your data stays safe in your account"
            onPress={async () => {
              if (await confirm('Sign out?', 'Your data is saved to your account. This phone’s offline copy will be removed.', 'Sign out')) {
                await syncNow();
                const id = user?.id;
                await signOut();
                // Cleared after sign-out too, in case an in-flight sync wrote it back.
                if (id) await clearLocalCache(id);
              }
            }}
          />
        </View>
      </Section>

      <Section title="Profile">
        <View style={styles.row}>
          <IconBadge icon="person" tint="pink" size={36} rounded={false} />
          <View style={{ flex: 1 }}>
            <Txt variant="caption">Your name</Txt>
            <TextInput
              value={name}
              onChangeText={setName}
              onEndEditing={() => name.trim() && updateProfile({ name: name.trim() })}
              onBlur={() => name.trim() && updateProfile({ name: name.trim() })}
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor={colors.ink40}
              returnKeyType="done"
            />
          </View>
        </View>
        <View style={[styles.row, styles.divider]}>
          <IconBadge icon="wallet" tint="amber" size={36} rounded={false} />
          <View style={{ flex: 1 }}>
            <Txt variant="caption">Monthly income</Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Txt variant="bodyStrong" style={{ marginRight: 4 }}>Rs.</Txt>
              <TextInput
                value={income ? formatNumber(income) : ''}
                onChangeText={(t) => setIncome(Number(t.replace(/\D/g, '')) || 0)}
                onEndEditing={() => income > 0 && updateProfile({ income })}
                onBlur={() => income > 0 && updateProfile({ income })}
                keyboardType="number-pad"
                style={styles.input}
                accessibilityLabel="Monthly income"
              />
            </View>
          </View>
        </View>
        {income > 0 && budget > income && (
          <Txt variant="caption" style={{ color: colors.danger, paddingBottom: space.sm }}>
            Your pockets plan {rs(budget - income)} more than you earn.
          </Txt>
        )}
        <View style={[styles.row, styles.divider]}>
          <IconBadge icon="calendar" tint="green" size={36} rounded={false} />
          <View style={{ flex: 1 }}>
            <Txt variant="bodyStrong">Payday</Txt>
            <Txt variant="caption">Auto-saves to goals run on this day</Txt>
          </View>
          <View style={styles.stepper}>
            <Pressable onPress={() => updateProfile({ payday: state.payday <= 1 ? 28 : state.payday - 1 })} hitSlop={8} style={styles.stepBtn} accessibilityLabel="Earlier payday">
              <Ionicons name="remove" size={16} color={colors.ink} />
            </Pressable>
            <Txt variant="bodyStrong" money style={{ minWidth: 28, textAlign: 'center' }}>{state.payday}</Txt>
            <Pressable onPress={() => updateProfile({ payday: state.payday >= 28 ? 1 : state.payday + 1 })} hitSlop={8} style={styles.stepBtn} accessibilityLabel="Later payday">
              <Ionicons name="add" size={16} color={colors.ink} />
            </Pressable>
          </View>
        </View>
      </Section>

      <Section title="Reminders">
        <Row
          icon="moon" tint="purple" title="Daily check-in" subtitle={`Nudge to log spending at ${state.reminders.hour > 12 ? state.reminders.hour - 12 : state.reminders.hour} ${state.reminders.hour >= 12 ? 'PM' : 'AM'}`}
          right={<Switch value={state.reminders.daily} onValueChange={(v) => toggleReminder('daily', v)} trackColor={{ true: colors.accent, false: colors.ink10 }} thumbColor={colors.surface} />}
        />
        {state.reminders.daily && (
          <View style={styles.hours}>
            {HOURS.map((h) => (
              <Pressable key={h} onPress={() => setReminders({ hour: h })} style={[styles.hour, state.reminders.hour === h && styles.hourOn]}>
                <Txt variant="captionStrong" style={{ color: state.reminders.hour === h ? colors.onInk : colors.ink60 }}>
                  {h > 12 ? h - 12 : h} {h >= 12 ? 'PM' : 'AM'}
                </Txt>
              </Pressable>
            ))}
          </View>
        )}
        <View style={styles.divider}>
          <Row
            icon="notifications" tint="red" title="Bill reminders" subtitle="The day before each bill is due"
            right={<Switch value={state.reminders.bills} onValueChange={(v) => toggleReminder('bills', v)} trackColor={{ true: colors.accent, false: colors.ink10 }} thumbColor={colors.surface} />}
          />
        </View>
      </Section>

      <Section title="Add transactions">
        <Row icon="chatbubble-ellipses" tint="green" title="Import bank SMS" subtitle="Paste, share or automate alerts" onPress={() => router.push('/import-sms')} />
        <View style={styles.divider}>
          <Row icon="document-text" tint="purple" title="Import statement" subtitle="CSV export from your bank" onPress={() => router.push('/import-statement')} />
        </View>
      </Section>

      <Section title="Budget">
        <Row icon="grid" tint="blue" title="Pockets" subtitle={`${state.pockets.length} pockets · ${rs(budget)} / month`} onPress={() => router.push('/(tabs)/plan')} />
        <View style={styles.divider}>
          <Row icon="receipt" tint="amber" title="Bills" subtitle={`${state.bills.length} tracked`} onPress={() => router.push({ pathname: '/(tabs)/plan', params: { tab: 'bills' } })} />
        </View>
      </Section>

      <Section title="Reports">
        <Row icon="receipt" tint="purple" title="Taxes & charges" subtitle="WHT, FED, zakat and bank fees by tax year" onPress={() => router.push('/taxes')} />
      </Section>

      <Section title="Data">
        <Row
          icon="share-outline" tint="teal" title="Export transactions" subtitle={`${state.transactions.length} as CSV`}
          onPress={() => exportTransactions(state).catch(() => notify('Export failed', 'Please try again.'))}
        />
        <View style={styles.divider}>
          <Row
            icon="flask" tint="gray" title="Load sample data" subtitle="Explore Pace with 3 months of example activity"
            onPress={async () => {
              if (await confirm('Load sample data?', 'This replaces your transactions, goals and bills with example data.', 'Load')) {
                loadSampleData();
                router.dismissTo('/(tabs)');
              }
            }}
          />
        </View>
        <View style={styles.divider}>
          <Row
            icon="refresh-circle" tint="red" title="Erase all data" subtitle="Start over — keeps your account" danger
            onPress={async () => {
              if (await confirm('Erase all data?', 'All transactions, goals, bills and settings will be deleted from your account and every device. This can’t be undone.', 'Erase')) {
                reset();
                router.dismissTo('/onboarding');
              }
            }}
          />
        </View>
        <View style={styles.divider}>
          <Row
            icon="trash" tint="red" title="Delete account" subtitle="Permanently delete your account and data" danger
            onPress={async () => {
              if (!(await confirm('Delete your account?', 'Your account and everything in it will be permanently deleted from Pace’s servers. This can’t be undone.', 'Delete account'))) return;
              try {
                const id = user?.id;
                await deleteAccount();
                if (id) await clearLocalCache(id);
              } catch (e) {
                notify('Couldn’t delete account', String((e as Error)?.message ?? e));
              }
            }}
          />
        </View>
      </Section>

      <View style={{ alignItems: 'center', gap: space.xs, paddingVertical: space.md }}>
        <LogoTile size={40} />
        <Txt variant="caption" style={{ textAlign: 'center' }}>Pace 1.0 · Synced securely to your account</Txt>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm, minHeight: 56 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.ink10 },
  input: { flex: 1, minWidth: 0, fontFamily: fonts.semibold, fontSize: 15, color: colors.ink, padding: 0, paddingVertical: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.xxs },
  stepBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.ink05, alignItems: 'center', justifyContent: 'center' },
  hours: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, paddingBottom: space.sm },
  hour: { paddingHorizontal: space.sm, height: 32, borderRadius: radius.pill, backgroundColor: colors.ink05, justifyContent: 'center' },
  hourOn: { backgroundColor: colors.ink },
});
