// Portrait trim (ART_DIRECTION §4): the ears behind the head and the glasses
// over the face, in head space on the 100 × 125 plate. Returns SVG markup for
// src/art/portraits.ts; `fine` is false on the coarse plate at tiny sizes.
import { hatch, type Pt } from './engrave';
import type { FaceGeom } from './portraitFace';
import type { HeadGeom } from './portraitParts';

const path = (d: string, cls: string, extra = '') =>
  d ? `<path d="${d}" class="${cls}"${extra}/>` : '';
const f1 = (n: number) => Math.round(n * 10) / 10;

/** Ears behind the head: skin, an inner helix curve and a shadow on the right ear. */
export function ears(h: HeadGeom, skin: string, sp: number, fine: boolean): string {
  const out: string[] = [];
  for (const side of [-1, 1]) {
    const x = h.cx + side * (h.rx - 0.5);
    const y = h.cy + 2;
    const ear = `M${f1(x)} ${f1(y - 5)}a3 5 0 1 ${side > 0 ? 1 : 0} 0 10a3 5 0 1 ${side > 0 ? 1 : 0} 0 -10Z`;
    out.push(path(ear, 'pt-skin', ` style="fill:${skin}"`));
    if (side > 0) {
      const shade: Pt[] = [
        [x + 0.5, y - 3.5],
        [x + 3, y - 1],
        [x + 2.6, y + 3.5],
        [x + 0.5, y + 4.5],
      ];
      out.push(path(hatch(shade, sp * 0.9, 45), 'pt-hatch'));
    }
    out.push(path(ear, 'pt-line pt-fine'));
    if (fine) {
      out.push(
        path(
          `M${f1(x + side * 0.6)} ${f1(y - 2.6)}Q${f1(x + side * 2.4)} ${f1(y - 0.2)} ${f1(x + side * 0.9)} ${f1(y + 2.2)}`,
          'pt-soft',
        ),
      );
    }
  }
  return out.join('');
}

/** Glasses: none, round, square or half-rim, with nose pads and a lens glint. */
export function glasses(kind: number, h: HeadGeom, g: FaceGeom, fine: boolean): string {
  if (kind === 0) return '';
  const { ey, ex } = g;
  const lens = [-1, 1]
    .map((s) => {
      const x = h.cx + s * ex;
      if (kind === 1) return `M${f1(x + 4.3)} ${f1(ey)}a4.3 4.3 0 1 0 -8.6 0a4.3 4.3 0 1 0 8.6 0Z`;
      if (kind === 2) return `M${f1(x - 4.6)} ${f1(ey - 3.2)}h9.2v6.6h-9.2Z`;
      return `M${f1(x - 4.6)} ${f1(ey - 1.4)}q0 -1.8 1.6 -1.8h6q1.6 0 1.6 1.8`;
    })
    .join('');
  const bridge = `M${f1(h.cx - ex + 4.3)} ${f1(ey - 0.8)}Q${f1(h.cx)} ${f1(ey - 2.4)} ${f1(h.cx + ex - 4.3)} ${f1(ey - 0.8)}`;
  const temples = `M${f1(h.cx - ex - 4.4)} ${f1(ey - 0.8)}L${f1(h.cx - h.rx + 0.5)} ${f1(ey - 1.4)}M${f1(h.cx + ex + 4.4)} ${f1(ey - 0.8)}L${f1(h.cx + h.rx - 0.5)} ${f1(ey - 1.4)}`;
  let out = path(lens + bridge + temples, 'pt-line pt-glass');
  if (kind === 3) {
    // The lower edge of a half-rim lens is a bare wire.
    const wire = [-1, 1]
      .map((s) => {
        const x = h.cx + s * ex;
        return `M${f1(x - 4.6)} ${f1(ey - 1.4)}q0 4.6 4.6 4.6q4.6 0 4.6 -4.6`;
      })
      .join('');
    out += path(wire, 'pt-soft');
  }
  if (fine) {
    const pads = `M${f1(h.cx - ex + 3.6)} ${f1(ey + 0.6)}l-0.6 1.1M${f1(h.cx + ex - 3.6)} ${f1(ey + 0.6)}l0.6 1.1`;
    const glint = [-1, 1]
      .map((s) => {
        const x = h.cx + s * ex;
        return `M${f1(x - 2.8)} ${f1(ey - 1.4)}l1.3 -1.3M${f1(x - 2)} ${f1(ey - 0.4)}l0.7 -0.7`;
      })
      .join('');
    out += path(pads, 'pt-line pt-fine') + path(glint, 'pt-soft');
  }
  return out;
}
