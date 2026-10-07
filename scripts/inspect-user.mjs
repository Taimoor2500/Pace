// Dev helper: summarises what's stored server-side for a user. Run: node --env-file=.env.local scripts/inspect-user.mjs <email>
import { createClient } from '@supabase/supabase-js';
const admin = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 });
const user = users.find((u) => u.email === process.argv[2]);
if (!user) { console.log('no such user'); process.exit(0); }
const out = { user: user.email };
const { data: profile } = await admin.from('profiles').select('name,income,payday,onboarded').eq('user_id', user.id).maybeSingle();
out.profile = profile;
for (const t of ['pockets', 'transactions', 'goals', 'contributions', 'bills']) {
  const { count } = await admin.from(t).select('*', { count: 'exact', head: true }).eq('user_id', user.id);
  out[t] = count;
}
console.log(JSON.stringify(out));
