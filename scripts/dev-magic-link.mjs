// Dev helper: prints a sign-in link for an email without sending an email (uses the server-only secret key).
// Run: node --env-file=.env.local scripts/dev-magic-link.mjs you@example.com [redirectUrl]
import { createClient } from '@supabase/supabase-js';
const [email, redirectTo = 'http://localhost:8081/auth/callback'] = process.argv.slice(2);
if (!email) throw new Error('usage: dev-magic-link.mjs <email> [redirectUrl]');
const admin = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email, options: { redirectTo } });
if (error && /not found|exist/i.test(error.message)) {
  await admin.auth.admin.createUser({ email, email_confirm: true });
  const retry = await admin.auth.admin.generateLink({ type: 'magiclink', email, options: { redirectTo } });
  console.log(retry.data.properties.action_link);
} else if (error) throw error;
else console.log(data.properties.action_link);
