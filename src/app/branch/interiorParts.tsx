// Floor pieces of the branch interior (ART_DIRECTION §3, "Branch interior"):
// the teller line in each fit-out's own shape, glass advisor offices along the
// left wall, the ATMs, rope lines and a fit-out's ladder, in grid cells on the
// interior's Iso projection. Wall pieces live in interiorWall.tsx.
import { IsoBox, Pane, isoPt, placeAt, type Iso } from '../components/isoKit';
import {
  SeatedBack,
  SeatedFront,
  Standing,
  StandingBack,
  type Mood,
} from '../components/isoPeople';

/** Teller line geometry: stations each `pitch` wide from i0; the counter front is at j = COUNTER.j + COUNTER.d. */
export const COUNTER = { pitch: 1.05, j: 1.05, d: 0.42, h: 0.62 } as const;

export type TellerKind = 'counter' | 'pods' | 'desks';

/** How each teller fit-out is drawn (CONTENT §7 ids). */
export function tellerKind(id: string): { kind: TellerKind; glass: boolean } {
  switch (id) {
    case 'tel_pods':
      return { kind: 'pods', glass: false };
    case 'tel_concierge':
      return { kind: 'desks', glass: false };
    case 'tel_express':
      return { kind: 'counter', glass: false };
    default:
      return { kind: 'counter', glass: true };
  }
}

/** Centre of station `n` along i, for a line starting at i0. */
export const stationI = (i0: number, n: number) => i0 + (n + 0.5) * COUNTER.pitch;

/**
 * The teller line: staff behind (standing at counters and pods, seated at
 * concierge desks), the furniture, glass screens, and a customer being served
 * at each staffed station. Unstaffed stations show a "closed" plate.
 */
export function TellerLine(p: {
  g: Iso;
  id: string;
  i0: number;
  stations: number;
  staffed: number;
  served: number;
  mood: Mood;
}) {
  const { g, stations } = p;
  const { kind, glass } = tellerKind(p.id);
  const C = COUNTER;
  const len = stations * C.pitch;
  const staff = [];
  const furniture = [];
  const front = [];
  for (let n = 0; n < stations; n++) {
    const ci = stationI(p.i0, n);
    const on = n < p.staffed;
    if (on)
      staff.push(
        <g transform={placeAt(g, ci, C.j - 0.35)}>
          <g class="in-breathe" style={{ animationDelay: `${(n * 0.7).toFixed(1)}s` }}>
            {kind === 'desks' ? (
              <SeatedFront mood={p.mood} hair={n * 5 + 2} />
            ) : (
              <Standing mood={p.mood} hair={n * 5 + 2} />
            )}
          </g>
        </g>,
      );
    if (kind === 'pods')
      furniture.push(
        <IsoBox
          g={g}
          i={ci - 0.36}
          j={C.j}
          w={0.72}
          d={C.d}
          h={C.h}
          left="light"
          top="paper"
          fine
        />,
      );
    if (kind === 'desks')
      furniture.push(
        <IsoBox g={g} i={ci - 0.4} j={C.j} w={0.8} d={C.d} h={0.36} left="light" fine />,
      );
    // A little screen on the counter for each station.
    const top = kind === 'desks' ? 0.36 : C.h;
    furniture.push(
      <IsoBox
        g={g}
        i={ci - 0.14}
        j={C.j + 0.06}
        w={0.28}
        d={0.05}
        h={0.2}
        z={top}
        left="none"
        fine
      />,
    );
    if (!on) {
      const [x, y] = isoPt(g, ci + 0.2, C.j + C.d, top);
      furniture.push(
        <g>
          <path
            d={`M${x.toFixed(1)} ${y.toFixed(1)}l-3 -3h6z`}
            class="art-paper art-line art-fine"
          />
          <path
            d={`M${(x - 1.6).toFixed(1)} ${(y - 2).toFixed(1)}h3.2`}
            class="art-line art-fine"
          />
        </g>,
      );
    }
    if (on && n < p.served)
      front.push(
        <g transform={placeAt(g, ci, C.j + C.d + (kind === 'desks' ? 0.45 : 0.32))}>
          <g class="in-breathe" style={{ animationDelay: `${(n * 0.9 + 0.4).toFixed(1)}s` }}>
            {kind === 'desks' ? (
              <SeatedBack mood="guest" hair={n * 3 + 1} />
            ) : (
              <StandingBack mood="guest" hair={n * 3 + 1} carry={n % 2 ? 'bag' : undefined} />
            )}
          </g>
        </g>,
      );
  }
  return (
    <g>
      {staff}
      {kind === 'counter' && (
        <IsoBox g={g} i={p.i0} j={C.j} w={len} d={C.d} h={C.h} left="medium" top="paper" />
      )}
      {furniture}
      {glass &&
        Array.from({ length: stations }, (_, n) => {
          const a = p.i0 + n * C.pitch + 0.08;
          return (
            <Pane
              g={g}
              a={[a, C.j + 0.1]}
              b={[a + C.pitch - 0.16, C.j + 0.1]}
              h={0.55}
              z={C.h}
              glass
            />
          );
        })}
      {front}
    </g>
  );
}

/** A glass advisor office against the left wall, j from `j0`, one cell deep along j. */
export function AdvisorOffice(p: {
  g: Iso;
  j0: number;
  staffed: boolean;
  client: boolean;
  mood: Mood;
  n: number;
}) {
  const { g, j0 } = p;
  const w = 1.3;
  const d = 1;
  return (
    <g>
      {p.staffed && (
        <g transform={placeAt(g, 0.55, j0 + 0.32)}>
          <g class="in-breathe" style={{ animationDelay: `${(p.n * 0.8).toFixed(1)}s` }}>
            <SeatedFront mood={p.mood} hair={p.n * 4 + 1} />
          </g>
        </g>
      )}
      <IsoBox g={g} i={0.3} j={j0 + 0.42} w={0.6} d={0.3} h={0.36} left="light" fine />
      {p.client && (
        <g transform={placeAt(g, 0.6, j0 + 0.9)}>
          <SeatedBack mood="guest" hair={p.n * 6 + 4} />
        </g>
      )}
      <Pane g={g} a={[0, j0 + d]} b={[w, j0 + d]} h={1.05} glass />
      <Pane g={g} a={[w, j0]} b={[w, j0 + 0.45]} h={1.05} glass />
      <path
        d={`M${isoPt(g, w, j0 + d, 1.05).join(' ')}L${isoPt(g, w, j0 + 0.45, 1.05).join(' ')}`}
        class="art-line art-fine"
      />
    </g>
  );
}

/** An ATM standing against the left wall at j, its screen lit. */
export function Atm(p: { g: Iso; j: number; smart?: boolean }) {
  const { g } = p;
  const scr = [
    isoPt(g, 0.36, p.j + 0.08, 0.78),
    isoPt(g, 0.36, p.j + 0.42, 0.78),
    isoPt(g, 0.36, p.j + 0.42, 0.98),
    isoPt(g, 0.36, p.j + 0.08, 0.98),
  ];
  const d =
    scr.map(([x, y], n) => `${n ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('') + 'Z';
  return (
    <g>
      <IsoBox g={g} i={0} j={p.j} w={0.36} d={0.5} h={1.15} left="medium" right="light" fine />
      <path d={d} class={p.smart ? 'in-glow' : 'in-screen is-live'} />
      <path d={d} class="art-line art-fine" />
    </g>
  );
}

/** Brass posts with a rope slung between them, from cell a to cell b. */
export function Stanchions(p: { g: Iso; a: [number, number]; b: [number, number] }) {
  const { g } = p;
  const n = Math.max(1, Math.round(Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1]) / 0.85));
  const posts: string[] = [];
  const rope: string[] = [];
  const h = 0.55 * g.step;
  let prev: [number, number] | null = null;
  for (let m = 0; m <= n; m++) {
    const t = m / n;
    const [x, y] = isoPt(g, p.a[0] + (p.b[0] - p.a[0]) * t, p.a[1] + (p.b[1] - p.a[1]) * t);
    posts.push(`M${x.toFixed(1)} ${y.toFixed(1)}v${(-h).toFixed(1)}`);
    if (prev)
      rope.push(
        `M${prev[0].toFixed(1)} ${(prev[1] - h * 0.9).toFixed(1)}Q${((prev[0] + x) / 2).toFixed(1)} ${((prev[1] + y) / 2 - h * 0.55).toFixed(1)} ${x.toFixed(1)} ${(y - h * 0.9).toFixed(1)}`,
      );
    prev = [x, y];
  }
  return (
    <g>
      <path d={rope.join('')} class="art-line art-fine" style={{ stroke: 'var(--oxblood)' }} />
      <path d={posts.join('')} class="art-line" style={{ stroke: 'var(--brass)' }} />
    </g>
  );
}

/** A stepladder and boxes, for a branch under fit-out. */
export function Ladder(p: { g: Iso; i: number; j: number }) {
  return (
    <g>
      <g transform={placeAt(p.g, p.i, p.j)}>
        <path d="M-5 0l4-22l4 22M-4 -5h6M-3 -11h4.6M-2 -17h3" class="art-line art-fine" />
      </g>
      <IsoBox g={p.g} i={p.i + 0.6} j={p.j - 0.2} w={0.55} d={0.5} h={0.4} left="light" fine />
      <IsoBox
        g={p.g}
        i={p.i + 0.7}
        j={p.j - 0.15}
        w={0.4}
        d={0.38}
        h={0.3}
        z={0.4}
        left="light"
        fine
      />
    </g>
  );
}
