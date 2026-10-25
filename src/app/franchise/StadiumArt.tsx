// Hero vignette for a sports club (ART_DIRECTION §3: "stadium"): an indoor
// arena for hockey and basketball, an open stadium with floodlights for
// football, baseball and rugby. Banners fly in the club's kit colours, so a
// repainted kit shows on the building too.
import { memo } from 'preact/compat';
import { rect, type Pt } from '../../art/engrave';
import type { Sport } from '../../data/franchises';
import { Face, Hatch, Vignette } from '../components';

const INDOOR: readonly Sport[] = ['hockey', 'basketball'];

/** A drum with a shallow domed roof (the arena). */
const ROOF: Pt[] = Array.from({ length: 17 }, (_, i) => {
  const t = Math.PI + (i / 16) * Math.PI;
  return [160 + 116 * Math.cos(t), 68 + 26 * Math.sin(t)] as Pt;
});
const RIBS = Array.from({ length: 15 }, (_, i) => `M${54 + i * 15} 70v56`).join('');

function Banner(p: { x: number; y: number; kit: { primary: string; secondary: string } }) {
  return (
    <g>
      <path d={`M${p.x} ${p.y}v-18`} class="art-line" />
      <path
        d={`M${p.x} ${p.y - 18}h14v10l-7-3-7 3z`}
        style={{ fill: p.kit.primary }}
        class="art-brand"
      />
      <path d={`M${p.x} ${p.y - 14}h14`} style={{ stroke: p.kit.secondary, strokeWidth: 1.6 }} />
    </g>
  );
}

function Arena(p: { kit: { primary: string; secondary: string } }) {
  return (
    <g>
      <Face pts={ROOF} density="light" angle={0} />
      <Hatch pts={ROOF.filter(([x]) => x >= 200).concat([[200, 68]])} density="medium" />
      <Face pts={rect(44, 68, 232, 64)} />
      <Hatch pts={rect(44, 68, 232, 64)} density="light" angle={90} />
      <path d={RIBS} class="art-line art-fine" />
      <Face pts={rect(44, 68, 232, 6)} density="dense" angle={0} />
      <Face pts={rect(128, 100, 64, 32)} density="dense" angle={90} />
      <path d="M128 100h64M144 100v32M160 100v32M176 100v32" class="art-line art-fine" />
      <Banner x={80} y={60} kit={p.kit} />
      <Banner x={240} y={60} kit={p.kit} />
    </g>
  );
}

function Floodlight(p: { x: number }) {
  return (
    <g>
      <path d={`M${p.x} 132V30M${p.x - 3} 132l3-60 3 60`} class="art-line art-fine" />
      <Face pts={rect(p.x - 10, 20, 20, 10)} density="dense" angle={0} outline="fine" />
    </g>
  );
}

function Stadium(p: { kit: { primary: string; secondary: string } }) {
  const stand: Pt[] = [
    [36, 132],
    [36, 82],
    [80, 66],
    [240, 66],
    [284, 82],
    [284, 132],
  ];
  return (
    <g>
      <Floodlight x={28} />
      <Floodlight x={292} />
      <Face pts={stand} />
      <Hatch
        pts={[
          [36, 82],
          [80, 66],
          [240, 66],
          [284, 82],
          [284, 94],
          [36, 94],
        ]}
        density="dense"
        angle={0}
      />
      <Face
        pts={[
          [30, 82],
          [80, 60],
          [240, 60],
          [290, 82],
          [284, 86],
          [240, 66],
          [80, 66],
          [36, 86],
        ]}
      />
      {[60, 100, 140, 180, 220, 260].map((x) => (
        <Face pts={rect(x - 10, 104, 20, 28)} density="medium" angle={90} outline="fine" />
      ))}
      <path d="M36 98h248" class="art-line art-fine" />
      <Banner x={120} y={58} kit={p.kit} />
      <Banner x={186} y={58} kit={p.kit} />
    </g>
  );
}

export const StadiumArt = memo(function StadiumArt(p: {
  sport: Sport;
  primary: string;
  secondary: string;
}) {
  const kit = { primary: p.primary, secondary: p.secondary };
  const indoor = INDOOR.includes(p.sport);
  return (
    <Vignette label={indoor ? 'An indoor arena' : 'An open stadium with floodlights'}>
      <path d="M0 132h320" class="art-line" />
      {indoor ? <Arena kit={kit} /> : <Stadium kit={kit} />}
    </Vignette>
  );
});
