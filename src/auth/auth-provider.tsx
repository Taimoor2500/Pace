import type { Session } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

/** Where Supabase sends the user back after Google OAuth or a magic link. Must be in Auth → URL Configuration. */
export const authRedirectUrl = () => Linking.createURL('auth/callback');

type Auth = {
  session: Session | null;
  loading: boolean;
  appleAvailable: boolean;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  sendEmailCode: (email: string) => Promise<void>;
  verifyEmailCode: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<Auth | null>(null);

/** Completes a PKCE redirect (Google OAuth, magic link) from the callback URL. */
export async function completeAuthFromUrl(url: string): Promise<boolean> {
  const { queryParams } = Linking.parse(url);
  const fragment = new URLSearchParams(url.split('#')[1] ?? '');
  const error = (queryParams?.error_description as string) || fragment.get('error_description');
  if (error) throw new Error(error);
  const code = queryParams?.code as string | undefined;
  if (code) {
    const { error: e } = await supabase.auth.exchangeCodeForSession(code);
    if (e) throw e;
    return true;
  }
  const access_token = fragment.get('access_token');
  const refresh_token = fragment.get('refresh_token');
  if (access_token && refresh_token) {
    const { error: e } = await supabase.auth.setSession({ access_token, refresh_token });
    if (e) throw e;
    return true;
  }
  return false;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    if (Platform.OS === 'ios') AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => {});
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<Auth>(
    () => ({
      session,
      loading,
      appleAvailable,

      // Native Sign in with Apple → exchange Apple's identity token for a Supabase session.
      signInWithApple: async () => {
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
        });
        if (!credential.identityToken) throw new Error('Apple did not return an identity token.');
        const { error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken });
        if (error) throw error;
        // Apple only shares the name on the very first sign-in — keep it for the profile.
        const given = credential.fullName?.givenName;
        if (given) await supabase.auth.updateUser({ data: { full_name: [given, credential.fullName?.familyName].filter(Boolean).join(' '), given_name: given } });
      },

      // Google via Supabase OAuth in an in-app browser (works in Expo Go and production builds).
      signInWithGoogle: async () => {
        const redirectTo = authRedirectUrl();
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo, skipBrowserRedirect: Platform.OS !== 'web', queryParams: { prompt: 'select_account' } },
        });
        if (error) throw error;
        if (Platform.OS === 'web' || !data.url) return;
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type === 'success') await completeAuthFromUrl(result.url);
      },

      // Passwordless email: Supabase emails a 6-digit code (and a link that also works on this device).
      sendEmailCode: async (email) => {
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim().toLowerCase(),
          options: { shouldCreateUser: true, emailRedirectTo: authRedirectUrl() },
        });
        if (error) throw error;
      },
      verifyEmailCode: async (email, code) => {
        const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' });
        if (error) throw error;
      },

      signOut: async () => {
        await supabase.auth.signOut();
      },
      deleteAccount: async () => {
        const { error } = await supabase.rpc('delete_account');
        if (error) throw error;
        await supabase.auth.signOut({ scope: 'local' });
      },
    }),
    [session, loading, appleAvailable],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): Auth {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
