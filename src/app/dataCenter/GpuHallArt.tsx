// GPU hall interior vignette (ART_DIRECTION §3, stage C8c): an engraved
// isometric cut-away of the hall you built, in the same room as the HQ floors.
// Rows of racks on a raised tile floor with ladder cable trays overhead; the
// racks the power feed can run blink, the rest stand dark, so a power shortfall
// shows at a glance. Cooling dresses the room (air handlers on the back wall,
// coolant pipes dropping to every rack, or immersion tanks in place of the
// racks), the power feed sets the switchgear on the left wall, and a
// technician walks the front aisle. In fit-out the racks are dashed outlines
// beside a ladder and boxes.
import { memo } from 'preact/compat';
import { Ladder } from '../branch/interiorParts';
import { IsoBox, isoPt, pathOf, type Iso } from '../components/isoKit';
import { Standing } from '../components/isoPeople';
import { IsoRoom, type RoomSpec } from '../components/isoRoom';
import { Vignette } from '../components/Vignette';
import '../components/interior.css';

/** Picture box inside the vignette (as the HQ floor). */
const G = { cx: 160, top: 4, bottom: 142, width: 300, maxStep: 15, wall: 2.4 } as const;
/** Rows and racks per row by GPU hall (CONTENT §7.4 ids). */
const LAYOUT: Record<string, { rows: number; racks: number }> = {
  hall_row: { rows: 2, racks: 6 },
  hall_twin: { rows: 3, racks: 7 },
  hall_campus: { rows: 3, racks: 9 },
};
/** Switchgear cabinets on the left wall by power feed. */
const SWITCHGEAR: Record<string, number> = { power_grid: 1, power_substation: 2, power_tie: 3 };
/** Rack size and spacing, in cells. */
const RACK = { w: 0.5, d: 0.55, h: 1.35, i0: 1.2, rowGap: 1.45, j0: 1.0 } as const;
const TRAY_Z = 1.85;

export const GpuHallArt = memo(function GpuHallArt(p: {
  hall: string;
  power: string;
  cooling: string;
  /** GPUs the hall holds and how many the power feed can run. */
  gpus: number;
  running: number;
  fitout?: boolean;
  ink?: string;
}) {
  const lay = LAYOUT[p.hall] ?? LAYOUT.hall_row!;
  const tanks = p.cooling === 'cool_immersion';
  const w = RACK.i0 + lay.racks * RACK.w + 1.6;
  const d = RACK.j0 + lay.rows * RACK.rowGap + 0.9;
  const span = w + d;
  const avail = G.bottom - G.top;
  const step = Math.min(G.maxStep, G.width / span, avail / (G.wall + span / 2));
  const height = step * (G.wall + span / 2);
  const g: Iso = {
    step,
    ox: G.cx - ((w - d) * step) / 2,
    oy: G.top + (avail - height) / 2 + G.wall * step,
  };
  const room: RoomSpec = {
    g,
    w,
    d,
    h: G.wall,
    floor: 'tiles',
    backWindows: [],
    leftWindows: [],
    windowW: 1,
  };
  const total = lay.rows * lay.racks;
  const lit = p.fitout ? 0 : Math.round(total * Math.min(1, p.running / Math.max(1, p.gpus)));
  const caption = p.fitout
    ? 'Fit-out under way'
    : `${p.running.toLocaleString('en')} of ${p.gpus.toLocaleString('en')} GPUs running`;

  const rows = Array.from({ length: lay.rows }, (_, r) => {
    const j = RACK.j0 + r * RACK.rowGap;
    return (
      <g>
        {Array.from({ length: lay.racks }, (_, k) => {
          const n = r * lay.racks + k;
          const i = RACK.i0 + k * RACK.w;
          return tanks ? (
            <Tank g={g} i={i} j={j} on={n < lit} ghost={!!p.fitout} />
          ) : (
            <RackUnit g={g} i={i} j={j} on={n < lit} ghost={!!p.fitout} seed={n} />
          );
        })}
        {!p.fitout && <Tray g={g} i0={RACK.i0} i1={RACK.i0 + lay.racks * RACK.w} j={j + 0.1} />}
        {!p.fitout && p.cooling === 'cool_liquid' && (
          <Hoses g={g} i0={RACK.i0} racks={lay.racks} j={j} />
        )}
      </g>
    );
  });

  return (
    <Vignette label={`Inside the GPU hall: ${caption}`} bare ink={p.ink} class="in-alive">
      <IsoRoom
        r={room}
        back={
          !tanks && p.cooling !== 'cool_liquid' ? <AirGrilles g={g} w={w} /> : <Pipes g={g} w={w} />
        }
        left={<Switchgear g={g} n={SWITCHGEAR[p.power] ?? 1} />}
      />
      {p.cooling === 'cool_air' &&
        [w - 1.25].map((i) => (
          <IsoBox g={g} i={i} j={0.08} w={0.9} d={0.5} h={1.6} left="light" right="medium" fine />
        ))}
      {rows[0]}
      {/* The front aisle runs between the first two rows, so the walker sits between them. */}
      {!p.fitout && (
        <Technician g={g} from={RACK.i0 - 0.4} to={w - 1.2} j={RACK.j0 + RACK.d + 0.45} />
      )}
      {rows.slice(1)}
      {p.fitout && <Ladder g={g} i={w - 1.2} j={d - 1.1} />}
      <text x="12" y="150" class="in-caption">
        {caption}
      </text>
    </Vignette>
  );
});

/** One rack: a tall dark cabinet; powered ones blink, idle ones stand dark, fit-out ones are dashed. */
function RackUnit(p: { g: Iso; i: number; j: number; on: boolean; ghost: boolean; seed: number }) {
  const { g } = p;
  if (p.ghost) {
    return (
      <IsoBox
        g={g}
        i={p.i}
        j={p.j}
        w={RACK.w}
        d={RACK.d}
        h={RACK.h}
        left="none"
        cls="in-empty"
        fine
      />
    );
  }
  const k = g.step / 15;
  const slots: string[] = [];
  for (let z = 0.25; z < RACK.h - 0.1; z += 0.22) {
    const a = isoPt(g, p.i + 0.07, p.j + RACK.d, z);
    const b = isoPt(g, p.i + RACK.w - 0.07, p.j + RACK.d, z);
    slots.push(`M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`);
  }
  return (
    <g>
      <IsoBox
        g={g}
        i={p.i}
        j={p.j}
        w={RACK.w}
        d={RACK.d}
        h={RACK.h}
        left={p.on ? 'medium' : 'dense'}
        right="dense"
        fine
      />
      <path d={slots.join('')} class="art-line art-fine art-faint" />
      {p.on &&
        [0.35, 0.7, 1.05].map((z, n) => {
          const [x, y] = isoPt(g, p.i + 0.12 + (n % 2) * 0.22, p.j + RACK.d, z);
          return (
            <circle
              cx={x.toFixed(1)}
              cy={y.toFixed(1)}
              r={(0.75 * k).toFixed(2)}
              class="in-led"
              style={{ animationDelay: `${((p.seed * 0.37 + n * 0.53) % 1.3).toFixed(2)}s` }}
            />
          );
        })}
    </g>
  );
}

/** An immersion tank: a low bath of coolant with its lid seams. */
function Tank(p: { g: Iso; i: number; j: number; on: boolean; ghost: boolean }) {
  const { g } = p;
  const h = 0.75;
  if (p.ghost) {
    return (
      <IsoBox g={g} i={p.i} j={p.j} w={RACK.w} d={RACK.d} h={h} left="none" cls="in-empty" fine />
    );
  }
  const [x, y] = isoPt(g, p.i + RACK.w * 0.5, p.j + RACK.d, 0.45);
  return (
    <g>
      <IsoBox
        g={g}
        i={p.i}
        j={p.j}
        w={RACK.w}
        d={RACK.d}
        h={h}
        left="light"
        right="medium"
        top="tint"
        fine
      />
      {p.on && (
        <circle
          cx={x.toFixed(1)}
          cy={y.toFixed(1)}
          r={((0.75 * g.step) / 15).toFixed(2)}
          class="in-led"
        />
      )}
    </g>
  );
}

/** A ladder cable tray hung over a row: two rails with rungs. */
function Tray(p: { g: Iso; i0: number; i1: number; j: number }) {
  const { g } = p;
  const rail = (j: number) => pathOf([isoPt(g, p.i0, j, TRAY_Z), isoPt(g, p.i1, j, TRAY_Z)], false);
  const rungs: string[] = [];
  for (let i = p.i0 + 0.15; i < p.i1; i += 0.3)
    rungs.push(pathOf([isoPt(g, i, p.j, TRAY_Z), isoPt(g, i, p.j + 0.35, TRAY_Z)], false));
  const hangers = [p.i0 + 0.2, p.i1 - 0.2]
    .map((i) => pathOf([isoPt(g, i, p.j + 0.17, TRAY_Z), isoPt(g, i, p.j + 0.17, G.wall)], false))
    .join('');
  return (
    <g>
      <path d={`${rail(p.j)}${rail(p.j + 0.35)}`} class="art-line art-fine" />
      <path d={`${rungs.join('')}${hangers}`} class="art-line art-fine art-faint" />
    </g>
  );
}

/** Coolant hoses dropping from the tray to every rack (liquid loops). */
function Hoses(p: { g: Iso; i0: number; racks: number; j: number }) {
  const { g } = p;
  const d = Array.from({ length: p.racks }, (_, k) => {
    const i = p.i0 + k * RACK.w + RACK.w * 0.5;
    return pathOf([isoPt(g, i, p.j + 0.27, TRAY_Z), isoPt(g, i, p.j + 0.27, RACK.h)], false);
  }).join('');
  return <path d={d} class="art-line art-fine" style={{ stroke: 'var(--wash-glass)' }} />;
}

/** Air-handler return grilles high on the back wall (decal units). */
function AirGrilles(p: { g: Iso; w: number }) {
  const s = p.g.step;
  const out: string[] = [];
  for (let x = 1.2; x < p.w - 1.6; x += 1.6) {
    const x0 = x * s;
    const y0 = -2.1 * s;
    out.push(
      `M${x0.toFixed(1)} ${y0.toFixed(1)}h${(1.1 * s).toFixed(1)}v${(0.4 * s).toFixed(1)}h${(-1.1 * s).toFixed(1)}z`,
    );
    for (let k = 1; k < 4; k++)
      out.push(`M${x0.toFixed(1)} ${(y0 + k * 0.1 * s).toFixed(1)}h${(1.1 * s).toFixed(1)}`);
  }
  return <path d={out.join('')} class="art-line art-fine" />;
}

/** Coolant mains along the back wall with flanged joints (liquid and immersion). */
function Pipes(p: { g: Iso; w: number }) {
  const s = p.g.step;
  const len = (p.w - 0.4) * s;
  const flanges: string[] = [];
  for (let x = 1.4 * s; x < len; x += 1.8 * s)
    flanges.push(`M${x.toFixed(1)} ${(-2.12 * s).toFixed(1)}v${(0.36 * s).toFixed(1)}`);
  return (
    <g>
      <path
        d={`M${0.2 * s} ${-2.05 * s}h${len}M${0.2 * s} ${-1.83 * s}h${len}`}
        class="art-line"
        style={{ stroke: 'var(--wash-glass)' }}
      />
      <path d={flanges.join('')} class="art-line art-fine" />
    </g>
  );
}

/** Switchgear cabinets on the left wall, each with a bolt plate (decal units). */
function Switchgear(p: { g: Iso; n: number }) {
  const s = p.g.step;
  return (
    <g>
      {Array.from({ length: p.n }, (_, k) => {
        const x = (0.4 + k * 0.85) * s;
        const box = `M${x.toFixed(1)} 0V${(-1.5 * s).toFixed(1)}h${(0.7 * s).toFixed(1)}V0z`;
        const bx = x + 0.35 * s;
        const by = -1.15 * s;
        const u = s / 15;
        return (
          <g>
            <path d={box} class="art-paper" />
            <path d={box} class="art-tint" />
            <path
              d={`${box}M${bx.toFixed(1)} 0V${(-1.5 * s).toFixed(1)}`}
              class="art-line art-fine"
            />
            <path
              d={`M${(bx + 1.2 * u).toFixed(1)} ${(by - 3 * u).toFixed(1)}l${(-2.4 * u).toFixed(1)} ${(3.2 * u).toFixed(1)}h${(2.2 * u).toFixed(1)}l${(-2 * u).toFixed(1)} ${(3 * u).toFixed(1)}`}
              class="art-line art-fine"
              style={{ stroke: 'var(--brass)' }}
            />
          </g>
        );
      })}
    </g>
  );
}

/** A technician with a tablet walking the front aisle and back. */
function Technician(p: { g: Iso; from: number; to: number; j: number }) {
  const { g } = p;
  const [x, y] = isoPt(g, p.from, p.j);
  const cells = p.to - p.from;
  const style = {
    '--dx': `${(cells * 15).toFixed(1)}px`,
    '--dy': `${(cells * 7.5).toFixed(1)}px`,
    '--walk-s': `${(cells * 2.4).toFixed(1)}s`,
  };
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(g.step / 15).toFixed(3)})`}>
      <g class="in-walk" style={style}>
        <g class="in-step">
          <Standing mood="good" hair={7} carry="folder" />
        </g>
      </g>
    </g>
  );
}
