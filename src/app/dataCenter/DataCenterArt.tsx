// Data center exterior vignette (ART_DIRECTION §3, stage C8c): a low, wide
// engraved hall with a long parapet roofline, a louvre band, precast panels,
// roller doors, a glazed entrance under a canopy in the brand ink and the
// lab's seal on the wall. Rooftop chillers follow the cooling (fans, dry
// coolers with a pipe run, or a few low immersion units), the hall grows with
// its size, and a fenced substation yard stands beside it on the left. At an energy site
// a lattice pylon carries the lines in and wind turbines turn on the hills; in
// fit-out a crane lowers the last chiller.
import { hatch, rect } from '../../art/engrave';
import { logoPath, logoTextShift } from '../../art/logoShapes';
import { DEFAULT_LOGO_SHAPE } from '../../data/logoShapes';
import type { LogoShape } from '../../data/types';
import { Face, Hatch, Vignette, Wash } from '../components';
import '../components/interior.css';

/** Hall front width by GPU hall (CONTENT §7.4 ids). */
const HALL_W: Record<string, number> = { hall_row: 150, hall_twin: 186, hall_campus: 204 };
/** Rooftop units by cooling. */
const CHILLERS: Record<string, number> = { cool_air: 5, cool_liquid: 4, cool_immersion: 3 };
const G = 132;
const TOP = 84;
const PARAPET = 6;
/** The oblique side return: how far it runs right and up. */
const SIDE = { dx: 14, dy: 7 } as const;

export function DataCenterArt(p: {
  hall: string;
  cooling: string;
  brandInk: string;
  monogram: string;
  logoShape?: LogoShape;
  energySite?: boolean;
  fitout?: boolean;
  ink?: string;
}) {
  const w = HALL_W[p.hall] ?? HALL_W.hall_row!;
  // The yard stands on the left, so the hero's toggle (bottom right) covers only pavement.
  const x0 = 62;
  const x1 = x0 + w;
  const label = `A long, low data center hall${p.energySite ? ' at an energy site' : ''}${p.fitout ? ', fitting out' : ''}`;
  return (
    <Vignette label={label} ink={p.ink} class="in-alive">
      <path d={`M0 ${G}h320`} class="art-line" />
      {p.energySite ? <Turbines /> : <Neighbours />}
      {p.hall === 'hall_campus' && <BackHall x0={x0} x1={x1} />}
      <Hall x0={x0} x1={x1} split={p.hall !== 'hall_row'} />
      <Chillers x0={x0} x1={x1} n={CHILLERS[p.cooling] ?? 5} kind={p.cooling} fitout={!!p.fitout} />
      <Entrance x0={x0} ink={p.brandInk} />
      <Seal
        x={x0 + 66}
        y={110}
        ink={p.brandInk}
        monogram={p.monogram}
        shape={p.logoShape ?? DEFAULT_LOGO_SHAPE}
      />
      <Flag x={x0 + 12} ink={p.brandInk} />
      <Yard x={6} pylon={!!p.energySite} />
      {p.fitout && <Crane x={x0 + w * 0.7} />}
    </Vignette>
  );
}

/** Faint town neighbours behind a storefront data center. */
function Neighbours() {
  return (
    <path d={`M296 ${G}V100h22v32M299 108h16M299 118h16`} class="art-line art-fine art-faint" />
  );
}

/** Low hills with two wind turbines (energy sites). */
function Turbines() {
  const t = (x: number, y: number, s: number) =>
    `M${x} ${G - 18}V${y}M${x} ${y}l${-9 * s} ${-14 * s}M${x} ${y}l${16 * s} ${-3 * s}M${x} ${y}l${-6 * s} ${15 * s}`;
  return (
    <g class="art-faint">
      <path d={`M0 ${G - 14}q60 -16 120 -6t140 -4t60 2`} class="art-line art-fine" />
      <path d={`${t(300, 50, 1)}${t(262, 60, 0.8)}`} class="art-line art-fine" />
      <circle cx="300" cy="50" r="1.6" class="art-solid" />
      <circle cx="262" cy="60" r="1.3" class="art-solid" />
    </g>
  );
}

/** A second hall behind, for a campus. */
function BackHall(p: { x0: number; x1: number }) {
  return (
    <g class="art-faint">
      <Face pts={rect(p.x0 + 30, TOP - 16, p.x1 - p.x0, 18)} density="light" angle={-60} />
      <path d={`M${p.x0 + 30} ${TOP - 10}h${p.x1 - p.x0}`} class="art-line art-fine" />
    </g>
  );
}

function Hall(p: { x0: number; x1: number; split: boolean }) {
  const { x0, x1 } = p;
  const w = x1 - x0;
  const pt = TOP - PARAPET;
  const panels: string[] = [];
  for (let x = x0 + 18; x < x1 - 4; x += 18) panels.push(`M${x} ${TOP + 12}V${G}`);
  return (
    <g>
      {/* Roof slab and parapet: the long roofline. */}
      <Face
        pts={[
          [x0 - 3, pt],
          [x0 - 3 + SIDE.dx, pt - SIDE.dy],
          [x1 + 3 + SIDE.dx, pt - SIDE.dy],
          [x1 + 3, pt],
        ]}
        outline="fine"
      />
      <Face pts={rect(x0 - 3, pt, w + 6, PARAPET)} density="dense" angle={0} />
      {/* Side return in shade. */}
      <Face
        pts={[
          [x1 + 3, pt],
          [x1 + 3 + SIDE.dx, pt - SIDE.dy],
          [x1 + 3 + SIDE.dx, G - SIDE.dy],
          [x1 + 3, G],
        ]}
        density="medium"
      />
      <Face pts={rect(x0, TOP, w, G - TOP)} wash="var(--wash-stone)" />
      {/* Louvre band under the parapet. */}
      <path d={hatch(rect(x0, TOP + 2, w, 9), 1.6, 0)} class="art-hatch" />
      <path d={`M${x0} ${TOP + 11.5}h${w}M${x0} ${TOP + 1.5}h${w}`} class="art-line art-fine" />
      <path d={panels.join('')} class="art-line art-fine art-faint" />
      {p.split && <path d={`M${x0 + w / 2} ${TOP}V${G}`} class="art-line" />}
      {/* Two roller doors near the right end. */}
      {[x1 - 58, x1 - 30].map((x) => (
        <g>
          <path d={hatch(rect(x, 106, 22, 26), 2.2, 0)} class="art-hatch" />
          <path d={`M${x} ${G}V106h22V${G}`} class="art-line art-fine" />
        </g>
      ))}
    </g>
  );
}

/** Rooftop cooling: chillers with fans, dry coolers with pipes, or low immersion units. */
function Chillers(p: { x0: number; x1: number; n: number; kind: string; fitout: boolean }) {
  const roof = TOP - PARAPET - 3;
  const span = p.x1 - p.x0 - 60;
  const step = span / p.n;
  const h = p.kind === 'cool_immersion' ? 6 : 10;
  const units = Array.from({ length: p.fitout ? p.n - 1 : p.n }, (_, k) => {
    const x = p.x0 + 44 + k * step;
    const uw = step * 0.72;
    return (
      <g>
        <Face
          pts={[
            [x, roof - h],
            [x + 5, roof - h - 3],
            [x + uw + 5, roof - h - 3],
            [x + uw, roof - h],
          ]}
          outline="fine"
        />
        <Face pts={rect(x, roof - h, uw, h)} density="light" angle={90} outline="fine" />
        {p.kind === 'cool_air' && (
          <path
            d={`M${x + uw * 0.3} ${roof - h - 1.5}a${uw * 0.16} 1.2 0 1 0 0.1 0M${x + uw * 0.72} ${roof - h - 1.5}a${uw * 0.16} 1.2 0 1 0 0.1 0`}
            class="art-line art-fine"
          />
        )}
      </g>
    );
  });
  return (
    <g>
      {units}
      {p.kind === 'cool_liquid' && (
        <path
          d={`M${p.x1 - 12} ${roof - 4}h12v${G - roof - 2}M${p.x1 - 12} ${roof - 7}h15v${G - roof - 4}`}
          class="art-line art-fine"
        />
      )}
    </g>
  );
}

/** A glazed entrance under a canopy in the brand ink. */
function Entrance(p: { x0: number; ink: string }) {
  const x = p.x0 + 22;
  const canopy = rect(x - 6, 100, 36, 4);
  return (
    <g>
      <path d={`M${x} ${G}V106h24V${G}z`} class="art-paper" />
      <path d={`M${x} ${G}V106h24V${G}z`} class="art-glass" />
      <path d={`M${x} ${G}V106h24V${G}M${x + 12} 106V${G}`} class="art-line art-fine" />
      <Face pts={canopy} />
      <Wash pts={canopy} fill={p.ink} strong />
      <path d={`M${x - 4} 104l-2 6M${x + 28} 104l2 6`} class="art-line art-fine" />
    </g>
  );
}

/** The lab's seal on the wall, in its logo shape and brand ink. */
function Seal(p: { x: number; y: number; ink: string; monogram: string; shape: LogoShape }) {
  const r = 9;
  return (
    <g>
      <path d={logoPath(p.shape, p.x, p.y, r + 1.8)} class="art-paper art-line art-fine" />
      <path d={logoPath(p.shape, p.x, p.y, r)} style={{ fill: p.ink }} class="art-brand" />
      <text
        x={p.x}
        y={p.y + 3 + logoTextShift(p.shape, r)}
        text-anchor="middle"
        class="art-brand-text"
      >
        {p.monogram}
      </text>
    </g>
  );
}

/** A slim pole on the roof with a pennant in the brand ink. */
function Flag(p: { x: number; ink: string }) {
  const y0 = TOP - PARAPET - 4;
  const pennant = `M${p.x} ${y0 - 26}h14l-4 4 4 4H${p.x}z`;
  return (
    <g>
      <path d={`M${p.x} ${y0}V${y0 - 28}`} class="art-line" />
      <path d={pennant} style={{ fill: p.ink }} class="art-brand in-sway" />
    </g>
  );
}

/** A fenced substation yard with transformers; a lattice pylon at energy sites. */
function Yard(p: { x: number; pylon: boolean }) {
  const { x } = p;
  const posts: string[] = [];
  for (let k = 0; k <= 7; k++) posts.push(`M${x + k * 7} ${G}V114`);
  return (
    <g>
      {p.pylon && <Pylon x={x + 38} />}
      <Face pts={rect(x + 4, 110, 16, 22)} density="medium" angle={90} />
      <Face pts={rect(x + 26, 114, 13, 18)} density="medium" angle={90} />
      <path
        d={`M${x + 8} 110v-5M${x + 12} 110v-5M${x + 16} 110v-5M${x + 30} 114v-4M${x + 35} 114v-4`}
        class="art-line art-fine"
      />
      <path d={`${posts.join('')}M${x} 114h49M${x} 119h49`} class="art-line art-fine" />
      <Hatch pts={rect(x, 114, 49, 5)} density="light" angle={45} />
    </g>
  );
}

/** A tapering lattice pylon with two cross-arms and lines running off the plate. */
function Pylon(p: { x: number }) {
  const { x } = p;
  const brace: string[] = [];
  for (let k = 0; k < 6; k++) {
    const y0 = G - k * 13;
    const y1 = y0 - 13;
    const w0 = 8 - k * 1.1;
    const w1 = 8 - (k + 1) * 1.1;
    brace.push(`M${x - w0} ${y0}L${x + w1} ${y1}M${x + w0} ${y0}L${x - w1} ${y1}`);
  }
  return (
    <g>
      <path d={`M${x - 8} ${G}L${x - 1.4} 40M${x + 8} ${G}L${x + 1.4} 40`} class="art-line" />
      <path d={brace.join('')} class="art-line art-fine" />
      <path d={`M${x - 14} 52h28M${x - 10} 42h20M${x} 40v-6`} class="art-line" />
      <path
        d={`M${x - 14} 52q-30 8 -60 4M${x + 14} 52q8 2 10 1M${x - 10} 42q-34 10 -70 6`}
        class="art-line art-fine art-faint"
      />
    </g>
  );
}

/** A tower crane lowering the last chiller onto the roof (fit-out). */
function Crane(p: { x: number }) {
  const { x } = p;
  return (
    <g>
      <path
        d={`M${x} ${G}V16M${x + 4} ${G}V16M${x - 60} 20h90M${x - 60} 16h90M${x - 40} 20v24`}
        class="art-line art-fine"
      />
      <path d={hatch(rect(x - 60, 16, 90, 4), 3, 60)} class="art-hatch" />
      <Face pts={rect(x - 48, 44, 16, 9)} density="light" angle={90} outline="fine" />
    </g>
  );
}
