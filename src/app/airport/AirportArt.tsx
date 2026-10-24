// Hero vignette for the airport (ART_DIRECTION §3: "airport (terminal and tail
// fins)"): an engraved terminal with a vaulted glass roof, a control tower,
// tail fins behind the roofline and a plane climbing away on a dotted arc.
// Line art only, in the shared vignette classes.
import '../sites/sites.css';
import '../storefront/storefront.css';
import { PLANE_PATH } from './AirportMedallion';

/** Glass mullions across the terminal front. */
const MULLIONS = [100, 118, 136, 154, 172, 190, 208, 226];

export function AirportArt() {
  return (
    <svg class="site-art" viewBox="0 0 320 150" role="img" aria-label="An airport terminal">
      <rect x="0" y="0" width="320" height="150" class="art-ground" />
      {/* Tail fins standing behind the terminal. */}
      <path d="M56 104 70 62h10l-4 42M250 104l12-36h9l-3 36" class="art-line" />
      <path d="M66 74h10M258 78h8" class="art-line art-fine" />
      {/* Terminal: vaulted roof, glass front and canopy. */}
      <path d="M84 132V96q76-30 152 0v36" class="art-line" />
      <path d="M88 99q72-26 144 0" class="art-line art-fine" />
      {MULLIONS.map((x) => (
        <path
          d={`M${x} ${x < 160 ? 102 - (x - 84) * 0.12 : 102 - (236 - x) * 0.12}V126`}
          class="art-line art-fine"
        />
      ))}
      <path d="M80 126h160M140 132v-10h40v10" class="art-line" />
      {/* Control tower. */}
      <path
        d="M276 132V78M286 132V78M270 78h22l-3-12h-16zM273 66v-6h16v6M281 60v-6"
        class="art-line"
      />
      <path d="M275 72h12" class="art-line art-fine" />
      {/* Apron and runway marks. */}
      <path d="M0 132h320" class="art-line" />
      <path
        d="M20 141h24M64 141h24M108 141h24M152 141h24M196 141h24M240 141h24M284 141h24"
        class="art-line art-fine"
      />
      {/* A plane climbing away on a dotted arc. */}
      <path d="M30 70q60-46 150-52" class="art-line art-fine" stroke-dasharray="0.1 5" />
      <g transform="translate(176 6) rotate(-6 12 12)">
        <path d={PLANE_PATH} class="art-line" />
      </g>
    </svg>
  );
}
