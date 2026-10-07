import { ICON_PATHS } from './icon-paths';
import type { WidgetPocket, WidgetSnapshot } from './snapshot';

/**
 * Android widgets are drawn as a single SVG sized to the widget (dp), which gives us real icons, rounded bars and
 * proper type — things RemoteViews layouts can't do well. Pure functions so designs can be previewed off-device.
 */
export type Theme = 'light' | 'dark';

const FONT = `font-family="sans-serif"`;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const palette = (t: Theme) =>
  t === 'light'
    ? { ink: '#0E1116', ink2: '#2E343E', muted: '#4B5260', card: '#FFFFFF', canvas: '#E9EFE8', track: 'rgba(255,255,255,0.55)', hair: 'rgba(14,17,22,0.10)', red: '#D93B40', green: '#178A42', chip: 'rgba(255,255,255,0.62)' }
    : { ink: '#F5F6F7', ink2: '#DADDE2', muted: '#AEB4BD', card: '#1F2228', canvas: '#16181D', track: 'rgba(255,255,255,0.16)', hair: 'rgba(255,255,255,0.10)', red: '#FF7A7E', green: '#4CD27E', chip: 'rgba(255,255,255,0.14)' };

/** Rough width of a string in a bold sans-serif — enough to shrink long amounts to fit. */
const textWidth = (s: string, size: number, bold = true) => s.length * size * (bold ? 0.6 : 0.54);
const fit = (s: string, max: number, ideal: number, min: number, bold = true) =>
  Math.max(min, Math.min(ideal, Math.floor(max / (s.length * (bold ? 0.6 : 0.54)))));

function icon(name: string, x: number, y: number, size: number, color: string): string {
  const inner = ICON_PATHS[name] ?? ICON_PATHS.sparkles;
  const k = size / 512;
  return `<g transform="translate(${x} ${y}) scale(${k})" fill="${color}" color="${color}">${inner}</g>`;
}

function bar(x: number, y: number, w: number, h: number, value: number, fill: string, track: string): string {
  const v = Math.max(0, Math.min(1, value));
  const fw = v > 0 ? Math.max(h, w * v) : 0;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${track}"/>` +
    (fw ? `<rect x="${x}" y="${y}" width="${fw}" height="${h}" rx="${h / 2}" fill="${fill}"/>` : '');
}

/** Pace leaf mark (from the app icon), drawn in a 1024 box. */
function leaf(x: number, y: number, size: number, fg: string, vein: string): string {
  const k = size / 1024;
  return `<g transform="translate(${x} ${y}) scale(${k}) translate(-44 -44)">` +
    `<path d="M400 790 V450" stroke="${fg}" stroke-width="108" stroke-linecap="round" fill="none"/>` +
    `<path d="M354 440 C380 330 560 262 712 300 C740 420 690 560 560 610 C490 636 414 628 354 598 Z" fill="${fg}" stroke="${fg}" stroke-width="16" stroke-linejoin="round"/>` +
    `<path d="M440 572 C520 520 604 440 658 344" stroke="${vein}" stroke-width="28" stroke-linecap="round" fill="none"/></g>`;
}

/**
 * Liquid-glass panel: translucent frosted fill (the wallpaper shows through), a soft tint glow, a diagonal
 * specular sheen and a gradient rim that catches light at the top-left. Android widgets can't blur what's
 * behind them, so the frost comes from opacity + highlights.
 */
function glass(w: number, h: number, r: number, t: Theme, tint: string): { defs: string; body: string } {
  const fill = t === 'light' ? 'rgba(255,255,255,0.52)' : 'rgba(18,22,20,0.48)';
  const defs =
    `<linearGradient id="gSheen" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#FFFFFF" stop-opacity="${t === 'light' ? 0.55 : 0.18}"/>` +
    `<stop offset="0.42" stop-color="#FFFFFF" stop-opacity="${t === 'light' ? 0.08 : 0.03}"/>` +
    `<stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>` +
    `<radialGradient id="gTint" cx="0.88" cy="0.08" r="0.95">` +
    `<stop offset="0" stop-color="${tint}" stop-opacity="${t === 'light' ? 0.30 : 0.34}"/>` +
    `<stop offset="1" stop-color="${tint}" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="gRim" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#FFFFFF" stop-opacity="${t === 'light' ? 0.95 : 0.45}"/>` +
    `<stop offset="0.5" stop-color="#FFFFFF" stop-opacity="${t === 'light' ? 0.25 : 0.10}"/>` +
    `<stop offset="1" stop-color="#FFFFFF" stop-opacity="${t === 'light' ? 0.55 : 0.22}"/></linearGradient>`;
  const body =
    `<rect width="${w}" height="${h}" rx="${r}" fill="${fill}"/>` +
    `<rect width="${w}" height="${h}" rx="${r}" fill="url(#gTint)"/>` +
    `<rect width="${w}" height="${h}" rx="${r}" fill="url(#gSheen)"/>` +
    // Inner rim (light) + a faint outer edge so the panel reads on light wallpapers too.
    `<rect x="0.75" y="0.75" width="${w - 1.5}" height="${h - 1.5}" rx="${r - 0.75}" fill="none" stroke="url(#gRim)" stroke-width="1.5"/>` +
    `<rect x="0.25" y="0.25" width="${w - 0.5}" height="${h - 0.5}" rx="${r}" fill="none" stroke="${t === 'light' ? 'rgba(14,17,22,0.08)' : 'rgba(0,0,0,0.35)'}" stroke-width="0.5"/>`;
  return { defs, body };
}

/** Small glassy chip (icon holder). */
function glassChip(x: number, y: number, size: number, radius: number, t: Theme, tint?: string): string {
  return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}" fill="${tint ? alpha(tint, t === 'light' ? 0.16 : 0.26) : 'none'}"/>` +
    `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}" fill="${palette(t).chip}"/>` +
    `<rect x="${x + 0.5}" y="${y + 0.5}" width="${size - 1}" height="${size - 1}" rx="${radius - 0.5}" fill="none" stroke="url(#gRim)" stroke-width="1"/>`;
}

function frame(w: number, h: number, body: string, defs = ''): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs>${body}</svg>`;
}

/** Mixes a hex colour toward white — keeps icons vivid on dark glass. */
function lighten(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix((n >> 16) & 255)},${mix((n >> 8) & 255)},${mix(n & 255)})`;
}
const iconColor = (fg: string, t: Theme) => (t === 'dark' ? lighten(fg, 0.3) : fg);

/** Hex "#RRGGBB" → "rgba(r,g,b,a)". */
function alpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function messageSvg(w: number, h: number, text: string, t: Theme): string {
  const c = palette(t);
  const r = Math.min(28, h / 4);
  const g = glass(w, h, r, t, c.green);
  return frame(w, h,
    g.body +
    `<rect x="16" y="16" width="36" height="36" rx="10" fill="${c.green}"/>${leaf(16, 16, 36, '#FFFFFF', c.green)}` +
    `<text x="16" y="${h - 36}" ${FONT} font-size="15" font-weight="700" fill="${c.ink}">Pace</text>` +
    `<text x="16" y="${h - 16}" ${FONT} font-size="12" fill="${c.muted}">${esc(text)}</text>`,
    g.defs);
}

export function pocketSvg(p: WidgetPocket, month: string, w: number, h: number, t: Theme): string {
  const c = palette(t);
  const r = Math.min(28, h / 4);
  const pad = Math.round(Math.min(w, h) * 0.1);
  const over = p.status === 'over';
  const accent = over ? c.red : p.fg;
  const g = glass(w, h, r, t, p.fg);
  const chip = Math.round(Math.min(44, h * 0.26));
  const amountSize = fit(p.amount, w - pad * 2, Math.round(h * 0.17), 14);
  const barY = h - pad - 8;
  const ofY = barY - 10;
  const amountY = ofY - 18;
  const nameY = amountY - amountSize - 4;
  return frame(w, h,
    g.body +
    glassChip(pad, pad, chip, chip * 0.3, t, p.fg) +
    icon(p.icon, pad + chip * 0.22, pad + chip * 0.22, chip * 0.56, iconColor(p.fg, t)) +
    (w >= 140 ? `<text x="${w - pad}" y="${pad + 12}" ${FONT} font-size="11" fill="${c.muted}" text-anchor="end">${esc(month)}</text>` : '') +
    `<text x="${pad}" y="${nameY}" ${FONT} font-size="13" font-weight="600" fill="${c.ink2}">${esc(truncate(p.name, w - pad * 2, 13))}</text>` +
    `<text x="${pad}" y="${amountY}" ${FONT} font-size="${amountSize}" font-weight="700" fill="${over ? c.red : c.ink}" letter-spacing="-0.5">${esc(p.amount)}</text>` +
    `<text x="${pad}" y="${ofY}" ${FONT} font-size="11.5" fill="${c.muted}"><tspan font-weight="600" fill="${over ? c.red : c.ink2}">${over ? 'over' : 'left'}</tspan>&#160;·&#160;${esc(p.of)}</text>` +
    bar(pad, barY, w - pad * 2, 8, p.used, accent, c.track),
    g.defs);
}

export function safeSvg(s: WidgetSnapshot, w: number, h: number, t: Theme): string {
  const c = palette(t);
  const r = Math.min(28, h / 4);
  const pad = Math.round(Math.min(w, h) * 0.1);
  const amountSize = fit(s.safeToday, w - pad * 2, Math.round(h * 0.19), 14);
  const paceY = h - pad;
  const barY = paceY - 20;
  const labelY = barY - 12;
  const amountY = labelY - 18;
  const g = glass(w, h, r, t, '#7CCB5A');
  const bw = w - pad * 2;
  const dotX = pad + bw * Math.max(0, Math.min(1, s.cycle));
  return frame(w, h,
    g.body +
    `<rect x="${pad}" y="${pad}" width="34" height="34" rx="10" fill="${c.green}"/>${leaf(pad, pad, 34, '#FFFFFF', c.green)}` +
    `<text x="${w - pad}" y="${pad + 12}" ${FONT} font-size="11" fill="${c.muted}" text-anchor="end">${esc(s.month)}</text>` +
    `<text x="${pad}" y="${amountY}" ${FONT} font-size="${amountSize}" font-weight="700" fill="${c.ink}" letter-spacing="-0.5">${esc(s.safeToday)}</text>` +
    `<text x="${pad}" y="${labelY}" ${FONT} font-size="12" fill="${c.muted}">safe to spend today</text>` +
    bar(pad, barY, bw, 6, s.cycle, c.green, c.track) +
    `<circle cx="${dotX}" cy="${barY + 3}" r="7" fill="${c.green}" stroke="rgba(255,255,255,${t === 'light' ? 0.85 : 0.35})" stroke-width="3"/>` +
    `<text x="${pad}" y="${paceY}" ${FONT} font-size="11.5" font-weight="600" fill="${s.pace.includes('over') ? c.red : c.green}">${esc(truncate(fitPace(s.pace, bw, 11.5), bw, 11.5))}</text>`,
    g.defs);
}

export function pocketsSvg(s: WidgetSnapshot, w: number, h: number, t: Theme): string {
  const c = palette(t);
  const r = Math.min(28, h / 6);
  const pad = 16;
  const headerH = 52;
  const space = h - pad * 2 - headerH;
  const rows = Math.max(1, Math.min(s.pockets.length, Math.floor(space / 34)));
  // Spread rows to fill the widget when everything fits (up to a comfortable maximum).
  const rowH = Math.min(46, space / rows);
  const amountSize = fit(s.safeToday, w * 0.6, 22, 14);
  const g = glass(w, h, r, t, c.green);
  let body =
    g.body +
    `<text x="${pad}" y="${pad + 12}" ${FONT} font-size="11" fill="${c.muted}">Safe to spend today</text>` +
    `<text x="${pad}" y="${pad + 12 + amountSize + 2}" ${FONT} font-size="${amountSize}" font-weight="700" fill="${c.ink}" letter-spacing="-0.5">${esc(s.safeToday)}</text>` +
    `<rect x="${w - pad - 30}" y="${pad}" width="30" height="30" rx="9" fill="${c.green}"/>${leaf(w - pad - 30, pad, 30, '#FFFFFF', c.green)}`;
  const inner = w - pad * 2;
  s.pockets.slice(0, rows).forEach((p, i) => {
    const y = pad + headerH + i * rowH;
    const over = p.status === 'over';
    const chip = 24;
    body +=
      glassChip(pad, y, chip, 7, t, p.fg) +
      icon(p.icon, pad + 5, y + 5, 14, iconColor(p.fg, t)) +
      `<text x="${pad + chip + 10}" y="${y + 11}" ${FONT} font-size="12" font-weight="600" fill="${c.ink}">${esc(truncate(p.name, inner * 0.5, 12))}</text>` +
      `<text x="${w - pad}" y="${y + 11}" ${FONT} font-size="12" font-weight="700" fill="${over ? c.red : c.ink}" text-anchor="end">${esc(p.amount)}<tspan font-weight="400" fill="${c.muted}" font-size="11">&#160;${over ? 'over' : 'left'}</tspan></text>` +
      bar(pad + chip + 10, y + 18, inner - chip - 10, 5, p.used, over ? c.red : p.fg, c.track);
  });
  return frame(w, h, body, g.defs);
}

/** "Rs. 2,500 ahead of pace" → "Rs. 2,500 ahead" when space is tight, rather than cutting mid-word. */
function fitPace(pace: string, maxWidth: number, size: number): string {
  return textWidth(pace, size, false) <= maxWidth ? pace : pace.replace(/ of pace$/, '');
}

function truncate(s: string, maxWidth: number, size: number): string {
  if (textWidth(s, size, false) <= maxWidth) return s;
  let out = s;
  while (out.length > 1 && textWidth(out + '…', size, false) > maxWidth) out = out.slice(0, -1);
  return out.trimEnd() + '…';
}
