import { supabase } from '@/lib/supabase';
import { cleanRows, TABLES, type Changes, type Rows, type Table } from './mapping';

const PAGE = 1000; // PostgREST's default max rows per request
const CHUNK = 500;

async function selectAll(table: Table, userId: string): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('user_id', userId)
      .order('id')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) return out;
  }
}

/** Downloads the user's whole account. Returns null if they have never synced (no profile row). */
export async function pullAll(userId: string): Promise<Rows | null> {
  const { data: profile, error } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (!profile) return null;
  const [pockets, transactions, goals, contributions, bills] = await Promise.all(TABLES.map((t) => selectAll(t, userId)));
  return cleanRows({ profile, pockets, transactions, goals, contributions, bills });
}

const chunks = <T,>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

/** Writes local changes. Deletes run first so a re-created id isn't removed afterwards. */
export async function pushChanges(userId: string, changes: Changes): Promise<void> {
  if (changes.profile) {
    const { error } = await supabase.from('profiles').upsert({ user_id: userId, ...changes.profile });
    if (error) throw error;
  }
  for (const table of TABLES) {
    for (const ids of chunks(changes.deletes[table], 200)) {
      const { error } = await supabase.from(table).delete().eq('user_id', userId).in('id', ids);
      if (error) throw error;
    }
  }
  for (const table of TABLES) {
    for (const rows of chunks(changes.upserts[table] as { id: string }[], CHUNK)) {
      const { error } = await supabase.from(table).upsert(rows.map((r) => ({ user_id: userId, ...r })));
      if (error) throw error;
    }
  }
}
