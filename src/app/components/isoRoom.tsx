// The engraved cut-away room both interiors stand in (ART_DIRECTION §3): a
// floor (planks, tiles, carpet or a marble checker), two walls with skirting
// and cornice, their cut tops inked solid like an architect's section, windows
// with mullions, and pale pools of daylight falling across the floor from
// them. The room's footprint is i ∈ [0, w], j ∈ [0, d]; walls rise `h` cells.
import type { ComponentChildren } from 'preact';
import { shade } from '../../art/engrave';
import { Decal, footprint, isoPt, pathOf, type Iso, type Pt } from './isoKit';

export type FloorFinish = 'planks' | 'tiles' | 'carpet' | 'marble';

export interface RoomSpec {
  g: Iso;
  w: number;
  d: number;
  h: number;
  floor: FloorFinish;
  /** Window centres (cells along the wall) and their width. */
  backWindows: number[];
  leftWindows: number[];
  windowW: number;
}

const WALL_T = 0.2;

function floorPattern(r: RoomSpec): ComponentChildren {
  const { g, w, d } = r;
  const seg = (a: Pt, b: Pt) =>
    `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
  const lines: string[] = [];
  if (r.floor === 'planks') {
    for (let j = 0.5; j < d; j += 0.5) lines.push(seg(isoPt(g, 0, j), isoPt(g, w, j)));
    // Staggered butt joints between the boards.
    for (let k = 0; k < d / 0.5; k++) {
      for (let i = (k % 2) * 0.9 + 0.6; i < w; i += 1.8)
        lines.push(seg(isoPt(g, i, k * 0.5), isoPt(g, i, k * 0.5 + 0.5)));
    }
    return <path d={lines.join('')} class="art-line art-fine art-faint" />;
  }
  for (let j = 1; j < d; j++) lines.push(seg(isoPt(g, 0, j), isoPt(g, w, j)));
  for (let i = 1; i < w; i++) lines.push(seg(isoPt(g, i, 0), isoPt(g, i, d)));
  if (r.floor === 'carpet') {
    const inset = footprint(g, 0.35, 0.35, w - 0.7, d - 0.7);
    return (
      <g>
        <path d={pathOf(footprint(g, 0, 0, w, d))} class="art-tint" />
        <path d={pathOf(inset)} class="art-line art-fine art-faint" />
      </g>
    );
  }
  const checks: string[] = [];
  if (r.floor === 'marble') {
    for (let i = 0; i < w; i++)
      for (let j = 0; j < d; j++)
        if ((i + j) % 2 === 0)
          checks.push(pathOf(footprint(g, i, j, Math.min(1, w - i), Math.min(1, d - j))));
  }
  return (
    <g>
      {checks.length > 0 && <path d={checks.join('')} class="art-tint" />}
      <path d={lines.join('')} class="art-line art-fine art-faint" />
    </g>
  );
}

/** Daylight from each window: a skewed pale pool on the floor in front of it. */
function lightPools(r: RoomSpec): string {
  const { g, windowW: ww } = r;
  const reach = 1.9;
  const drift = 0.7;
  const pools = r.backWindows.map((c) =>
    pathOf([
      isoPt(g, c - ww / 2, 0),
      isoPt(g, c + ww / 2, 0),
      isoPt(g, c + ww / 2 + drift, reach),
      isoPt(g, c - ww / 2 + drift, reach),
    ]),
  );
  for (const c of r.leftWindows)
    pools.push(
      pathOf([
        isoPt(g, 0, c - ww / 2),
        isoPt(g, 0, c + ww / 2),
        isoPt(g, reach, c + ww / 2 + drift),
        isoPt(g, reach, c - ww / 2 + drift),
      ]),
    );
  return pools.join('');
}

/** A window on a wall, in decal units (x along the wall, up is −y). */
function WallWindow(p: { x: number; w: number; sill: number; top: number }) {
  const { x, w, sill, top } = p;
  const box = `M${x} ${-sill}h${w}V${-top}H${x}z`;
  const mid = x + w / 2;
  return (
    <g>
      <path d={box} class="art-paper" />
      <path d={box} class="art-tint" />
      <path
        d={`M${x + 2} ${-sill - 2}l${w * 0.35} ${-(top - sill) * 0.55}`}
        class="art-line art-fine art-faint"
      />
      <path
        d={`${box}M${mid} ${-sill}V${-top}M${x} ${-(sill + top) / 2 - 2}h${w}M${x - 1.5} ${-sill}h${w + 3}`}
        class="art-line art-fine"
      />
    </g>
  );
}

/** The floor, light and walls; children draw on the walls (decals) before the cut caps. */
export function IsoRoom(p: { r: RoomSpec; back?: ComponentChildren; left?: ComponentChildren }) {
  const { g, w, d, h } = p.r;
  const s = g.step;
  const floor = footprint(g, 0, 0, w, d);
  const backWall = [isoPt(g, 0, 0), isoPt(g, w, 0), isoPt(g, w, 0, h), isoPt(g, 0, 0, h)];
  const leftWall = [isoPt(g, 0, 0), isoPt(g, 0, d), isoPt(g, 0, d, h), isoPt(g, 0, 0, h)];
  const t = WALL_T;
  const capBack = [isoPt(g, -t, -t, h), isoPt(g, w, -t, h), isoPt(g, w, 0, h), isoPt(g, 0, 0, h)];
  const capLeft = [isoPt(g, -t, -t, h), isoPt(g, 0, 0, h), isoPt(g, 0, d, h), isoPt(g, -t, d, h)];
  const endBack = [isoPt(g, w, -t), isoPt(g, w, 0), isoPt(g, w, 0, h), isoPt(g, w, -t, h)];
  const endLeft = [isoPt(g, -t, d), isoPt(g, 0, d), isoPt(g, 0, d, h), isoPt(g, -t, d, h)];
  const shadowBack = footprint(g, 0, 0, w, 0.3);
  const shadowLeft = footprint(g, 0, 0, 0.3, d);
  const ww = p.r.windowW * s;
  const sill = h * 0.32 * s;
  const top = h * 0.84 * s;
  const rule = (z: number) =>
    `M${isoPt(g, 0, d, z).join(' ')}L${isoPt(g, 0, 0, z).join(' ')}L${isoPt(g, w, 0, z).join(' ')}`;
  return (
    <g>
      <path d={pathOf(floor)} class="art-paper" />
      {floorPattern(p.r)}
      <path d={lightPools(p.r)} class="in-light" />
      <path d={shade(shadowBack, 'dense', -26.6)} class="art-hatch art-faint" />
      <path d={shade(shadowLeft, 'dense', 26.6)} class="art-hatch art-faint" />
      <path d={pathOf(floor)} class="art-line" />
      <path d={pathOf(backWall)} class="art-paper" />
      <path d={pathOf(leftWall)} class="art-paper" />
      <path d={shade(leftWall, 'light', 90)} class="art-hatch" />
      <Decal g={g} wall="back" at={isoPt(g, 0, 0)}>
        {p.r.backWindows.map((c) => (
          <WallWindow x={c * s - ww / 2} w={ww} sill={sill} top={top} />
        ))}
        {p.back}
      </Decal>
      <Decal g={g} wall="left" at={isoPt(g, 0, 0)}>
        {p.r.leftWindows.map((c) => (
          <WallWindow x={c * s - ww / 2} w={ww} sill={sill} top={top} />
        ))}
        {p.left}
      </Decal>
      <path d={`${rule(0.12)}${rule(h - 0.1)}`} class="art-line art-fine" />
      <path d={`${pathOf(backWall)}${pathOf(leftWall)}`} class="art-line" />
      <path d={pathOf(endBack)} class="art-paper" />
      <path d={shade(endBack, 'dense', 90)} class="art-hatch" />
      <path d={pathOf(endLeft)} class="art-paper" />
      <path d={shade(endLeft, 'dense', 90)} class="art-hatch" />
      <path d={`${pathOf(capBack)}${pathOf(capLeft)}`} class="art-solid" />
      <path d={`${pathOf(endBack)}${pathOf(endLeft)}`} class="art-line art-fine" />
    </g>
  );
}

/** Screen units per cell along a wall, for decal placement (x = cells × step). */
export const wallX = (g: Iso, cells: number) => cells * g.step;
/** Decal y for a height in cells (up is negative). */
export const wallY = (g: Iso, z: number) => -z * g.step;
