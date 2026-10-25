// Branch interior hero (ART_DIRECTION §3, "Branch interior"): an engraved
// isometric cut-away of the banking hall you built. The teller line takes the
// fit-out's shape (counter, pods, express line or concierge desks), the lobby
// sets the floor and furnishings and the number of glass advisor offices, the
// vault and ATMs stand where customers can see them, and the bank's plaque
// hangs over the counter. With live figures it fills with the real staff
// (tellers first, then advisors, then a greeter), tinted by morale, and a
// queue as long as the wait, someone always walking in at the back of it.
import { memo } from 'preact/compat';
import { WAIT_LABELS } from '../../config/balance';
import { EQUIPMENT, type BuildSpec } from '../../data/equipment';
import { Vignette } from '../components/Vignette';
import { isoPt, placeAt, type Iso } from '../components/isoKit';
import { SeatedFront, Standing, StandingBack, type Mood } from '../components/isoPeople';
import { IsoRoom, type FloorFinish, type RoomSpec } from '../components/isoRoom';
import { Bench, Plant, Safe } from '../components/isoProps';
import { Frame, WallClock } from '../components/isoWall';
import '../components/interior.css';
import { AdvisorOffice, Atm, COUNTER, Ladder, Stanchions, TellerLine } from './interiorParts';
import { BrandPlaque, DepositBoxes, VaultDoor } from './interiorWall';
import { moodTone } from './selectors';

/** Picture box inside the vignette (as the HQ floor). */
const G = { cx: 160, top: 4, bottom: 142, width: 300, maxStep: 15, wall: 2.7 } as const;
/** Hall layout in cells: the counter clears the advisor offices; the vault follows the counter. */
const L = {
  iBare: 0.9,
  iOffices: 2.05,
  boxesGap: 0.5,
  doorGap: 0.3,
  rightGap: 0.7,
  minW: 6.6,
  minD: 4.9,
  atmZone: 1.9,
} as const;
/** Most people drawn in the line; longer waits read as a full line. */
const QUEUE_MAX = 6;
/** People in line per point of the wait index. */
const QUEUE_PER_WAIT = 4;

const FLOORS: Record<string, FloorFinish> = {
  lob_basic: 'tiles',
  lob_comfort: 'planks',
  lob_advice: 'carpet',
  lob_marble: 'marble',
  lob_private: 'carpet',
};

export interface BranchLive {
  status: 'fitout' | 'open' | 'closed';
  staff: number;
  morale: number;
  waitIndex: number;
}

export const BranchInterior = memo(function BranchInterior(p: {
  build: BuildSpec;
  brandInk: string;
  monogram: string;
  ink?: string;
  live?: BranchLive;
}) {
  const teller = EQUIPMENT[p.build.teller];
  const lobby = EQUIPMENT[p.build.lobby];
  const vault = EQUIPMENT[p.build.vault];
  const stations = teller?.stations ?? 2;
  const offices = lobby?.advisorOffices ?? 0;
  const quality = lobby?.quality ?? 1.5;
  const boxes = vault?.boxes ?? 0;
  const i0 = offices > 0 ? L.iOffices : L.iBare;
  const len = stations * COUNTER.pitch;
  const boxesI = i0 + len + L.boxesGap;
  const boxesW = boxes <= 0 ? 0 : (boxes >= 600 ? 6 : boxes >= 300 ? 5 : 4) * 0.22;
  const doorI = boxesI + boxesW + L.doorGap;
  const doorW = p.build.vault === 'vlt_safe' ? 0.6 : p.build.vault === 'vlt_fortress' ? 1.6 : 1.32;
  const w = Math.max(L.minW, doorI + doorW + L.rightGap);
  const d = Math.max(L.minD, 0.3 + offices * 1.05 + L.atmZone);
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
    floor: FLOORS[p.build.lobby] ?? 'tiles',
    backWindows: [],
    leftWindows: [d * 0.3, d * 0.64],
    windowW: 1.1,
  };

  // Who is here: tellers first, then advisors, then a greeter at the door.
  const live = p.live;
  const open = !live || live.status === 'open';
  const staff = !live ? stations + offices : open ? live.staff : 0;
  const tellers = Math.min(staff, stations);
  const advisors = Math.min(staff - tellers, offices);
  const greeter = staff > tellers + advisors;
  const mood: Mood = live ? moodTone(live.morale) : 'good';
  const wait = live?.waitIndex ?? 0.3;
  const qi = i0 + len / 2;
  const q0 = COUNTER.j + COUNTER.d + 0.95;
  const room4 = Math.floor((w - 1.2 - qi) / 0.62) + 1;
  const queue =
    open && tellers > 0 ? Math.min(QUEUE_MAX, room4, Math.round(wait * QUEUE_PER_WAIT)) : 0;
  // The line runs along the hall from the middle of the counter, ropes in front of it.
  const queueAt = (k: number): [number, number] => [qi + 0.62 * k, q0];
  const busy = wait > WAIT_LABELS.busy;
  const ropes =
    open &&
    (quality >= 3.5 || p.build.teller === 'tel_standard' || p.build.teller === 'tel_express');
  const atm = p.build.atm;
  const s = step;

  const caption = !live
    ? 'Your banking hall'
    : live.status === 'fitout'
      ? 'Fit-out under way'
      : live.status === 'closed'
        ? 'Closed'
        : `${tellers} of ${stations} windows open · ${wait > WAIT_LABELS.long ? 'long wait' : busy ? 'busy' : 'short wait'}`;

  return (
    <Vignette label={`Inside the branch: ${caption}`} bare ink={p.ink} class="br-interior in-alive">
      <IsoRoom
        r={room}
        back={
          <g>
            <BrandPlaque
              x={qi * s}
              y={-2.05 * s}
              r={0.42 * s}
              ink={p.brandInk}
              monogram={p.monogram}
            />
            <WallClock x={(boxesI + Math.max(0.4, boxesW / 2)) * s} y={-2.25 * s} />
            <DepositBoxes x={boxesI * s} s={s} boxes={boxes} />
            <VaultDoor x={doorI * s} s={s} id={p.build.vault} />
          </g>
        }
        left={
          quality >= 4.5 ? (
            <Frame x={(d * 0.47 - 0.45) * s} y={-2.2 * s} w={0.9 * s} h={0.7 * s} />
          ) : undefined
        }
      />
      {p.build.vault === 'vlt_safe' && <Safe g={g} i={doorI} j={0.25} />}
      {offices === 0 && <Plant g={g} i={0.45} j={0.5} tall />}
      <TellerLine
        g={g}
        id={p.build.teller}
        i0={i0}
        stations={stations}
        staffed={tellers}
        served={open && live ? Math.min(tellers, 1 + queue) : open ? 1 : 0}
        mood={mood}
      />
      {Array.from({ length: offices }, (_, n) => (
        <AdvisorOffice
          g={g}
          j0={0.3 + n * 1.05}
          staffed={n < advisors}
          client={open && n < advisors && (busy || n % 2 === 0)}
          mood={mood}
          n={n}
        />
      ))}
      {atm === 'atm_wall' && <Atm g={g} j={d - 1.05} />}
      {atm === 'atm_dual' && [<Atm g={g} j={d - 1.75} />, <Atm g={g} j={d - 1.05} />]}
      {atm === 'atm_smart' && <Atm g={g} j={d - 1.05} smart />}
      {atm === 'atm_lobby' && [<Atm g={g} j={d - 1.75} smart />, <Atm g={g} j={d - 1.05} smart />]}
      {ropes && queue > 0 && (
        <Stanchions g={g} a={[qi - 0.3, q0 + 0.45]} b={[queueAt(queue - 1)[0] + 0.3, q0 + 0.45]} />
      )}
      {Array.from({ length: queue }, (_, k) => {
        const [i, j] = queueAt(k);
        return (
          <g transform={placeAt(g, i, j)}>
            <g class="in-breathe" style={{ animationDelay: `${(k * 0.55).toFixed(2)}s` }}>
              <StandingBack mood="guest" hair={k * 5 + 3} carry={k % 3 === 1 ? 'bag' : undefined} />
            </g>
          </g>
        );
      })}
      {
        <WaitingSofa
          g={g}
          i={w - 2}
          j={q0 + 0.95}
          seated={open && busy ? 2 : 0}
          soft={quality >= 2.5}
        />
      }
      {greeter && (
        <g transform={placeAt(g, w - 0.9, d - 0.55)}>
          <g class="in-breathe">
            <Standing mood={mood} hair={11} wave />
          </g>
        </g>
      )}
      {queue > 0 && (
        <Arriving g={g} from={[w - 0.4, d - 0.2]} to={queueAt(Math.min(queue, room4 - 1))} />
      )}
      {live?.status === 'fitout' && <Ladder g={g} i={w / 2} j={d - 1.6} />}
      <Plant g={g} i={1.7} j={d - 0.35} tall={quality >= 3.5} />
      <text x="12" y="150" class="in-caption">
        {caption}
      </text>
    </Vignette>
  );
});

/** A sofa for the waiting area, facing the viewer, with anyone waiting on it. */
function WaitingSofa(p: { g: Iso; i: number; j: number; seated: number; soft: boolean }) {
  const { g } = p;
  return (
    <g>
      <Bench g={g} i={p.i} j={p.j} w={1.6} soft={p.soft} />
      {Array.from({ length: p.seated }, (_, n) => (
        <g transform={placeAt(g, p.i + 0.45 + n * 0.7, p.j + 0.42)}>
          <g class="in-breathe" style={{ animationDelay: `${(n * 1.1).toFixed(1)}s` }}>
            <SeatedFront mood="guest" hair={n * 4 + 2} />
          </g>
        </g>
      ))}
    </g>
  );
}

/** A customer walking in from the door to the back of the line, over and over. */
function Arriving(p: { g: Iso; from: [number, number]; to: [number, number] }) {
  const { g } = p;
  const [fx, fy] = isoPt(g, p.from[0], p.from[1]);
  const [tx, ty] = isoPt(g, p.to[0], p.to[1]);
  const k = g.step / 15;
  const style = {
    '--dx': `${((fx - tx) / k).toFixed(1)}px`,
    '--dy': `${((fy - ty) / k).toFixed(1)}px`,
    '--walk-s': '9s',
  };
  return (
    <g transform={placeAt(g, p.to[0], p.to[1])}>
      <g class="in-arrive" style={style}>
        <StandingBack mood="guest" hair={9} carry="bag" />
      </g>
    </g>
  );
}
