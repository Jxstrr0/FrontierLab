// Vignettes for rival buildings (ART_DIRECTION §3, "Other buildings"): a rival
// branch front with its monogram on a banner in the bank's ink, and a columned
// head office tower flying its flag, engraved in the city ink on ivory.
import { rect } from '../../art/engrave';
import type { RivalBank } from '../../sim/state';
import { Face, Hatch, Vignette } from '../components';

export function RivalBranchArt(p: { bank: RivalBank }) {
  return (
    <Vignette label={`${p.bank.name} sales office`}>
      <path d="M0 132h320" class="art-line" />
      {/* Building, cornice and steps */}
      <Face
        pts={[
          [254, 44],
          [264, 38],
          [264, 132],
          [254, 132],
        ]}
        density="medium"
      />
      <Face pts={rect(66, 44, 188, 88)} />
      <Hatch pts={rect(76, 62, 168, 62)} density="dense" angle={90} />
      <Face
        pts={[
          [58, 44],
          [262, 44],
          [254, 34],
          [74, 34],
        ]}
        density="light"
        angle={0}
      />
      <path d="M120 132v-4h80v4M126 128v-4h68v4" class="art-line art-fine" />
      {/* Columns */}
      {[86, 112, 208, 234].map((x) => (
        <g>
          <Face pts={rect(x - 4, 62, 8, 62)} outline="fine" />
          <path d={`M${x - 5} 62h10M${x - 5} 124h10`} class="art-line" />
        </g>
      ))}
      {/* Door and windows */}
      <Face pts={rect(140, 82, 40, 42)} />
      <path d="M160 82v42M136 82h48" class="art-line" />
      <path d="M128 66h64" class="art-line art-fine" />
      {/* Banner in the bank's ink */}
      <path d="M124 48h72v12h-72z" style={{ fill: p.bank.ink }} class="art-line" />
      <text x="160" y="57.5" text-anchor="middle" class="art-brand-text">
        {p.bank.monogram}
      </text>
    </Vignette>
  );
}

export function RivalHqArt(p: { bank: RivalBank }) {
  return (
    <Vignette label={`${p.bank.name} head office`}>
      <path d="M0 132h320" class="art-line" />
      {/* Side wings */}
      <Face pts={rect(40, 80, 70, 52)} />
      <Face pts={rect(210, 80, 70, 52)} />
      <Hatch pts={rect(262, 80, 18, 52)} density="medium" />
      {/* Tower with set-backs */}
      <Face pts={rect(110, 40, 100, 92)} />
      <Hatch pts={rect(192, 40, 18, 68)} density="medium" />
      <Face pts={rect(122, 26, 76, 14)} density="light" angle={0} />
      <Face pts={rect(136, 16, 48, 10)} density="medium" angle={0} />
      {[52, 64, 76, 88, 100].map((y) => (
        <path d={`M118 ${y}h84`} class="art-line art-fine" />
      ))}
      {[130, 150, 170, 190].map((x) => (
        <path d={`M${x} 46v62`} class="art-line art-fine" />
      ))}
      {/* Columned base */}
      <path d="M100 108h120M104 132v-24M216 132v-24" class="art-line" />
      {[124, 142, 178, 196].map((x) => (
        <path d={`M${x} 130v-18`} class="art-line" />
      ))}
      <path d="M152 132v-20h16v20" class="art-line" />
      {/* Flag in the bank's ink */}
      <path d="M160 16V2" class="art-line" />
      <path d="M160 3h22l-5 5 5 5h-22z" style={{ fill: p.bank.ink }} class="art-line" />
      {[56, 76, 96, 226, 246, 266].map((x) => (
        <path d={`M${x - 6} 92h12v16h-12z`} class="art-line art-fine" />
      ))}
    </Vignette>
  );
}
