// Vignettes for the credit bureau and the marketing agency (ART_DIRECTION §3,
// "Other buildings"): the bureau's server racks and filing cabinets, and the
// agency's studio with a storyboard wall. Line art only, like StorefrontArt.
import type { SiteKind } from '../../sim/state';

export function SiteArt(p: { kind: SiteKind }) {
  return (
    <svg
      class="site-art"
      viewBox="0 0 320 150"
      role="img"
      aria-label={p.kind === 'bureau' ? 'Server racks and filing cabinets' : 'A creative studio'}
    >
      <rect x="0" y="0" width="320" height="150" class="art-ground" />
      <path d="M0 132h320" class="art-line" />
      {p.kind === 'bureau' ? <Bureau /> : <Agency />}
    </svg>
  );
}

function Bureau() {
  const racks = [40, 84, 128];
  return (
    <g>
      {racks.map((x) => (
        <g>
          <path d={`M${x} 132V36h36v96M${x} 44h36`} class="art-line" />
          {[52, 64, 76, 88, 100, 112].map((y) => (
            <path d={`M${x + 4} ${y}h28v8h-28zM${x + 26} ${y + 4}h2`} class="art-line art-fine" />
          ))}
        </g>
      ))}
      {/* Filing cabinets. */}
      {[196, 238].map((x) => (
        <g>
          <path d={`M${x} 132V64h36v68`} class="art-line" />
          {[70, 86, 102, 118].map((y) => (
            <path d={`M${x + 4} ${y}h28v12h-28zM${x + 14} ${y + 5}h8`} class="art-line art-fine" />
          ))}
        </g>
      ))}
      {/* A score card pinned above. */}
      <path d="M200 26h68v28h-68zM208 46l12-10 10 6 14-10 16 8" class="art-line" />
    </g>
  );
}

function Agency() {
  return (
    <g>
      {/* Storyboard wall: six frames with sketches. */}
      {[0, 1, 2].map((c) =>
        [0, 1].map((r) => {
          const x = 30 + c * 58;
          const y = 22 + r * 40;
          return (
            <path
              d={`M${x} ${y}h48v32h-48zM${x + 6} ${y + 24}l10-10 8 6 10-12 8 16`}
              class="art-line art-fine"
            />
          );
        }),
      )}
      {/* A drafting table with a lamp. */}
      <path d="M210 132l10-44h56l10 44M216 104h64M222 88l-8-30 26-10" class="art-line" />
      <path d="M238 48l10 8-6 6-10-8z" class="art-line" />
      {/* Sunburst mark on the wall. */}
      <path
        d="M262 40v-14M262 40l10-10M262 40l14 0M262 40l-10-10M262 40l-14 0M248 40h28"
        class="art-line art-fine"
      />
    </g>
  );
}
