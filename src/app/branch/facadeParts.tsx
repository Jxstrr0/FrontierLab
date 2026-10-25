// Shared pieces for the branch exteriors (ART_DIRECTION §3): the bank's seal
// in its brand ink, glazed panes and round-topped arches, plus the Facade
// shape each composition in facadesLow.tsx / facadesGrand.tsx fills in.
import type { JSX } from 'preact';
import { poly, type Pt } from '../../art/engrave';

export interface Brand {
  ink: string;
  monogram: string;
}

export interface Facade {
  draw: (b: Brand) => JSX.Element;
  /** Where the roof flag's pole stands. */
  flag: Pt;
  /** Outer bounds of the building, for the fit-out scaffolding. */
  box: [number, number, number, number];
}

/** The bank's round seal in its brand ink with the monogram. */
export function Seal(p: { x: number; y: number; r: number; brand: Brand }) {
  return (
    <g>
      <circle cx={p.x} cy={p.y} r={p.r} style={{ fill: p.brand.ink }} class="art-brand" />
      <circle
        cx={p.x}
        cy={p.y}
        r={p.r - 1.6}
        class="art-line art-fine"
        style={{ stroke: 'var(--ivory)' }}
      />
      <text
        x={p.x}
        y={p.y + p.r * 0.32}
        text-anchor="middle"
        class="art-brand-text"
        style={{ fontSize: `${p.r * 0.85}px` }}
      >
        {p.brand.monogram}
      </text>
    </g>
  );
}

/** A window pane: paper, a wash of glass and the outline. */
export function Glass(p: { pts: readonly Pt[]; fine?: boolean }) {
  const d = poly(p.pts);
  return (
    <g>
      <path d={d} class="art-paper" />
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
