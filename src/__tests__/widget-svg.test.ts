import { writeFileSync } from 'node:fs';
import { initialState, recommendedPockets, sampleData } from '@/store/seed';
import { buildSnapshot, SIGNED_OUT_SNAPSHOT } from '@/widgets/snapshot';
import { messageSvg, pocketSvg, pocketsSvg, safeSvg, type Theme } from '@/widgets/svg';

const pockets = recommendedPockets(300000);
const state = { ...initialState(), onboarded: true, name: 'T', pockets, ...sampleData(pockets, 300000, new Date(2026, 9, 7, 12)) };
state.transactions.unshift({ id: 'x', merchant: 'Khaadi', amount: -26000, date: new Date(2026, 9, 7, 12).toISOString(), pocketId: 'shopping' });
const s = buildSnapshot(state, new Date(2026, 9, 7, 12));

const designs: Record<string, (t: Theme) => string> = {
  'pocket-food': (t) => pocketSvg(s.pockets.find((p) => p.id === 'food')!, s.month, 170, 170, t),
  'pocket-shopping': (t) => pocketSvg(s.pockets.find((p) => p.id === 'shopping')!, s.month, 170, 170, t),
  'pocket-narrow': (t) => pocketSvg(s.pockets.find((p) => p.id === 'essentials')!, s.month, 120, 120, t),
  safe: (t) => safeSvg(s, 170, 170, t),
  pockets: (t) => pocketsSvg(s, 350, 190, t),
  'pockets-tall': (t) => pocketsSvg(s, 350, 330, t),
  message: (t) => messageSvg(170, 170, 'Sign in to see your pockets', t),
};

describe('widget SVGs', () => {
  it.each(Object.keys(designs))('%s renders well-formed SVG with escaped text', (name) => {
    for (const t of ['light', 'dark'] as Theme[]) {
      const svg = designs[name](t);
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg).not.toMatch(/NaN|undefined/);
      expect(svg).not.toMatch(/&(?!amp;|lt;|gt;|#\d+;)/); // "Food & Dining" must be escaped
      if (process.env.WIDGET_PREVIEW_DIR) writeFileSync(`${process.env.WIDGET_PREVIEW_DIR}/${name}-${t}.svg`, svg);
    }
  });

  it('shows more pocket rows on taller widgets', () => {
    const rows = (svg: string) => (svg.match(/ rx="7"/g) ?? []).length;
    expect(rows(pocketsSvg(s, 350, 330, 'light'))).toBeGreaterThan(rows(pocketsSvg(s, 350, 190, 'light')));
  });

  it('has a signed-out snapshot with no pockets', () => expect(SIGNED_OUT_SNAPSHOT.pockets).toHaveLength(0));
});
