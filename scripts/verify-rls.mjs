// Verifies row-level security against the live project with two throwaway users (cleaned up afterwards).
// Run: node --env-file=.env.local scripts/verify-rls.mjs
import { createClient } from '@supabase/supabase-js';
const url = process.env.EXPO_PUBLIC_SUPABASE_URL, anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

async function signedIn(email) {
  await admin.auth.admin.createUser({ email, email_confirm: true });
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (error) throw error;
  const c = createClient(url, anon, { auth: { persistSession: false } });
  const v = await c.auth.verifyOtp({ email, token: data.properties.email_otp, type: 'email' });
  if (v.error) throw v.error;
  return { c, id: v.data.user.id };
}
const a = await signedIn('pace-test-a@example.com');
const b = await signedIn('pace-test-b@example.com');
const ins = await a.c.from('pockets').insert({ user_id: a.id, id: 'p1', name: 'Food', icon: 'cafe', tint: 'red', budget: 100 });
console.log('A inserts own pocket:', ins.error ? ins.error.message : 'ok');
console.log('A reads own:', (await a.c.from('pockets').select('id')).data);
console.log('B reads all pockets:', (await b.c.from('pockets').select('id')).data);
const spoof = await b.c.from('pockets').insert({ user_id: a.id, id: 'evil', name: 'x', icon: 'x', tint: 'x' });
console.log('B writes as A:', spoof.error ? 'blocked: ' + spoof.error.code : 'ALLOWED (bad)');
const upd = await b.c.from('pockets').update({ budget: 0 }).eq('id', 'p1').select();
console.log('B updates A row:', upd.data?.length ? 'ALLOWED (bad)' : 'no rows affected');
const del = await a.c.rpc('delete_account');
console.log('A deletes account:', del.error ? del.error.message : 'ok');
const left = await admin.from('pockets').select('id').eq('user_id', a.id);
console.log('A rows remaining after delete (admin view):', left.data);
await admin.auth.admin.deleteUser(b.id);
console.log('cleanup done');
