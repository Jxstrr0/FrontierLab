// The flight overlay (SCREENS §18, ART_DIRECTION §1.4): a full-screen engraved
// world map (equirectangular graticule, coarse continents, a dot per airport)
// with the route as a dotted great-circle arc and a plane flying along it for
// FLIGHT_MS, then a fade to the destination's map, which was rebuilt under the
// overlay. With reduced motion it holds a still frame of the whole route and
// crossfades. Tap anywhere to skip once the flight is under way.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  FLIGHT_FADE_MS,
  FLIGHT_MS,
  FLIGHT_PATH_POINTS,
  FLIGHT_STILL_MS,
} from '../../config/mapView';
import { CITIES, DESTINATIONS } from '../../data/cities';
import { landPath } from '../../art/worldOutline';
import { useDialog } from '../components/dialog';
import { money } from '../format/format';
import { cityOpen } from '../../sim/regions';
import { useGame } from '../store';
import { PLANE_PATH, PlaneIcon } from './AirportMedallion';
import { distanceText } from './departures';
import { flight, landFlight, performFlight, type Flight } from './flight';
import { arcPoints, easeInOut, frameFor, pathD, pointAt, project, type Pt } from './flightPath';
import './flight.css';

const GRATICULE_DEG = 15;
const LAND = landPath();
/** The world is drawn again either side so routes over the date line stay whole. */
const WRAPS = [-360, 0, 360];

const systemReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function FlightOverlay() {
  const f = flight.value;
  return f ? <FlightScene key={f.key} f={f} /> : null;
}

function FlightScene({ f }: { f: Flight }) {
  const s = useGame();
  const reduced = s.settings.reducedMotion || systemReducedMotion();
  const from = CITIES[f.from]!;
  const to = CITIES[f.to]!;
  const pts = useMemo(() => arcPoints(from, to, FLIGHT_PATH_POINTS), [from, to]);
  const aspect = typeof window === 'undefined' ? 0.5 : window.innerWidth / window.innerHeight;
  const box = useMemo(() => frameFor(pts, aspect), [pts, aspect]);
  const [t, setT] = useState(reduced ? 1 : 0);
  const [fading, setFading] = useState(false);
  const run = useRef({ flown: false, done: false, finish: () => {} });

  useEffect(() => {
    let raf = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const r = run.current;
    r.finish = () => {
      if (r.done) return;
      r.done = true;
      cancelAnimationFrame(raf);
      setT(1);
      setFading(true);
      timer = setTimeout(() => landFlight(f), FLIGHT_FADE_MS);
    };
    // Two frames in, the overlay is on screen: fly in the sim (the map rebuilds underneath).
    raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        if (!performFlight(f)) return;
        r.flown = true;
        if (reduced) {
          timer = setTimeout(r.finish, FLIGHT_STILL_MS);
          return;
        }
        const t0 = performance.now();
        const step = (now: number) => {
          const u = Math.min(1, (now - t0) / FLIGHT_MS);
          setT(u);
          if (u < 1) raf = requestAnimationFrame(step);
          else r.finish();
        };
        raf = requestAnimationFrame(step);
      });
    });
    return () => {
      cancelAnimationFrame(raf);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const skip = () => run.current.flown && run.current.finish();
  // Focus moves onto the overlay; Escape skips like a tap (Stage 10 accessibility).
  const dialog = useRef<HTMLDivElement>(null);
  useDialog(dialog, skip, true);
  // User units per CSS px: strokes and labels stay the same size whatever the zoom.
  const px = box.w / (typeof window === 'undefined' ? 390 : window.innerWidth);
  const plane = pointAt(pts, easeInOut(t));
  // Each name sits on the far side of its dot from the other end, so short hops don't collide.
  const southward = pts[pts.length - 1]!.y > pts[0]!.y + 0.5;
  const flownPts = flownPath(pts, easeInOut(t), plane);
  const sym = s.settings.currency;
  const how =
    f.quote.mode === 'jet'
      ? 'Private jet'
      : f.quote.mode === 'fare'
        ? `Ticket ${money(f.quote.fare, sym)}`
        : 'Free flight';

  return (
    <div
      class={`flight${fading ? ' is-fading' : ''}${reduced ? ' is-still' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Flying from ${from.name} to ${to.name}`}
      tabIndex={-1}
      ref={dialog}
      style={{ '--flight-fade': `${FLIGHT_FADE_MS}ms` }}
      onClick={skip}
    >
      <svg
        class="flight-map"
        viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <Graticule box={box} px={px} />
        {WRAPS.map((dx) => (
          <path d={LAND} transform={`translate(${dx} 0)`} class="flight-land" stroke-width={px} />
        ))}
        <CityDots
          box={box}
          px={px}
          skip={[f.from, f.to, ...DESTINATIONS.filter((id) => !cityOpen(s, id))]}
        />
        <path
          d={pathD(pts)}
          class="flight-route"
          stroke-width={2 * px}
          stroke-dasharray={`0 ${6 * px}`}
        />
        <path
          d={pathD(flownPts)}
          class="flight-route is-flown"
          stroke-width={3 * px}
          stroke-dasharray={`0 ${6 * px}`}
        />
        <Endpoint at={pts[0]!} label={from.name} px={px} box={box} below={!southward} />
        <Endpoint at={pts[pts.length - 1]!} label={to.name} px={px} box={box} below={southward} />
        <g
          transform={`translate(${plane.x} ${plane.y}) rotate(${plane.angle}) scale(${(30 * px) / 24}) translate(-12 -12)`}
        >
          <path d={PLANE_PATH} class="flight-plane" stroke-width="1" />
        </g>
      </svg>
      <header class="flight-head">
        <div class="flight-codes">
          <span>{from.airport.code}</span>
          <span class="flight-arrow">
            <PlaneIcon size={20} filled />
          </span>
          <span>{to.airport.code}</span>
        </div>
        <div class="flight-title">
          {from.name} to {to.name}
        </div>
        <div class="flight-sub">
          {distanceText(f.quote.km, s.settings.units)} · {how}
        </div>
      </header>
      {!reduced && <div class="flight-skip">Tap to skip</div>}
    </div>
  );
}

/** The route up to the plane, ending exactly under it. */
function flownPath(pts: Pt[], t: number, plane: Pt): Pt[] {
  const n = Math.floor(Math.min(1, Math.max(0, t)) * (pts.length - 1));
  return [...pts.slice(0, n + 1), { x: plane.x, y: plane.y }];
}

function Graticule(p: { box: { x: number; y: number; w: number; h: number }; px: number }) {
  const lines: string[] = [];
  const x0 = Math.floor(p.box.x / GRATICULE_DEG) * GRATICULE_DEG;
  for (let x = x0; x <= p.box.x + p.box.w; x += GRATICULE_DEG) lines.push(`M${x} 0V180`);
  for (let y = 0; y <= 180; y += GRATICULE_DEG) lines.push(`M${p.box.x} ${y}H${p.box.x + p.box.w}`);
  return (
    <>
      <rect x={p.box.x} y={0} width={p.box.w} height={180} class="flight-ocean" />
      <path d={lines.join('')} class="flight-grid" stroke-width={0.6 * p.px} />
      <path
        d={`M${p.box.x} 90H${p.box.x + p.box.w}`}
        class="flight-grid is-equator"
        stroke-width={p.px}
      />
    </>
  );
}

function CityDots(p: {
  box: { x: number; y: number; w: number; h: number };
  px: number;
  skip: string[];
}) {
  const dots: Pt[] = [];
  for (const id of DESTINATIONS) {
    if (p.skip.includes(id)) continue;
    const c = project(CITIES[id]!);
    for (const dx of WRAPS) {
      const x = c.x + dx;
      if (x >= p.box.x && x <= p.box.x + p.box.w) dots.push({ x, y: c.y });
    }
  }
  return (
    <g class="flight-dot">
      {dots.map((d) => (
        <circle cx={d.x} cy={d.y} r={2.5 * p.px} />
      ))}
    </g>
  );
}

/**
 * An airport on the route: a ring and its name above or below it, anchored
 * towards the middle of the frame so names near an edge stay on screen.
 */
function Endpoint(p: {
  at: Pt;
  label: string;
  px: number;
  box: { x: number; w: number };
  below?: boolean;
}) {
  const u = (p.at.x - p.box.x) / p.box.w;
  const anchor = u < 1 / 3 ? 'start' : u > 2 / 3 ? 'end' : 'middle';
  const dx = anchor === 'start' ? -8 : anchor === 'end' ? 8 : 0;
  return (
    <g>
      <circle cx={p.at.x} cy={p.at.y} r={5 * p.px} class="flight-end" stroke-width={1.5 * p.px} />
      <text
        x={p.at.x + dx * p.px}
        y={p.at.y + (p.below ? 22 : -12) * p.px}
        class="flight-label"
        font-size={14 * p.px}
        stroke-width={3 * p.px}
        text-anchor={anchor}
      >
        {p.label}
      </text>
    </g>
  );
}
