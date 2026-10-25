// Hero vignettes for employers and universities (ART_DIRECTION §3, "Other
// buildings"): one engraving per employer type (civic hall, hospital, auto
// plant, tech campus, port, mine) and the university's clock tower, in the
// city ink on ivory with hatched shadows.
import type { JSX } from 'preact';
import { rect } from '../../art/engrave';
import { Face, Hatch, Vignette } from '../components';

const ART: Record<string, { label: string; draw: () => JSX.Element }> = {
  cityHall: { label: 'A domed civic hall with columns', draw: CityHall },
  hospital: { label: 'A hospital with a cross over the entrance', draw: Hospital },
  autoPlant: { label: 'A factory with a sawtooth roof', draw: AutoPlant },
  techCampus: { label: 'Glass office towers on a campus', draw: TechCampus },
  port: { label: 'Harbour cranes over the water', draw: Port },
  potashMine: { label: 'A mine headframe and conveyor', draw: Mine },
  university: { label: 'A university clock tower', draw: University },
};

export function PartnerArt(p: { type: string }) {
  const art = ART[p.type] ?? ART.cityHall!;
  return (
    <Vignette label={art.label}>
      <path d="M0 132h320" class="art-line" />
      {art.draw()}
    </Vignette>
  );
}

/** Evenly spaced window grid. */
function windows(x: number, y: number, cols: number, rows: number, w = 8, h = 10, gap = 6) {
  const d: string[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      d.push(`M${x + c * (w + gap)} ${y + r * (h + gap)}h${w}v${h}h-${w}z`);
  return <path d={d.join('')} class="art-line art-fine" />;
}

function CityHall() {
  const cols = [104, 124, 144, 164, 184, 204];
  return (
    <g>
      <Face pts={rect(90, 84, 140, 48)} />
      <Hatch pts={rect(96, 90, 128, 38)} density="dense" angle={90} />
      <Face
        pts={[
          [84, 84],
          [236, 84],
          [160, 62],
        ]}
        density="light"
      />
      <Face
        pts={Array.from({ length: 13 }, (_, i) => {
          const t = Math.PI + (i / 12) * Math.PI;
          return [160 + 30 * Math.cos(t), 62 + 30 * Math.sin(t)] as [number, number];
        })}
      />
      <Hatch
        pts={[
          [166, 33],
          [190, 62],
          [168, 62],
        ]}
        density="medium"
        angle={90}
      />
      <path d="M160 32v-10M156 22h8" class="art-line" />
      <path d="M126 62h68" class="art-line art-fine" />
      {cols.map((x) => (
        <Face pts={rect(x, 90, 8, 38)} outline="fine" />
      ))}
      <path d="M80 132v-4h160v4M150 132v-22h20v22" class="art-line" />
    </g>
  );
}

function Hospital() {
  return (
    <g>
      <Face
        pts={[
          [260, 50],
          [270, 44],
          [270, 132],
          [260, 132],
        ]}
        density="medium"
      />
      <Face pts={rect(60, 50, 200, 82)} />
      <Face pts={rect(140, 30, 40, 20)} density="light" angle={0} />
      <path d="M154 34h12v6h6v12h-6v6h-12v-6h-6V40h6z" class="art-line" />
      {windows(72, 62, 4, 4)}
      {windows(194, 62, 4, 4)}
      <Face pts={rect(144, 104, 32, 28)} density="dense" angle={90} />
      <Face pts={rect(140, 100, 40, 4)} />
    </g>
  );
}

function AutoPlant() {
  const teeth = [40, 80, 120, 160, 200];
  return (
    <g>
      <path d="M40 132V76M240 132V76" class="art-line" />
      <Face pts={rect(40, 76, 200, 56)} />
      {teeth.map((x) => (
        <g>
          <Face
            pts={[
              [x, 76],
              [x + 40, 52],
              [x + 40, 76],
            ]}
            density="light"
            angle={0}
          />
          <Hatch
            pts={[
              [x + 36, 55],
              [x + 40, 52],
              [x + 40, 76],
              [x + 36, 76],
            ]}
            density="dense"
          />
        </g>
      ))}
      <path d="M40 76h200" class="art-line art-fine" />
      <Face pts={rect(262, 36, 14, 96)} />
      <Hatch pts={rect(270, 36, 6, 96)} density="medium" />
      <path d="M258 36h22" class="art-line" />
      <path d="M270 28c6-8 16-6 20-14M274 22c8-2 12-8 22-6" class="art-line art-fine" />
      <path d="M70 132v-30h40v30M150 132v-30h40v30" class="art-line" />
      <path d="M70 110h40M70 118h40M150 110h40M150 118h40" class="art-line art-fine" />
    </g>
  );
}

function TechCampus() {
  return (
    <g>
      <Face pts={rect(50, 60, 60, 72)} />
      <Hatch pts={rect(92, 60, 18, 72)} density="medium" />
      <Face pts={rect(130, 36, 56, 96)} />
      <Hatch pts={rect(170, 36, 16, 96)} density="medium" />
      <Face pts={rect(206, 74, 64, 58)} />
      <Hatch pts={rect(252, 74, 18, 58)} density="medium" />
      <path d="M130 36l28-12 28 12" class="art-line art-fine" />
      {windows(58, 70, 3, 4, 10, 8, 8)}
      {windows(138, 46, 3, 5, 10, 10, 6)}
      {windows(214, 84, 3, 3, 12, 8, 8)}
      <path d="M20 132c10-18 20-18 30 0M276 132c10-18 20-18 30 0" class="art-line art-fine" />
    </g>
  );
}

function Port() {
  return (
    <g>
      <path d="M60 120V40l60 0M60 40l-20 0M60 56l40-16M100 40v40M96 80h8" class="art-line" />
      <path d="M180 120V48h56M180 48h-16M180 62l36-14M216 48v34M212 82h8" class="art-line" />
      <path d="M40 120h240" class="art-line" />
      <Face pts={rect(100, 104, 60, 16)} density="medium" angle={90} outline="fine" />
      <Face pts={rect(110, 92, 40, 12)} density="light" angle={90} outline="fine" />
      <Hatch pts={rect(0, 122, 320, 26)} density="light" angle={0} />
      <path d="M20 140c10-4 20-4 30 0s20 4 30 0 20-4 30 0 20 4 30 0" class="art-line art-fine" />
      <path d="M160 144c10-4 20-4 30 0s20 4 30 0 20-4 30 0 20 4 30 0" class="art-line art-fine" />
    </g>
  );
}

function Mine() {
  return (
    <g>
      <path
        d="M80 132L104 40h24l24 92M96 72h40M90 100h52M104 40l36 92M128 40l-36 92"
        class="art-line"
      />
      <path d="M116 40v-8M110 32h12" class="art-line" />
      <circle cx="116" cy="46" r="6" class="art-line art-fine" />
      <Face
        pts={[
          [160, 132],
          [250, 72],
          [280, 72],
          [280, 132],
        ]}
        density="light"
        angle={0}
      />
      <Hatch
        pts={[
          [250, 72],
          [280, 72],
          [280, 132],
          [250, 132],
        ]}
        density="medium"
      />
      <path d="M250 72v60" class="art-line" />
      <path d="M200 132l40-26 40 26" class="art-line art-fine" />
    </g>
  );
}

function University() {
  return (
    <g>
      <Face pts={rect(40, 82, 90, 50)} />
      <Face pts={rect(190, 82, 90, 50)} />
      <Face pts={rect(130, 44, 60, 88)} />
      <Hatch pts={rect(172, 44, 18, 88)} density="medium" />
      <Face
        pts={[
          [124, 44],
          [196, 44],
          [160, 20],
        ]}
        density="dense"
        angle={-45}
      />
      <Face
        pts={[
          [36, 82],
          [134, 82],
          [128, 74],
          [42, 74],
        ]}
        density="light"
        angle={0}
      />
      <Face
        pts={[
          [186, 82],
          [284, 82],
          [278, 74],
          [192, 74],
        ]}
        density="light"
        angle={0}
      />
      <circle cx="160" cy="62" r="12" class="art-paper" />
      <circle cx="160" cy="62" r="12" class="art-line" />
      <path d="M160 62v-8M160 62l6 4" class="art-line art-fine" />
      {windows(50, 92, 5, 2, 8, 12, 8)}
      {windows(200, 92, 5, 2, 8, 12, 8)}
      <path d="M146 132v-34a14 14 0 0 1 28 0v34" class="art-line" />
    </g>
  );
}
