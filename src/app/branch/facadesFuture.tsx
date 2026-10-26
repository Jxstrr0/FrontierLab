// Branch exteriors, part 3 (ART_DIRECTION §3, CONTENT §7): the Lattice
// Pavilion, a hyper-modern front in the same 320 × 150 vignette box. A thin
// roof slab floats over a box of glass crossed by a diagrid, the seal hangs
// in the glazing, and a light wall in the brand ink stands beside the door
// with a ticker of dashes running down it.
import { hatch, poly, rect } from '../../art/engrave';
import { Face, Hatch, Wash } from '../components/Vignette';
import { Glass, Seal, WASH, type Brand } from './facadeParts';

const BOX = rect(92, 36, 140, 96);
const DIAGRID = hatch(BOX, 18, 45) + hatch(BOX, 18, -45);
const TICKER = Array.from({ length: 9 }, (_, k) => {
  const y = 62 + k * 7.5;
  const w = 2 + ((k * 5) % 4);
  return `M${178.5 - w / 2} ${y}h${w}`;
}).join('');

export function Lattice(b: Brand) {
  return (
    <g>
      {/* Side fin and the glass box. */}
      <Face
        pts={[
          [232, 36],
          [240, 32],
          [240, 132],
          [232, 132],
        ]}
        wash={WASH.slate}
        density="medium"
      />
      <Glass pts={BOX} />
      <path d={poly(BOX)} class="art-tint" />
      <path d={DIAGRID} class="art-line art-fine" style={{ opacity: 0.7 }} />
      <path d="M92 84h140" class="art-line art-fine" />
      <Wash pts={rect(92, 82, 140, 4)} fill={WASH.slate} />
      {/* Floating roof slab, cantilevered past the glass, with its shadow line. */}
      <Face
        pts={[
          [78, 36],
          [90, 30],
          [262, 30],
          [250, 36],
        ]}
        wash={WASH.slate}
        density="light"
      />
      <Face pts={rect(78, 36, 172, 5)} wash={WASH.slate} density="dense" angle={0} />
      <Hatch pts={rect(92, 41, 140, 3)} density="dense" />
      {/* The light wall beside the door, in the brand ink, with its ticker. */}
      <path d={poly(rect(174, 56, 9, 76))} class="art-brand" style={{ fill: b.ink }} />
      <path d={TICKER} style={{ stroke: 'var(--ivory)', strokeWidth: 1.1 }} />
      {/* The entrance recess and the seal hanging in the glass. */}
      <Face pts={rect(142, 100, 32, 32)} wash={WASH.slate} density="light" angle={90} />
      <Seal x={160} y={66} r={8} brand={b} />
      {/* Plinth. */}
      <Face pts={rect(86, 130, 150, 2)} wash={WASH.slate} />
    </g>
  );
}
