// Exhibition hall vignette for conventions (ART_DIRECTION §3, "Other
// buildings"): a vaulted glass hall with a banner, stands and visitors, in
// engraved line art on the vault ground, like the other site vignettes.
import '../sites/sites.css';
import '../storefront/storefront.css';

const STANDS = [36, 96, 156, 216];

export function ConventionArt() {
  return (
    <svg class="site-art" viewBox="0 0 320 150" role="img" aria-label="A vaulted exhibition hall">
      <rect x="0" y="0" width="320" height="150" class="art-ground" />
      <path d="M0 132h320" class="art-line" />
      {/* The vaulted roof and its ribs. */}
      <path d="M20 132V70c0-34 280-34 280 0v62" class="art-line" />
      <path
        d="M60 52v80M100 44v88M140 40v92M180 40v92M220 44v88M260 52v80"
        class="art-line art-fine"
      />
      <path d="M20 70h280" class="art-line art-fine" />
      {/* Banner. */}
      <path d="M110 56h100v16H110zM118 64h84" class="art-line" />
      {/* Stands with counters and screens. */}
      {STANDS.map((x) => (
        <g>
          <path d={`M${x} 132v-22h48v22M${x - 2} 110h52`} class="art-line" />
          <path d={`M${x + 10} 106v-14h28v14M${x + 6} 122h36`} class="art-line art-fine" />
        </g>
      ))}
      {/* Visitors. */}
      {[78, 142, 200, 262].map((x) => (
        <path
          d={`M${x} 118a3 3 0 1 0 .1 0M${x} 121v8M${x - 4} 132l4-3 4 3`}
          class="art-line art-fine"
        />
      ))}
    </svg>
  );
}
