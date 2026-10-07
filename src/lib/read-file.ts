import { File } from 'expo-file-system';
import * as LegacyFS from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';

/** A picked or shared file, with readers that work around platform sandboxing. */
export type PickedFile = {
  name: string;
  mime: string | null;
  size: number | null;
  text: () => Promise<string>;
  bytes: () => Promise<Uint8Array>;
};

/**
 * Opens the system file picker. On iOS/Android we use expo-file-system's own picker: it returns a File the app
 * is granted access to. (expo-document-picker copies files into a cache folder that Expo Go's sandbox can't read.)
 */
export async function pickFile(): Promise<PickedFile | null> {
  if (Platform.OS === 'web') {
    const res = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: false });
    const a = res.canceled ? null : res.assets?.[0];
    if (!a?.file) return null;
    const f = a.file;
    return { name: a.name, mime: a.mimeType ?? null, size: a.size ?? null, text: () => f.text(), bytes: async () => new Uint8Array(await f.arrayBuffer()) };
  }
  const res = await File.pickFileAsync({ mimeTypes: '*/*' });
  if (res.canceled || !res.result) return null;
  const file = res.result;
  return {
    name: displayName(file.name, file.type),
    mime: file.type || null,
    size: file.size ?? null,
    text: () => file.text(),
    bytes: () => file.bytes(),
  };
}

/** Android document providers sometimes report ids like "msf:1000318148" instead of a file name. */
function displayName(name: string, mime?: string | null): string {
  if (/\.[a-z0-9]{2,5}$/i.test(name)) return name;
  const ext = /spreadsheetml/.test(mime ?? '') ? 'xlsx' : /excel/.test(mime ?? '') ? 'xls' : /csv|comma/.test(mime ?? '') ? 'csv' : /pdf/.test(mime ?? '') ? 'pdf' : '';
  return ext ? `Statement.${ext}` : 'Statement';
}

/** A file handed to us by URI (e.g. Android "Share → Pace"). Tries the new API, then the legacy one. */
export function fileFromUri(uri: string, mime?: string | null): PickedFile {
  const name = decodeURIComponent(uri.split('/').pop() ?? 'statement');
  const attempt = async <T,>(modern: () => Promise<T>, legacy: () => Promise<T>) => {
    try {
      return await modern();
    } catch {
      return legacy();
    }
  };
  return {
    name,
    mime: mime || null,
    size: null,
    text: () => attempt(() => new File(uri).text(), () => LegacyFS.readAsStringAsync(uri)),
    bytes: () =>
      attempt(
        () => new File(uri).bytes(),
        async () => base64ToBytes(await LegacyFS.readAsStringAsync(uri, { encoding: LegacyFS.EncodingType.Base64 })),
      ),
  };
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const LOOKUP = new Uint8Array(256);
for (let i = 0; i < ALPHABET.length; i++) LOOKUP[ALPHABET.charCodeAt(i)] = i;

/** Base64 → bytes without relying on atob (not guaranteed on every JS engine). */
export function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const a = LOOKUP[clean.charCodeAt(i)], b = LOOKUP[clean.charCodeAt(i + 1)];
    const c = LOOKUP[clean.charCodeAt(i + 2)], d = LOOKUP[clean.charCodeAt(i + 3)];
    out[o++] = (a << 2) | (b >> 4);
    if (i + 2 < clean.length) out[o++] = ((b & 15) << 4) | (c >> 2);
    if (i + 3 < clean.length) out[o++] = ((c & 3) << 6) | d;
  }
  return out.subarray(0, o);
}
