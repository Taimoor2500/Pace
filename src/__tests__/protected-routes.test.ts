import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/** Routes reachable without signing in. Everything else must sit inside <Stack.Protected guard={signedIn}>. */
const PUBLIC = new Set(['sign-in', 'auth/callback']);
const APP = join(__dirname, '..', 'app');

function routes(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const full = join(dir, f);
    if (statSync(full).isDirectory()) return routes(full);
    return f.endsWith('.tsx') && !f.startsWith('_') ? [relative(APP, full).replace(/\.tsx$/, '')] : [];
  });
}

it('every signed-in route is declared inside Stack.Protected', () => {
  const layout = readFileSync(join(APP, '_layout.tsx'), 'utf8');
  const protectedBlock = layout.slice(layout.indexOf('<Stack.Protected guard={signedIn}>'), layout.indexOf('</Stack.Protected>'));
  const declared = new Set([...protectedBlock.matchAll(/name="([^"]+)"/g)].map((m) => m[1]));
  const missing = routes(APP)
    .filter((r) => !PUBLIC.has(r))
    // Nested routes are covered by their top-level folder (e.g. "onboarding", "(tabs)").
    .filter((r) => !declared.has(r) && !declared.has(r.split('/')[0]));
  expect(missing).toEqual([]);
});
