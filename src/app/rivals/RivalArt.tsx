// Vignettes for rival buildings (ART_DIRECTION §3, "Other buildings"): a rival
// branch front with its monogram on a banner in the bank's ink, and a columned
// head office tower flying its flag. Line art only, like StorefrontArt.
import type { RivalBank } from '../../sim/state';

export function RivalBranchArt(p: { bank: RivalBank }) {
  return (
    <svg class="site-art" viewBox="0 0 320 150" role="img" aria-label={`${p.bank.name} branch`}>
      <rect x="0" y="0" width="320" height="150" class="art-ground" />
      <path d="M0 132h320" class="art-line" />
      {/* Building, cornice and steps */}
      <path d="M66 132V44h188v88M58 44h204M66 44l8-10h172l8 10" class="art-line" />
      <path d="M120 132v-4h80v4M126 128v-4h68v4" class="art-line art-fine" />
      {/* Columns */}
      {[86, 112, 208, 234].map((x) => (
        <path d={`M${x} 124V62M${x - 5} 62h10M${x - 5} 124h10`} class="art-line" />
      ))}
      {/* Door and windows */}
      <path d="M140 124V82h40v42M160 82v42M136 82h48" class="art-line" />
      <path d="M128 66h64" class="art-line art-fine" />
      {/* Banner in the bank's ink */}
      <path d="M124 48h72v12h-72z" style={{ fill: p.bank.ink }} class="art-line" />
      <text x="160" y="57.5" text-anchor="middle" class="art-text rv-art-mono">
        {p.bank.monogram}
      </text>
    </svg>
  );
}

export function RivalHqArt(p: { bank: RivalBank }) {
  return (
    <svg
      class="site-art"
      viewBox="0 0 320 150"
      role="img"
      aria-label={`${p.bank.name} head office`}
    >
      <rect x="0" y="0" width="320" height="150" class="art-ground" />
      <path d="M0 132h320" class="art-line" />
      {/* Tower with set-backs */}
      <path d="M110 132V40h100v92M122 40V26h76v14M136 26V16h48v10" class="art-line" />
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
      {/* Side wings */}
      <path d="M40 132V80h70M210 80h70v52" class="art-line" />
      {[56, 76, 96, 226, 246, 266].map((x) => (
        <path d={`M${x - 6} 92h12v16h-12z`} class="art-line art-fine" />
      ))}
    </svg>
  );
}
