// Hero vignettes for employers and universities (ART_DIRECTION §3, "Other
// buildings"): engraved line art on the vault ground, one drawing per employer
// type (civic hall, hospital, auto plant, tech campus, port, mine) and the
// university's clock tower. Line art only, like SiteArt.
import type { JSX } from 'preact';

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
    <svg class="site-art" viewBox="0 0 320 150" role="img" aria-label={art.label}>
      <rect x="0" y="0" width="320" height="150" class="art-ground" />
      <path d="M0 132h320" class="art-line" />
      {art.draw()}
    </svg>
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
      <path d="M90 132V84h140v48M84 84h152l-76-22z" class="art-line" />
      <path d="M130 62a30 30 0 0 1 60 0M160 32v-10M156 22h8" class="art-line" />
      <path d="M126 62h68" class="art-line art-fine" />
      {cols.map((x) => (
        <path d={`M${x} 90v38M${x + 8} 90v38`} class="art-line art-fine" />
      ))}
      <path d="M80 132v-4h160v4M150 132v-22h20v22" class="art-line" />
    </g>
  );
}

function Hospital() {
  return (
    <g>
      <path d="M60 132V50h200v82M140 50V30h40v20" class="art-line" />
      <path d="M154 34h12v6h6v12h-6v6h-12v-6h-6V40h6z" class="art-line" />
      {windows(72, 62, 4, 4)}
      {windows(194, 62, 4, 4)}
      <path d="M144 132v-28h32v28M140 104h40" class="art-line" />
    </g>
  );
}

function AutoPlant() {
  const teeth = [40, 80, 120, 160, 200];
  return (
    <g>
      <path d="M40 132V76M240 132V76" class="art-line" />
      {teeth.map((x) => (
        <path d={`M${x} 76l40-24v24`} class="art-line" />
      ))}
      <path d="M40 76h200" class="art-line art-fine" />
      <path d="M262 132V36h14v96M258 36h22" class="art-line" />
      <path d="M270 28c6-8 16-6 20-14M274 22c8-2 12-8 22-6" class="art-line art-fine" />
      <path d="M70 132v-30h40v30M150 132v-30h40v30" class="art-line" />
      <path d="M70 110h40M70 118h40M150 110h40M150 118h40" class="art-line art-fine" />
    </g>
  );
}

function TechCampus() {
  return (
    <g>
      <path d="M50 132V60h60v72M130 132V36h56v96M206 132V74h64v58" class="art-line" />
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
      <path d="M100 104h60v16h-60zM110 104v-12h40v12" class="art-line art-fine" />
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
      <path d="M160 132l90-60h30v60M250 72v60" class="art-line" />
      <path d="M200 132l40-26 40 26" class="art-line art-fine" />
    </g>
  );
}

function University() {
  return (
    <g>
      <path d="M40 132V82h90v50M190 132V82h90v50" class="art-line" />
      <path d="M130 132V44h60v88M124 44h72l-36-24z" class="art-line" />
      <circle cx="160" cy="62" r="12" class="art-line" />
      <path d="M160 62v-8M160 62l6 4" class="art-line art-fine" />
      {windows(50, 92, 5, 2, 8, 12, 8)}
      {windows(200, 92, 5, 2, 8, 12, 8)}
      <path d="M146 132v-34a14 14 0 0 1 28 0v34" class="art-line" />
    </g>
  );
}
