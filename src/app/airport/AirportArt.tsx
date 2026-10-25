// Hero vignette for the airport (ART_DIRECTION §3: "airport (terminal and tail
// fins)"): an engraved terminal with a vaulted glass roof, a control tower,
// tail fins behind the roofline and a plane climbing away on a dotted arc,
// in the city ink on ivory.
import { rect, type Pt } from '../../art/engrave';
import { Face, Hatch, Vignette } from '../components';
import { PLANE_PATH } from './AirportMedallion';

/** Glass mullions across the terminal front. */
const MULLIONS = [100, 118, 136, 154, 172, 190, 208, 226];
/** The vaulted roof as a polygon (a shallow arch over the glass front). */
const ROOF: Pt[] = [
  [84, 96],
  ...Array.from({ length: 13 }, (_, i) => {
    const x = 84 + (i / 12) * 152;
    const t = (x - 160) / 76;
    return [x, 84 - 12 * (1 - t * t)] as Pt;
  }),
  [236, 96],
];

export function AirportArt() {
  return (
    <Vignette label="An airport terminal" bare>
      {/* Tail fins standing behind the terminal. */}
      <Face
        pts={[
          [56, 104],
          [70, 62],
          [80, 62],
          [76, 104],
        ]}
        density="dense"
        angle={-20}
      />
      <Face
        pts={[
          [250, 104],
          [262, 68],
          [271, 68],
          [268, 104],
        ]}
        density="dense"
        angle={-20}
      />
      {/* Terminal: vaulted roof, glass front and canopy. */}
      <Face pts={ROOF} density="light" angle={0} />
      <Face pts={rect(84, 96, 152, 36)} />
      <path d="M84 96h152" class="art-line" />
      <path d="M84 100h152v26H84z" class="art-tint" />
      {MULLIONS.map((x) => (
        <path d={`M${x} 100V126`} class="art-line art-fine" />
      ))}
      <Hatch
        pts={[
          [96, 126],
          [110, 100],
          [118, 100],
          [104, 126],
        ]}
        density="light"
        angle={-50}
      />
      <Hatch
        pts={[
          [182, 126],
          [196, 100],
          [202, 100],
          [188, 126],
        ]}
        density="light"
        angle={-50}
      />
      <Face pts={rect(80, 124, 160, 3)} density="dense" angle={0} />
      <path d="M140 132v-5h40v5" class="art-line" />
      {/* Control tower. */}
      <Face pts={rect(276, 78, 10, 54)} />
      <Hatch pts={rect(281, 78, 5, 54)} density="medium" />
      <Face
        pts={[
          [270, 78],
          [292, 78],
          [289, 66],
          [273, 66],
        ]}
      />
      <path d="M274 69h14v6h-14z" class="art-tint" />
      <Face pts={rect(273, 60, 16, 6)} density="dense" angle={0} />
      <path d="M281 60v-6" class="art-line" />
      {/* Apron and runway marks. */}
      <path d="M0 132h320" class="art-line" />
      <path d="M0 136h320" class="art-line art-fine" />
      <path
        d="M20 143h24M64 143h24M108 143h24M152 143h24M196 143h24M240 143h24M284 143h24"
        class="art-line"
      />
      <path d="M0 150h320M0 156h320" class="art-line art-fine art-faint" />
      {/* A plane climbing away on a dotted arc. */}
      <path d="M30 70q60-46 150-52" class="art-dots" stroke-dasharray="0.1 5" />
      <g transform="translate(176 6) rotate(-6 12 12)">
        <path d={PLANE_PATH} class="art-paper" />
        <path d={PLANE_PATH} class="art-line art-fine" />
      </g>
    </Vignette>
  );
}
