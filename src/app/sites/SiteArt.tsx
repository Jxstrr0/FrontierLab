// Vignettes for the credit bureau and the marketing agency (ART_DIRECTION §3,
// "Other buildings"): the bureau's server racks and filing cabinets under a
// score chart, and the agency's studio with a storyboard wall and a drafting
// table. Engraved in the city ink with hatched shadows.
import { rect } from '../../art/engrave';
import type { SiteKind } from '../../sim/state';
import { Face, Hatch, Vignette } from '../components';

export function SiteArt(p: { kind: SiteKind }) {
  return (
    <Vignette
      label={p.kind === 'bureau' ? 'Server racks and filing cabinets' : 'A creative studio'}
    >
      {/* Back wall with a skirting board and the floor line. */}
      <Hatch pts={rect(0, 98, 320, 26)} density="light" angle={90} />
      <path d="M0 98h320" class="art-line art-fine" />
      <path d="M0 124h320M0 132h320" class="art-line" />
      {p.kind === 'bureau' ? <Bureau /> : <Agency />}
    </Vignette>
  );
}

const RACKS = [40, 84, 128];
const SLOTS = [52, 64, 76, 88, 100, 112];

function Bureau() {
  return (
    <g>
      {RACKS.map((x) => (
        <g>
          <Face
            pts={[
              [x + 36, 36],
              [x + 42, 32],
              [x + 42, 132],
              [x + 36, 132],
            ]}
            density="dense"
          />
          <Face pts={rect(x, 36, 36, 96)} density="dense" angle={90} />
          <path d={`M${x} 44h36`} class="art-line" />
          {SLOTS.map((y) => (
            <g>
              <path d={`M${x + 4} ${y}h28v8h-28z`} class="art-paper" />
              <path d={`M${x + 4} ${y}h28v8h-28zM${x + 8} ${y + 4}h12`} class="art-line art-fine" />
              <circle cx={x + 27} cy={y + 4} r="1.1" class="art-solid" />
            </g>
          ))}
        </g>
      ))}
      {/* Filing cabinets. */}
      {[196, 238].map((x) => (
        <g>
          <Face
            pts={[
              [x + 36, 64],
              [x + 41, 60],
              [x + 41, 132],
              [x + 36, 132],
            ]}
            density="medium"
          />
          <Face pts={rect(x, 64, 36, 68)} />
          {[70, 86, 102, 118].map((y) => (
            <g>
              <path d={`M${x + 4} ${y}h28v12h-28z`} class="art-line art-fine" />
              <Face pts={rect(x + 14, y + 4, 8, 3)} density="dense" angle={0} outline="fine" />
            </g>
          ))}
        </g>
      ))}
      {/* A score chart pinned above the cabinets. */}
      <Face pts={rect(200, 22, 70, 30)} outline="fine" />
      <path d="M206 46l12-10 10 6 14-10 16 8" class="art-line" />
      <path d="M206 28v20h60" class="art-line art-fine" />
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
          const y = 22 + r * 42;
          return (
            <g>
              <Face pts={rect(x, y, 48, 32)} outline="fine" />
              <Hatch pts={rect(x, y + 20, 48, 12)} density="light" />
              <path d={`M${x + 6} ${y + 24}l10-10 8 6 10-12 8 16`} class="art-line art-fine" />
            </g>
          );
        }),
      )}
      {/* A drafting table with a lamp. */}
      <Face
        pts={[
          [214, 88],
          [286, 88],
          [280, 100],
          [220, 100],
        ]}
        density="medium"
        angle={0}
      />
      <path d="M220 100l-8 32M280 100l8 32M216 116h68" class="art-line" />
      <path d="M226 88l-10-34 28-10" class="art-line" />
      <Face
        pts={[
          [242, 40],
          [254, 48],
          [248, 56],
          [236, 48],
        ]}
        density="dense"
      />
      {/* A sunburst mark on the wall. */}
      <path
        d="M270 40v-14M270 40l10-10M270 40h14M270 40l-10-10M270 40h-14M256 40h28"
        class="art-line art-fine"
      />
    </g>
  );
}
