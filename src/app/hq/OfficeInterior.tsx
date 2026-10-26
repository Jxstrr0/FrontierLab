// HQ floor hero (ART_DIRECTION §3, "HQ floors"): an engraved isometric
// cut-away office in the city ink on ivory. Desks and people reflect actual
// staffing, so an understaffed floor shows empty desks (dashed, chair pushed
// in) at a glance; people are tinted by the team's mood (jade / brass /
// oxblood) and sit at glowing screens with their own clutter. Each department
// furnishes its floor its own way (officeDecor.tsx), daylight falls across
// the planks, and with a full team someone walks the front aisle. With no
// department yet (a new HQ) it draws the bare room, waiting for a team.
import type { DeptId } from '../../sim/state';
import { Vignette } from '../components';
import { IsoBox, isoPt, jitter, pathOf, type Iso } from '../components/isoKit';
import { SeatedBack, EmptyChair, Standing } from '../components/isoPeople';
import { IsoRoom, type RoomSpec } from '../components/isoRoom';
import { Huddle, Plant } from '../components/isoProps';
import '../components/interior.css';
import { useGame } from '../store';
import { deskPicture } from './deptSelectors';
import { DeptBackProps, DeptFrontProp, DeptWallDecor } from './officeDecor';

/** Most desks drawn; bigger departments are drawn to scale at this size. */
const MAX_DESKS = 32;
/** Picture box (SVG units inside the vignette): the room fits between top and bottom. */
const G = { cx: 160, top: 4, bottom: 142, width: 300, maxStep: 15, wall: 2.7 } as const;
/** Room margins around the desk grid, in cells. */
const M = { left: 1, back: 1.4, right: 0.6, front: 0.6 } as const;
/** Teams at least this big have someone walking the floor, and two chatting at the back. */
const WALKER_MIN = 3;
const CHAT_MIN = 6;
/** Share of desks filled before the huddle table has people at it. */
const HUDDLE_BUSY = 0.75;

const BARE_ROOM_ROWS = 3;
const BARE_ROOM = { shown: 0, desks: 0, staff: 0, filled: 0, mood: 'good' } as const;

export function OfficeInterior(p: { dept?: DeptId }) {
  const s = useGame();
  const pic = p.dept ? deskPicture(s, p.dept, MAX_DESKS) : BARE_ROOM;
  // The Executive suite seats a handful, three to a row, leaving room for a huddle table.
  const cols = p.dept === 'executive' ? 3 : pic.shown > 24 ? 8 : 6;
  const rows = pic.shown > 0 ? Math.ceil(pic.shown / cols) : BARE_ROOM_ROWS;
  const w = M.left + cols - 0.5 + M.right;
  const d = rows + M.back + M.front;
  const span = w + d;
  const avail = G.bottom - G.top;
  const step = Math.min(G.maxStep, G.width / span, avail / (G.wall + span / 2));
  const height = step * (G.wall + span / 2);
  const g: Iso = {
    step,
    ox: G.cx - ((w - d) * step) / 2,
    oy: G.top + (avail - height) / 2 + G.wall * step,
  };
  const nWin = Math.max(2, Math.floor(w / 2.4));
  const room: RoomSpec = {
    g,
    w,
    d,
    h: G.wall,
    floor: p.dept === 'executive' ? 'carpet' : 'planks',
    backWindows: Array.from({ length: nWin }, (_, n) => (w * (n + 0.5)) / nWin),
    leftWindows: [],
    windowW: Math.min(1.3, (w / nWin) * 0.55),
  };

  // Desks back to front; the first `filled` (in reading order) have someone at them.
  const desks: { c: number; r: number; n: number }[] = [];
  for (let n = 0; n < pic.shown; n++)
    desks.push({ c: M.left + (n % cols), r: M.back + Math.floor(n / cols), n });
  desks.sort((a, b) => a.c + a.r - (b.c + b.r) || a.c - b.c);

  const label =
    pic.desks === 0
      ? 'An empty floor'
      : `Office floor: ${pic.staff} of ${pic.desks} desks filled${pic.desks > pic.shown ? ' (drawn to scale)' : ''}`;
  const walker = pic.filled >= WALKER_MIN && p.dept !== 'executive';
  // Spare grid slots at the end of the last row hold a huddle table.
  const spare = pic.shown > 0 ? rows * cols - pic.shown : 0;
  const huddle =
    spare >= 2
      ? {
          i: M.left + (pic.shown % cols) + (spare - 1) / 2,
          j: M.back + rows - 1,
          people: pic.shown > 0 && pic.filled / pic.shown >= HUDDLE_BUSY ? 2 : 0,
        }
      : null;

  return (
    <Vignette label={label} bare class="hq-interior in-alive">
      <IsoRoom r={room} left={<DeptWallDecor g={g} dept={p.dept} d={d} />} />
      <DeptBackProps g={g} dept={p.dept} w={w} windows={room.backWindows} />
      <Plant g={g} i={0.4} j={0.45} tall />
      {pic.filled >= CHAT_MIN && <Chat g={g} i={w / 2} hair={pic.staff} />}
      {desks.map(({ c, r, n }) => (
        <Desk g={g} c={c} r={r} n={n} taken={n < pic.filled} mood={pic.mood} />
      ))}
      {huddle && (
        <Huddle g={g} i={huddle.i} j={huddle.j} people={huddle.people} hair={pic.staff + 5} />
      )}
      {walker && <Walker g={g} from={M.left + 0.3} to={w - 1.2} j={d - 0.3} hair={pic.filled} />}
      <DeptFrontProp g={g} dept={p.dept} w={w} d={d} />
      <text x="12" y="150" class="in-caption">
        {pic.desks > 0 ? `${pic.staff} of ${pic.desks} desks filled` : 'Empty floor'}
      </text>
    </Vignette>
  );
}

/**
 * One desk: a slab with a screen facing its worker, a little clutter, and, if
 * taken, someone seen from behind at it (else an empty chair, dashed).
 */
function Desk(p: {
  g: Iso;
  c: number;
  r: number;
  n: number;
  taken: boolean;
  mood: 'good' | 'warn' | 'bad';
}) {
  const { g, c, r, n } = p;
  const k = (g.step / 15).toFixed(3);
  const top = 0.36;
  const screen = [
    isoPt(g, c - 0.22, r - 0.14, top + 0.08),
    isoPt(g, c + 0.22, r - 0.14, top + 0.08),
    isoPt(g, c + 0.22, r - 0.14, top + 0.38),
    isoPt(g, c - 0.22, r - 0.14, top + 0.38),
  ];
  const [sx, sy] = isoPt(g, c, r - 0.17, top);
  const [px, py] = isoPt(g, c, r + 0.5);
  const roll = jitter(n, 3);
  const [mx, my] = isoPt(g, c - 0.3, r + 0.08, top);
  return (
    <g class={p.taken ? undefined : 'in-dashed'}>
      <IsoBox
        g={g}
        i={c - 0.42}
        j={r - 0.22}
        w={0.84}
        d={0.44}
        h={top}
        left={p.taken ? 'light' : 'none'}
        fine
      />
      <path d={`M${sx} ${sy}v${(-0.08 * g.step).toFixed(1)}`} class="art-line art-fine" />
      <IsoBox
        g={g}
        i={c - 0.22}
        j={r - 0.2}
        w={0.44}
        d={0.06}
        h={0.3}
        z={top + 0.08}
        left="none"
        fine
      />
      <path
        d={pathOf(screen)}
        class={p.taken ? 'in-screen is-live' : 'in-screen'}
        style={{ animationDelay: `${(roll * 5).toFixed(2)}s` }}
      />
      {roll > 0.45 && (
        <IsoBox
          g={g}
          i={c + 0.12}
          j={r - 0.02}
          w={0.24}
          d={0.18}
          h={0.03}
          z={top}
          left="none"
          top="tint"
          fine
        />
      )}
      {roll < 0.6 && (
        <circle
          cx={mx.toFixed(1)}
          cy={(my - 1).toFixed(1)}
          r={(1 * g.step) / 15}
          class="art-paper art-line art-fine"
        />
      )}
      <g transform={`translate(${px.toFixed(1)} ${py.toFixed(1)}) scale(${k})`}>
        {p.taken ? (
          <SeatedBack mood={p.mood} hair={n * 7 + 3} delay={roll * 1.9} />
        ) : (
          <EmptyChair />
        )}
      </g>
    </g>
  );
}

/** A colleague with a folder walking the front aisle and back. */
function Walker(p: { g: Iso; from: number; to: number; j: number; hair: number }) {
  const { g } = p;
  const [x, y] = isoPt(g, p.from, p.j);
  const cells = p.to - p.from;
  const style = {
    '--dx': `${(cells * 15).toFixed(1)}px`,
    '--dy': `${(cells * 7.5).toFixed(1)}px`,
    '--walk-s': `${(cells * 2.2).toFixed(1)}s`,
  };
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(g.step / 15).toFixed(3)})`}>
      <g class="in-walk" style={style}>
        <g class="in-step">
          <Standing mood="good" hair={p.hair} carry="folder" />
        </g>
      </g>
    </g>
  );
}

/** Two colleagues talking in the strip behind the first row of desks. */
function Chat(p: { g: Iso; i: number; hair: number }) {
  const { g } = p;
  const k = (g.step / 15).toFixed(3);
  const place = (i: number, j: number) =>
    isoPt(g, i, j)
      .map((v) => v.toFixed(1))
      .join(' ');
  return (
    <g>
      <g transform={`translate(${place(p.i - 0.3, 0.95)}) scale(${k})`}>
        <g class="in-breathe">
          <Standing mood="good" hair={p.hair + 1} />
        </g>
      </g>
      <g transform={`translate(${place(p.i + 0.3, 0.8)}) scale(${k})`}>
        <g class="in-breathe" style={{ animationDelay: '1.7s' }}>
          <Standing mood="good" hair={p.hair + 4} wave />
        </g>
      </g>
    </g>
  );
}
