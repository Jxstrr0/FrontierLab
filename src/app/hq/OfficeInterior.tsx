// HQ floor hero (ART_DIRECTION §3, "HQ floors"): an engraved isometric
// cut-away office in the city ink on ivory. Desks and people reflect actual
// staffing, so an understaffed floor shows empty desks (dashed, chair pushed
// in) at a glance; people are tinted by the team's mood (jade / brass /
// oxblood). Walls and floor are hatched like the other vignettes.
import { shade } from '../../art/engrave';
import type { DeptId } from '../../sim/state';
import { Vignette } from '../components';
import { useGame } from '../store';
import { deskPicture } from './deptSelectors';

/** Most desks drawn; bigger departments are drawn to scale at this size. */
const MAX_DESKS = 32;
/** Picture geometry (SVG units in a 320 × 160 box): the room fits between `top` and `bottom`. */
const G = { w: 320, h: 160, maxStep: 15, cx: 160, top: 6, bottom: 142, wall: 40 } as const;

type Pt = [number, number];

/** Grid cell (i across, j deep) to picture coordinates, `step` units per cell. */
function at(i: number, j: number, ox: number, oy: number, step: number): Pt {
  return [ox + (i - j) * step, oy + (i + j) * (step / 2)];
}

const path = (pts: Pt[], close = true) =>
  `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}${close ? 'Z' : ''}`;

export function OfficeInterior(p: { dept: DeptId }) {
  const s = useGame();
  const pic = deskPicture(s, p.dept, MAX_DESKS);
  const cols = pic.shown > 24 ? 8 : 6;
  const rows = Math.max(1, Math.ceil(pic.shown / cols));
  // Size the cells so the room (walls included) fits, then centre it.
  const step = Math.min(G.maxStep, ((G.bottom - G.top - G.wall) * 2) / (cols + rows + 2));
  const ox = G.cx - ((cols - rows) * step) / 2;
  const oy = G.top + G.wall + step;
  const c = (i: number, j: number) => at(i, j, ox, oy, step);
  const floor = [c(-1, -1), c(cols, -1), c(cols, rows), c(-1, rows)];
  const up = ([x, y]: Pt): Pt => [x, y - G.wall];
  const back = c(-1, -1);
  const rightBack = c(cols, -1);
  const leftFront = c(-1, rows);

  // Desks back to front; the first `filled` (in reading order) have someone at them.
  const desks: { i: number; j: number; k: number }[] = [];
  for (let k = 0; k < pic.shown; k++) desks.push({ i: k % cols, j: Math.floor(k / cols), k });
  desks.sort((a, b) => a.i + a.j - (b.i + b.j) || a.i - b.i);

  const windows = (from: Pt, to: Pt, n: number) =>
    Array.from({ length: n }, (_, k) => {
      const t0 = (k + 0.25) / n;
      const t1 = (k + 0.75) / n;
      const lerp = (t: number): Pt => [
        from[0] + (to[0] - from[0]) * t,
        from[1] + (to[1] - from[1]) * t,
      ];
      const [a, b] = [lerp(t0), lerp(t1)];
      return path([
        [a[0], a[1] - G.wall * 0.3],
        [b[0], b[1] - G.wall * 0.3],
        [b[0], b[1] - G.wall * 0.82],
        [a[0], a[1] - G.wall * 0.82],
      ]);
    });

  const label =
    pic.desks === 0
      ? 'An empty floor'
      : `Office floor: ${pic.staff} of ${pic.desks} desks filled${pic.desks > pic.shown ? ' (drawn to scale)' : ''}`;

  return (
    <Vignette label={label} bare class="hq-interior">
      {/* Cut-away room: floor and the two back walls with windows. */}
      <path d={path(floor)} class="hq-floor" />
      <path d={shade(floor, 'light', -26.6)} class="art-hatch" />
      <path d={path([back, rightBack, up(rightBack), up(back)])} class="hq-wall" />
      <path d={path([back, leftFront, up(leftFront), up(back)])} class="hq-wall" />
      <path d={shade([back, leftFront, up(leftFront), up(back)], 'medium', 90)} class="art-hatch" />
      {windows(back, rightBack, Math.max(3, cols - 2)).map((d) => (
        <g>
          <path d={d} class="art-paper" />
          <path d={d} class="art-tint" />
          <path d={d} class="art-line" />
        </g>
      ))}
      {windows(back, leftFront, Math.max(2, rows)).map((d) => (
        <g>
          <path d={d} class="art-paper" />
          <path d={d} class="art-tint" />
          <path d={d} class="art-line" />
        </g>
      ))}
      {desks.map(({ i, j, k }) => (
        <Desk at={c(i, j)} taken={k < pic.filled} mood={pic.mood} />
      ))}
      {pic.desks > 0 && (
        <text x="12" y={G.h - 8} class="hq-interior-caption">
          {pic.staff} of {pic.desks} desks filled
        </text>
      )}
    </Vignette>
  );
}

/** One desk (an isometric slab with a screen) and, if taken, someone sitting at it. */
function Desk(p: { at: Pt; taken: boolean; mood: 'good' | 'warn' | 'bad' }) {
  const [x, y] = p.at;
  const lift = 5;
  const top = [
    [x - 7, y - lift],
    [x, y - 3.5 - lift],
    [x + 7, y - lift],
    [x, y + 3.5 - lift],
  ] as Pt[];
  return (
    <g class={p.taken ? 'hq-desk is-taken' : 'hq-desk'}>
      {p.taken ? (
        <g class={`hq-person hq-mood-${p.mood}`}>
          <circle cx={x - 1} cy={y - 17} r="2.6" class="hq-head" />
          <path d={`M${x - 5} ${y - 6}c0-5 1.5-8 4-8s4 3 4 8z`} />
        </g>
      ) : (
        <path d={`M${x - 6} ${y - 6}v-6l3-1.5v6`} class="hq-chair" />
      )}
      <path d={path(top)} class="hq-desk-top" />
      <path
        d={`M${x - 7} ${y - lift}v${lift}M${x + 7} ${y - lift}v${lift}M${x} ${y + 3.5 - lift}v${lift}`}
      />
      <path d={`M${x + 1} ${y - 4 - lift}l4 -2v-5l-4 2z`} class="hq-screen" />
    </g>
  );
}
