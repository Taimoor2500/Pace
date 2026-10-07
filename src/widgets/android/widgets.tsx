import { FlexWidget, SvgWidget, type WidgetRepresentation } from 'react-native-android-widget';
import type { WidgetSnapshot } from '../snapshot';
import { pickPocket } from '../snapshot';
import { messageSvg, pocketSvg, pocketsSvg, safeSvg, type Theme } from '../svg';

type Size = { width: number; height: number };

/** One full-bleed SVG per widget, tappable as a whole. */
function Canvas({ svg, uri }: { svg: string; uri: string }) {
  return (
    <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri }} style={{ height: 'match_parent', width: 'match_parent' }}>
      <SvgWidget svg={svg} style={{ height: 'match_parent', width: 'match_parent' }} />
    </FlexWidget>
  );
}

const themed = (render: (t: Theme) => React.JSX.Element): WidgetRepresentation => ({ light: render('light'), dark: render('dark') });

/** Small widget: one pocket, or "safe" for Safe to spend today. */
export function pocketWidget(snapshot: WidgetSnapshot, pocketId: string | undefined, { width, height }: Size): WidgetRepresentation {
  const w = Math.round(width) || 170;
  const h = Math.round(height) || 170;
  if (!snapshot.signedIn || !snapshot.pockets.length) {
    const msg = snapshot.signedIn ? 'Finish setup to see your pockets' : 'Sign in to see your pockets';
    return themed((t) => <Canvas svg={messageSvg(w, h, msg, t)} uri="pace://" />);
  }
  if (pocketId === 'safe') return themed((t) => <Canvas svg={safeSvg(snapshot, w, h, t)} uri="pace://" />);
  const p = pickPocket(snapshot, pocketId)!;
  return themed((t) => <Canvas svg={pocketSvg(p, snapshot.month, w, h, t)} uri={p.url} />);
}

/** Wide widget: safe to spend + as many pockets as fit. */
export function pocketsWidget(snapshot: WidgetSnapshot, { width, height }: Size): WidgetRepresentation {
  const w = Math.round(width) || 350;
  const h = Math.round(height) || 190;
  if (!snapshot.signedIn || !snapshot.pockets.length) {
    const msg = snapshot.signedIn ? 'Finish setup to see your pockets' : 'Sign in to see your pockets';
    return themed((t) => <Canvas svg={messageSvg(w, h, msg, t)} uri="pace://" />);
  }
  return themed((t) => <Canvas svg={pocketsSvg(snapshot, w, h, t)} uri="pace://plan" />);
}
