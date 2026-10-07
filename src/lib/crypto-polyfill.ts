import * as ExpoCrypto from 'expo-crypto';
import { Platform } from 'react-native';

/**
 * React Native has no WebCrypto. Without it, Supabase's PKCE falls back to Math.random() for the code verifier
 * and a "plain" (unhashed) challenge. Provide the two pieces it needs from expo-crypto (available in Expo Go).
 */
type Subtle = { digest: (algorithm: AlgorithmIdentifier, data: BufferSource) => Promise<ArrayBuffer> };
const g = globalThis as { crypto?: { getRandomValues?: unknown; subtle?: Subtle } };

if (Platform.OS !== 'web') {
  g.crypto ??= {};
  if (typeof g.crypto.getRandomValues !== 'function') {
    g.crypto.getRandomValues = <T extends ArrayBufferView>(array: T) =>
      ExpoCrypto.getRandomValues(array as unknown as Uint8Array) as unknown as T;
  }
  if (!g.crypto.subtle) {
    g.crypto.subtle = {
      digest: async (algorithm, data) => {
        const name = typeof algorithm === 'string' ? algorithm : algorithm.name;
        if (name.toUpperCase() !== 'SHA-256') throw new Error(`Unsupported digest: ${name}`);
        return ExpoCrypto.digest(ExpoCrypto.CryptoDigestAlgorithm.SHA256, data);
      },
    };
  }
}
