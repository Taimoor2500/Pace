import * as Linking from 'expo-linking';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { completeAuthFromUrl, useAuth } from '@/auth/auth-provider';
import { Button } from '@/components/button';
import { LogoTile } from '@/components/logo';
import { Txt } from '@/components/text';
import { supabase } from '@/lib/supabase';
import { colors, space } from '@/theme';

/** Landing route for email links (and Google OAuth on web): finishes the sign-in, then hands off to "/". */
export default function AuthCallback() {
  const params = useLocalSearchParams<{ code?: string; error_description?: string }>();
  const url = Linking.useLinkingURL();
  const { session } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || session) return;
    const code = typeof params.code === 'string' ? params.code : undefined;
    const href = url ?? (typeof window !== 'undefined' ? window.location?.href : undefined);
    if (params.error_description) {
      setError(String(params.error_description));
      return;
    }
    if (!code && !href) return; // wait for the URL to arrive
    started.current = true;
    console.info('[auth] callback received', { hasCode: !!code, hasUrl: !!href });
    (async () => {
      try {
        if (code) {
          const { error: e } = await supabase.auth.exchangeCodeForSession(code);
          if (e) throw e;
        } else if (!(await completeAuthFromUrl(href!))) {
          throw new Error('This link has no sign-in details');
        }
        console.info('[auth] signed in from link');
      } catch (e) {
        const msg = String((e as Error)?.message ?? e);
        console.warn('[auth] link sign-in failed:', msg);
        setError(
          /code verifier|flow state|both auth code and code verifier/i.test(msg)
            ? 'Open the link on the same phone where you requested it, or request a new one.'
            : msg,
        );
      }
    })();
  }, [params.code, params.error_description, url, session]);

  // Signed in (just now, or already) — go to the app.
  if (session) return <Redirect href="/" />;

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, backgroundColor: colors.canvas, padding: space.xl }}>
      <LogoTile size={56} />
      {error ? (
        <>
          <Txt variant="title" style={{ textAlign: 'center' }}>That sign-in link didn’t work</Txt>
          <Txt variant="body" style={{ textAlign: 'center', color: colors.ink60 }}>{error}</Txt>
          <Button label="Back to sign in" onPress={() => router.replace('/sign-in')} style={{ alignSelf: 'stretch' }} />
        </>
      ) : (
        <>
          <ActivityIndicator color={colors.accent} />
          <Txt variant="caption">Signing you in…</Txt>
        </>
      )}
    </View>
  );
}
