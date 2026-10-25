// Hero vignette for the central bank (ART_DIRECTION §3): an engraved domed
// hall with a pediment, six columns and broad steps, in the city ink on
// ivory with the colonnade's shadow hatched behind the columns.
import { rect, type Pt } from '../../art/engrave';
import { Face, Hatch, Vignette } from '../components';

const DOME: Pt[] = Array.from({ length: 17 }, (_, i) => {
  const t = Math.PI + (i / 16) * Math.PI;
  return [160 + 42 * Math.cos(t), 52 + 34 * Math.sin(t)] as Pt;
});

const COLUMNS = [104, 126, 148, 172, 194, 216];

export function CentralBankArt() {
  return (
    <Vignette label="A domed central bank">
      <path d="M0 132h320" class="art-line" />
      {/* Flanking wings behind the portico. */}
      <Face pts={rect(30, 90, 44, 42)} />
      <Face pts={rect(246, 90, 44, 42)} />
      <Hatch pts={rect(276, 90, 14, 42)} density="medium" />
      <Face pts={DOME} density="light" angle={0} />
      <Hatch pts={DOME.filter(([x]) => x >= 172).concat([[172, 52]])} density="medium" />
      <Face pts={rect(112, 52, 96, 6)} density="dense" angle={0} />
      <Face pts={rect(98, 76, 124, 40)} density="dense" angle={90} />
      {/* Dome, drum and lantern. */}
      <path
        d="M118 52a42 34 0 0 1 84 0M112 52h96M114 58h92M160 18v-8M154 20h12v-2h-12z"
        class="art-line"
      />
      {[124, 138, 152, 168, 182, 196].map((x) => (
        <path d={`M${x} 52v6`} class="art-line art-fine" />
      ))}
      {/* Pediment and entablature. */}
      <Face
        pts={[
          [92, 76],
          [160, 58],
          [228, 76],
        ]}
        density="light"
      />
      <Face pts={rect(90, 76, 140, 6)} />
      <path d="M150 70h20" class="art-line art-fine" />
      {/* Columns. */}
      {COLUMNS.map((x) => (
        <g>
          <Face pts={rect(x, 82, 8, 34)} outline="fine" />
          <path d={`M${x - 2} 82h12M${x - 2} 116h12`} class="art-line" />
        </g>
      ))}
      {/* Steps. */}
      <Face pts={rect(86, 116, 148, 5)} />
      <Face pts={rect(80, 121, 160, 5)} />
      <Face pts={rect(74, 126, 172, 6)} />
      <Hatch pts={rect(220, 116, 26, 16)} density="medium" angle={0} />
      {[40, 56, 256, 272].map((x) => (
        <path d={`M${x} 98h8v12h-8zM${x} 116h8v10h-8z`} class="art-line art-fine" />
      ))}
    </Vignette>
  );
}
