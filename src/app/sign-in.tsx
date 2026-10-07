import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '@/auth/auth-provider';
import { Button } from '@/components/button';
import { haptic } from '@/components/haptics';
import { LogoTile } from '@/components/logo';
import { PressableScale } from '@/components/pressable-scale';
import { TextField } from '@/components/text-field';
import { Txt } from '@/components/text';
import { supabaseConfigured } from '@/lib/supabase';
import { colors, radius, shadow, space, tints } from '@/theme';

function GoogleG({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <Path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <Path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <Path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </Svg>
  );
}

const message = (e: unknown) => {
  const m = String((e as Error)?.message ?? e);
  if (/ERR_REQUEST_CANCELED|canceled|cancelled/i.test(m)) return null; // user closed the sheet
  if (/rate limit/i.test(m)) return 'Too many attempts — please wait a minute and try again.';
  if (/token has expired|invalid/i.test(m)) return 'That code is invalid or expired. Request a new one.';
  if (/network|fetch/i.test(m)) return 'No connection. Check your internet and try again.';
  return m;
};

export default function SignIn() {
  const insets = useSafeAreaInsets();
  const { appleAvailable, signInWithApple, signInWithGoogle, sendEmailCode, verifyEmailCode } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [busy, setBusy] = useState<null | 'apple' | 'google' | 'email' | 'verify'>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const run = async (kind: NonNullable<typeof busy>, fn: () => Promise<void>) => {
    setError(null);
    setBusy(kind);
    try {
      await fn();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(null);
    }
  };

  const validEmail = /^\S+@\S+\.\S+$/.test(email.trim());

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.canvas }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.body, { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.lg }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: 'center', gap: space.md, marginBottom: space.lg }}>
          <LogoTile size={72} />
          <Txt variant="display" style={{ textAlign: 'center', fontSize: 28, lineHeight: 34 }}>Welcome to Pace</Txt>
          <Txt variant="body" style={{ textAlign: 'center', color: colors.ink60, maxWidth: 300 }}>
            Sign in to keep your budget safe and in sync across your devices.
          </Txt>
        </View>

        {!supabaseConfigured && (
          <View style={[styles.banner, { backgroundColor: tints.amber.bg }]}>
            <Ionicons name="construct" size={18} color={tints.amber.fg} />
            <Txt variant="caption" style={{ flex: 1, color: colors.ink80 }}>
              Supabase isn’t configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env.local and restart Expo.
            </Txt>
          </View>
        )}

        {appleAvailable && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={radius.pill}
            style={{ height: 56, opacity: busy ? 0.5 : 1 }}
            onPress={() => !busy && run('apple', signInWithApple)}
          />
        )}

        <PressableScale
          onPress={() => !busy && run('google', signInWithGoogle)}
          style={styles.google}
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
        >
          {busy === 'google' ? <ActivityIndicator color={colors.ink} /> : <GoogleG />}
          <Txt variant="bodyStrong">Continue with Google</Txt>
        </PressableScale>

        <View style={styles.divider}>
          <View style={styles.line} />
          <Txt variant="caption">or use email</Txt>
          <View style={styles.line} />
        </View>

        {!codeSent ? (
          <>
            <TextField
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="send"
              onSubmitEditing={() => validEmail && run('email', async () => { await sendEmailCode(email); setCodeSent(true); haptic.success(); })}
              accessibilityLabel="Email"
            />
            <Button
              label={busy === 'email' ? 'Sending…' : 'Email me a sign-in link'}
              disabled={!validEmail || !!busy}
              onPress={() => run('email', async () => { await sendEmailCode(email); setCodeSent(true); haptic.success(); })}
            />
          </>
        ) : (
          <>
            <View style={[styles.banner, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="mail" size={18} color={colors.accent} />
              <Txt variant="caption" style={{ flex: 1, color: colors.ink80 }}>
                Check <Txt variant="captionStrong">{email.trim()}</Txt> and tap the sign-in link <Txt variant="captionStrong">on this phone</Txt>. It brings you straight back to Pace.
              </Txt>
            </View>
            {showCode ? (
              <>
                <TextField
                  value={code}
                  onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 8))}
                  placeholder="Code from email"
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  autoFocus
                  style={{ fontSize: 22, letterSpacing: 6, textAlign: 'center' }}
                  accessibilityLabel="Sign-in code"
                />
                <Button
                  label={busy === 'verify' ? 'Checking…' : 'Sign in'}
                  disabled={code.length < 6 || !!busy}
                  onPress={() => run('verify', () => verifyEmailCode(email, code))}
                />
              </>
            ) : (
              <Pressable onPress={() => setShowCode(true)} hitSlop={8} style={{ alignSelf: 'center', paddingVertical: space.xs }}>
                <Txt variant="captionStrong" style={{ color: colors.ink60 }}>Got a code instead? Enter it</Txt>
              </Pressable>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Pressable onPress={() => { setCodeSent(false); setShowCode(false); setCode(''); setNotice(null); }} hitSlop={8}>
                <Txt variant="captionStrong" style={{ color: colors.ink60 }}>Use a different email</Txt>
              </Pressable>
              <Pressable
                onPress={() => run('email', async () => { await sendEmailCode(email); setNotice('Sent again — check your inbox and spam folder.'); })}
                hitSlop={8}
                disabled={!!busy}
              >
                <Txt variant="captionStrong" style={{ color: colors.accent }}>Resend email</Txt>
              </Pressable>
            </View>
            {notice && <Txt variant="caption" style={{ textAlign: 'center' }}>{notice}</Txt>}
          </>
        )}

        {error && (
          <View style={[styles.banner, { backgroundColor: colors.dangerSoft }]} accessibilityLiveRegion="polite">
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Txt variant="caption" style={{ flex: 1, color: colors.ink80 }}>{error}</Txt>
          </View>
        )}

        <Txt variant="caption" style={{ textAlign: 'center', marginTop: space.md }}>
          Your data is private to your account and protected with row-level security.
        </Txt>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: space.lg, gap: space.sm, flexGrow: 1 },
  google: {
    height: 56, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.ink10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, ...shadow(1),
  },
  divider: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginVertical: space.sm },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.ink10 },
  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xs, padding: space.sm, borderRadius: radius.md },
});
