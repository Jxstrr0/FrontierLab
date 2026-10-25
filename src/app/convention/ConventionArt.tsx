// Exhibition hall vignette for conventions (ART_DIRECTION §3, "Other
// buildings"): a vaulted glass hall with a banner, stands and visitors,
// engraved in the city ink on ivory with hatched stands.
import { rect } from '../../art/engrave';
import { Face, Hatch, Vignette } from '../components';

const STANDS = [36, 96, 156, 216];

export function ConventionArt() {
  return (
    <Vignette label="A vaulted exhibition hall">
      <path d="M0 132h320" class="art-line" />
      <path d="M20 132V70c0-34 280-34 280 0v62z" class="art-tint" />
      {/* The vaulted roof and its ribs. */}
      <path d="M20 132V70c0-34 280-34 280 0v62" class="art-line" />
      <path
        d="M60 52v80M100 44v88M140 40v92M180 40v92M220 44v88M260 52v80"
        class="art-line art-fine"
      />
      <path d="M20 70h280" class="art-line art-fine" />
      {/* Banner. */}
      <Face pts={rect(110, 56, 100, 16)} density="light" angle={0} />
      <path d="M118 64h84" class="art-line" />
      {/* Stands with counters and screens. */}
      {STANDS.map((x) => (
        <g>
          <Face pts={rect(x, 110, 48, 22)} density="medium" angle={90} />
          <Hatch pts={rect(x + 40, 110, 8, 22)} density="dense" />
          <path d={`M${x - 2} 110h52`} class="art-line" />
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
    </Vignette>
  );
}
