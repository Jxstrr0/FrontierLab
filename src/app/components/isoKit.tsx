// Isometric drawing kit for the engraved interiors (HQ floors, branch inside;
// ART_DIRECTION §3). A grid cell (i across the back wall, j along the left
// wall) projects 2:1; heights are in cells too. IsoBox draws a solid block with
// a paper top and hatched sides; Decal maps flat local drawing (x along the
// wall, y down, in screen units) onto the back or left wall plane.
import type { ComponentChildren } from 'preact';
import { shade, type HatchDensity } from '../../art/engrave';

export type Pt = [number, number];

/** Projection: `step` screen units per cell, origin at (ox, oy). */
export interface Iso {
  step: number;
  ox: number;
  oy: number;
}

/** Cell (i, j) at height z (cells) to screen coordinates. */
export function isoPt(g: Iso, i: number, j: number, z = 0): Pt {
  return [g.ox + (i - j) * g.step, g.oy + ((i + j) * g.step) / 2 - z * g.step];
}

export const pathOf = (pts: readonly Pt[], close = true) =>
  `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}${close ? 'Z' : ''}`;

/** The four floor corners of a footprint, back corner first, clockwise on screen. */
export function footprint(g: Iso, i: number, j: number, w: number, d: number, z = 0): Pt[] {
  return [
    isoPt(g, i, j, z),
    isoPt(g, i + w, j, z),
    isoPt(g, i + w, j + d, z),
    isoPt(g, i, j + d, z),
  ];
}

/**
 * A block w (along i) × d (along j) × h, standing at height z. The right face
 * catches the window light (light hatching), the left face sits in shade.
 */
export function IsoBox(p: {
  g: Iso;
  i: number;
  j: number;
  w: number;
  d: number;
  h: number;
  z?: number;
  left?: HatchDensity | 'none';
  right?: HatchDensity | 'none';
  /** 'tint' washes the top (glass, cloth); 'solid' inks it. */
  top?: 'paper' | 'tint' | 'solid';
  cls?: string;
  fine?: boolean;
}) {
  const { g, i, j, w, d, h } = p;
  const z = p.z ?? 0;
  const t = footprint(g, i, j, w, d, z + h);
  const [, t1, t2, t3] = t as [Pt, Pt, Pt, Pt];
  const right = [isoPt(g, i + w, j, z), isoPt(g, i + w, j + d, z), t2, t1];
  const left = [isoPt(g, i, j + d, z), isoPt(g, i + w, j + d, z), t2, t3];
  const line = p.fine ? 'art-line art-fine' : 'art-line';
  const l = p.left ?? 'medium';
  const r = p.right ?? 'none';
  return (
    <g class={p.cls}>
      <path d={pathOf(left)} class="art-paper" />
      {l !== 'none' && <path d={shade(left, l, 90)} class="art-hatch" />}
      <path d={pathOf(right)} class="art-paper" />
      {r !== 'none' && <path d={shade(right, r, 90)} class="art-hatch" />}
      <path d={pathOf(t)} class={p.top === 'solid' ? 'art-solid' : 'art-paper'} />
      {p.top === 'tint' && <path d={pathOf(t)} class="art-tint" />}
      <path d={`${pathOf(left)}${pathOf(right)}${pathOf(t)}`} class={line} />
    </g>
  );
}

/**
 * Flat drawing on a wall. `wall` 'back' runs along i (the j = j0 plane), 'left'
 * along j (the i = i0 plane); (x, y) local units are screen units from the
 * wall's corner `at` (floor level), x along the wall and y down (so up is −y).
 */
export function Decal(p: { g: Iso; wall: 'back' | 'left'; at: Pt; children: ComponentChildren }) {
  const [ex, ey] = p.at;
  const m = p.wall === 'back' ? `matrix(1 0.5 0 1 ${ex} ${ey})` : `matrix(-1 0.5 0 1 ${ex} ${ey})`;
  return <g transform={m}>{p.children}</g>;
}

/** Small stable pseudo-random in [0, 1) from integers, for prop and hair variety. */
export function jitter(a: number, b = 0): number {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** SVG transform placing a 15-unit-cell drawing at cell (i, j, z), scaled to the step. */
export function placeAt(g: Iso, i: number, j: number, z = 0): string {
  const [x, y] = isoPt(g, i, j, z);
  return `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(g.step / 15).toFixed(3)})`;
}

/** A vertical pane between two floor points, `h` cells tall: glass (tinted) or solid. */
export function Pane(p: {
  g: Iso;
  a: [number, number];
  b: [number, number];
  h: number;
  z?: number;
  glass?: boolean;
}) {
  const { g } = p;
  const z = p.z ?? 0;
  const pts = [
    isoPt(g, p.a[0], p.a[1], z),
    isoPt(g, p.b[0], p.b[1], z),
    isoPt(g, p.b[0], p.b[1], z + p.h),
    isoPt(g, p.a[0], p.a[1], z + p.h),
  ];
  const d = pathOf(pts);
  const [p0, p1, , p3] = pts as [Pt, Pt, Pt, Pt];
  const glare = `M${(p0[0] * 0.8 + p1[0] * 0.2).toFixed(1)} ${(p0[1] * 0.8 + p1[1] * 0.2 - (p0[1] - p3[1]) * 0.25).toFixed(1)}l${((p1[0] - p0[0]) * 0.18).toFixed(1)} ${((p1[1] - p0[1]) * 0.18 - (p0[1] - p3[1]) * 0.45).toFixed(1)}`;
  return (
    <g>
      {!p.glass && <path d={d} class="art-paper" />}
      {p.glass && <path d={d} class="art-tint" />}
      {p.glass && <path d={glare} class="art-line art-fine art-faint" />}
      <path d={d} class="art-line art-fine" />
    </g>
  );
}
