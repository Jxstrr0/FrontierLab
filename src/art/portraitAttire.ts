// Portrait attire (ART_DIRECTION §4): suit, blouse, sweater and turtleneck,
// hatched over the shoulders of the 100 × 125 portrait plate, plus the
// neckline drawn over the neck. Returns SVG markup for src/art/portraits.ts.
import { hatch, poly, type Pt } from './engrave';
import { BODY, type HeadGeom } from './portraitParts';

const path = (d: string, cls: string) => (d ? `<path d="${d}" class="${cls}"/>` : '');
const fill = (pts: readonly Pt[], cls: string) => path(poly(pts), cls);

export function attire(kind: number, h: HeadGeom, sp: number): string {
  const body = BODY;
  const neckTop = h.cy + h.ry - 6;
  const parts: string[] = [];
  if (kind === 3) {
    // Turtleneck: dark knit body and a folded collar up to the chin.
    parts.push(fill(body, 'pt-cloth'), path(hatch(body, sp * 0.9, 90), 'pt-hatch'));
    const tube: Pt[] = [
      [h.cx - 9, neckTop + 2],
      [h.cx + 9, neckTop + 2],
      [h.cx + 10.5, 96],
      [h.cx - 10.5, 96],
    ];
    parts.push(fill(tube, 'pt-cloth'), path(hatch(tube, sp * 1.1, 0), 'pt-hatch'));
    parts.push(fill(tube, 'pt-line'));
    parts.push(fill(body, 'pt-line'));
    return parts.join('');
  }
  parts.push(fill(body, 'pt-cloth'));
  if (kind === 0) {
    // Suit: dense jacket, lapels, white shirt and a tie.
    parts.push(path(hatch(body, sp * 0.85, 62), 'pt-hatch'));
    const shirt: Pt[] = [
      [41, 90.5],
      [59, 90.5],
      [50, 114],
    ];
    parts.push(fill(shirt, 'pt-paper'), fill(shirt, 'pt-line pt-fine'));
    const tie: Pt[] = [
      [48.4, 95],
      [51.6, 95],
      [53, 110],
      [50, 114],
      [47, 110],
    ];
    parts.push(fill(tie, 'pt-cloth'), path(hatch(tie, sp * 0.7, -45), 'pt-hatch'));
    parts.push(fill(tie, 'pt-line pt-fine'));
    parts.push(path('M41 90.5L37 106L50 118M59 90.5L63 106L50 118', 'pt-line pt-fine'));
    parts.push(path('M44 91l4.4 4M56 91l-4.4 4', 'pt-line pt-fine'));
  } else if (kind === 1) {
    // Blouse: light fabric, a scooped neckline and a soft collar.
    parts.push(path(hatch(body, sp * 1.7, 70), 'pt-hatch'));
    parts.push(path('M30 125c2-12 4-20 7-28M70 125c-2-12-4-20-7-28', 'pt-line pt-fine'));
  } else {
    // Sweater: ribbed knit and a crew-neck band.
    parts.push(path(hatch(body, sp * 1.15, 90), 'pt-hatch'));
    parts.push(path('M4 119h92M5 122h90', 'pt-line pt-fine'));
  }
  parts.push(fill(body, 'pt-line'));
  return parts.join('');
}

/** The neckline sits over the neck for the blouse and sweater. */
export function neckline(kind: number): string {
  if (kind === 1) {
    return (
      path('M41 91c2 8 16 8 18 0', 'pt-line') +
      path('M41 91c-4 3-5 6-3 8l7-3M59 91c4 3 5 6 3 8l-7-3', 'pt-line pt-fine')
    );
  }
  if (kind === 2) return path('M41 90.5c3 6 15 6 18 0M39.5 92c4 8 17 8 21 0', 'pt-line pt-fine');
  return '';
}
