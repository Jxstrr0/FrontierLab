// Shared pieces for the branch exteriors (ART_DIRECTION §3): the bank's seal
// in its brand ink, glazed panes and round-topped arches, plus the Facade
// shape each composition in facadesLow.tsx / facadesGrand.tsx fills in
// (with the anchors the house style dresses, houseStyleArt.tsx).
import type { JSX } from 'preact';
import { poly, type Pt } from '../../art/engrave';
import { logoPath, logoTextShift } from '../../art/logoShapes';
import type { LogoShape } from '../../data/types';
import type { FacadeAnchors } from './houseStyleArt';

export interface Brand {
  ink: string;
  monogram: string;
  shape: LogoShape;
}

export interface Facade {
  draw: (b: Brand) => JSX.Element;
  /** Where the house style's sign, lamps and planters go. */
  anchors: FacadeAnchors;
  /** Where the roof flag's pole stands. */
  flag: Pt;
  /** Outer bounds of the building, for the fit-out scaffolding. */
  box: [number, number, number, number];
}

/** The bank's seal in its brand ink and logo shape, with the monogram. */
export function Seal(p: { x: number; y: number; r: number; brand: Brand }) {
  const { shape } = p.brand;
  return (
    <g>
      <path d={logoPath(shape, p.x, p.y, p.r)} style={{ fill: p.brand.ink }} class="art-brand" />
      <path
        d={logoPath(shape, p.x, p.y, p.r - 1.6)}
        class="art-line art-fine"
        style={{ stroke: 'var(--ivory)' }}
      />
      <text
        x={p.x}
        y={p.y + p.r * 0.32 + logoTextShift(shape, p.r)}
        text-anchor="middle"
        class="art-brand-text"
        style={{ fontSize: `${p.r * 0.85}px` }}
      >
        {p.brand.monogram}
      </text>
    </g>
  );
}

/** Material colours for the fronts (tokens.css --wash-*; ART_DIRECTION §3). */
export const WASH = {
  brick: 'var(--wash-brick)',
  stone: 'var(--wash-stone)',
  slate: 'var(--wash-slate)',
  copper: 'var(--wash-copper)',
} as const;

/** A window pane: paper, a cool wash of glass with the ink's tint, and the outline. */
export function Glass(p: { pts: readonly Pt[]; fine?: boolean }) {
  const d = poly(p.pts);
  return (
    <g>
      <path d={d} class="art-paper" />
      <path d={d} class="art-glass" />
      <path d={d} class="art-tint" />
      <path d={d} class={p.fine ? 'art-line art-fine' : 'art-line'} />
    </g>
  );
}

/** Round-topped arch (bottom-left x, bottom y, width, height) as a polygon. */
export function arch(x: number, y: number, w: number, h: number): Pt[] {
  const r = w / 2;
  const pts: Pt[] = [[x, y]];
  for (let k = 0; k <= 12; k++) {
    const t = Math.PI - (k / 12) * Math.PI;
    pts.push([x + r + r * Math.cos(t), y - h + r - r * Math.sin(t)]);
  }
  pts.push([x + w, y]);
  return pts;
}
