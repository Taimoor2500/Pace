import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/auth/auth-provider';
import { AppEffects } from '@/components/app-effects';
import { Button } from '@/components/button';
import { LogoTile } from '@/components/logo';
import { Txt } from '@/components/text';
import { StoreProvider, useStore } from '@/store/store';
import { publishWidgets } from '@/widgets/publish';
import { SIGNED_OUT_SNAPSHOT } from '@/widgets/snapshot';
import { colors, space } from '@/theme';

// Keep the logo splash up until fonts, session and data are ready — no blank flash.
SplashScreen.preventAutoHideAsync().catch(() => {});

const Blank = () => <View style={{ flex: 1, backgroundColor: colors.canvas }} />;

/** One navigator; `Stack.Protected` decides which routes exist for a signed-in vs signed-out user. */
function AppStack({ signedIn }: { signedIn: boolean }) {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="add-expense" options={{ presentation: 'modal' }} />
        <Stack.Screen name="transaction/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="add-goal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="bill-form" options={{ presentation: 'modal' }} />
        <Stack.Screen name="pocket-form" options={{ presentation: 'modal' }} />
        <Stack.Screen name="add-money" options={{ presentation: 'modal' }} />
        <Stack.Screen name="move-money" options={{ presentation: 'modal' }} />
        <Stack.Screen name="review" options={{ animation: 'fade_from_bottom' }} />
        {/* Every app route must be listed here — undeclared routes are not protected. */}
        <Stack.Screen name="settings" />
        <Stack.Screen name="transactions" />
        <Stack.Screen name="pocket/[id]" />
        <Stack.Screen name="goal/[id]" />
        <Stack.Screen name="import-sms" />
        <Stack.Screen name="import-statement" />
        <Stack.Screen name="taxes" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" options={{ animation: 'fade' }} />
      </Stack.Protected>
      <Stack.Screen name="auth/callback" options={{ animation: 'none' }} />
    </Stack>
  );
}

function LoadingAccount({ slow, onRetry, onSignOut }: { slow: boolean; onRetry: () => void; onSignOut: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.md }}>
      <LogoTile size={64} />
      <ActivityIndicator color={colors.accent} />
      <Txt variant="caption">Loading your account…</Txt>
      {slow && (
        <>
          <Txt variant="caption" style={{ textAlign: 'center' }}>This is taking longer than usual. Check your connection.</Txt>
          <Button label="Try again" onPress={onRetry} style={{ alignSelf: 'stretch' }} />
          <Button label="Sign out" variant="secondary" onPress={onSignOut} style={{ alignSelf: 'stretch' }} />
        </>
      )}
    </View>
  );
}

/** Signed-in shell: waits for the user's data (cache or first download) before showing the app. */
function SignedIn() {
  const { hydrated, sync, syncNow } = useStore();
  const { signOut } = useAuth();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    // Hide the splash as soon as we have something meaningful to show (including the loading state).
    SplashScreen.hideAsync().catch(() => {});
    const t = setTimeout(() => setSlow(true), 12000);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    console.info('[sync]', sync.phase, sync.error ?? '');
  }, [sync.phase, sync.error]);

  if (!hydrated && sync.phase === 'needs-network') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.md }}>
        <LogoTile size={64} />
        <Txt variant="title" style={{ textAlign: 'center' }}>Couldn’t load your account</Txt>
        <Txt variant="body" style={{ textAlign: 'center', color: colors.ink60 }}>
          Pace needs an internet connection the first time you sign in on this device.
        </Txt>
        <Button label="Try again" onPress={syncNow} style={{ alignSelf: 'stretch' }} />
        <Button label="Sign out" variant="secondary" onPress={signOut} style={{ alignSelf: 'stretch' }} />
      </View>
    );
  }
  if (!hydrated) return <LoadingAccount slow={slow} onRetry={syncNow} onSignOut={signOut} />;
  return (
    <>
      <AppEffects />
      <AppStack signedIn />
    </>
  );
}

function Root() {
  const { session, loading } = useAuth();
  useEffect(() => {
    if (!loading && !session) {
      SplashScreen.hideAsync().catch(() => {});
      // Don't leave the previous user's balances on the home screen.
      publishWidgets(SIGNED_OUT_SNAPSHOT).catch(() => {});
    }
  }, [loading, session]);
  if (loading) return <Blank />;
  const userId = session?.user.id ?? null;
  const meta = session?.user.user_metadata ?? {};
  const suggestedName = String(meta.given_name ?? meta.full_name ?? meta.name ?? '').split(' ')[0];
  // A store is always mounted (empty when signed out) so no screen ever renders without one.
  return (
    <StoreProvider key={userId ?? 'signed-out'} userId={userId} suggestedName={suggestedName}>
      {session ? <SignedIn /> : <AppStack signedIn={false} />}
    </StoreProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_600SemiBold, Inter_700Bold });
  if (!fontsLoaded) return <Blank />;
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Root />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
