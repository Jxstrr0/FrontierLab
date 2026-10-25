// Branch hero vignette (ART_DIRECTION §3, "Branch exterior"): the exterior
// the player built, between two faint neighbours, flying the bank's flag on
// the roof. A branch in fit-out wears scaffolding and an "Opening soon"
// board; an acquired branch still converting flies the old bank's colours.
// Also the live preview in Build branch (SCREENS §4).
import { memo } from 'preact/compat';
import { hatch, rect } from '../../art/engrave';
import { EQUIPMENT } from '../../data/equipment';
import { Vignette } from '../components/Vignette';
import type { Brand, Facade } from './facadeParts';
import { Columns, Deco } from './facadesGrand';
import { Brick, GlassFront, Storefront } from './facadesLow';

/** One composition per exterior option (CONTENT §7 ids). */
const FACADES: Record<string, Facade> = {
  ext_storefront: { draw: Storefront, flag: [104, 50], box: [88, 50, 152, 82] },
  ext_brick: { draw: Brick, flag: [96, 36], box: [80, 36, 166, 96] },
  ext_glass: { draw: GlassFront, flag: [214, 16], box: [92, 16, 150, 116] },
  ext_columns: { draw: Columns, flag: [160, 26], box: [76, 26, 168, 106] },
  ext_deco: { draw: Deco, flag: [160, 10], box: [70, 10, 180, 122] },
};

const NEIGHBOUR_WINDOWS =
  'M20 84h10v12H20zM50 84h10v12H50zM20 106h10v12H20zM50 106h10v12H50z' +
  'M262 92h10v12h-10zM292 92h10v12h-10zM262 112h10v12h-10zM292 112h10v12h-10z';

function Neighbours() {
  return (
    <g class="art-faint">
      <path d="M10 132V74h62v58M6 74l35-18 35 18" class="art-line art-fine" />
      <path
        d={hatch(
          [
            [10, 74],
            [41, 58],
            [72, 74],
          ],
          4.2,
        )}
        class="art-hatch"
      />
      <path d="M252 132V80h60v52M248 80h68M248 76h68v4" class="art-line art-fine" />
      <path d={hatch(rect(248, 76, 68, 4), 1.9)} class="art-hatch" />
      <path d={NEIGHBOUR_WINDOWS} class="art-line art-fine" />
    </g>
  );
}

function Flag(p: { x: number; y: number; ink: string }) {
  return (
    <g>
      <path d={`M${p.x} ${p.y}v-17`} class="art-line" />
      <path d={`M${p.x} ${p.y - 17}l15 3.5-15 3.5z`} style={{ fill: p.ink }} class="art-brand" />
    </g>
  );
}

/** Scaffolding over the building's box and a board on the pavement. */
function Scaffold(p: { box: [number, number, number, number] }) {
  const [x, y, w] = p.box;
  const cols = Math.max(3, Math.round(w / 34));
  const step = w / cols;
  const d: string[] = [];
  for (let i = 0; i <= cols; i++) d.push(`M${(x + i * step).toFixed(1)} 132V${y + 6}`);
  for (let ly = 132 - 22; ly > y + 6; ly -= 22) {
    d.push(`M${x - 2} ${ly}h${w + 4}`);
  }
  for (let i = 0; i < cols; i += 2) {
    d.push(`M${(x + i * step).toFixed(1)} 132L${(x + (i + 1) * step).toFixed(1)} ${132 - 22}`);
  }
  return (
    <g>
      <path d={d.join('')} class="art-line art-fine" />
      <path d={`M${x} ${y + 4}h${w}`} class="art-line" />
      <g transform={`translate(${Math.min(x + w + 6, 254)} 100)`}>
        <path d="M10 22v10M46 22v10" class="art-line" />
        <path d="M0 0h56v22H0z" class="art-paper" />
        <path d="M0 0h56v22H0zM3 3h50v16H3z" class="art-line art-fine" />
        <text x="28" y="14" text-anchor="middle" class="art-small">
          Opening soon
        </text>
      </g>
    </g>
  );
}

export const BranchArt = memo(function BranchArt(p: {
  exterior: string;
  brandInk: string;
  monogram: string;
  /** Ink of the bank whose flag flies (an acquired branch converting). */
  flagInk?: string;
  fitout?: boolean;
  ink?: string;
}) {
  const facade = FACADES[p.exterior] ?? FACADES.ext_storefront!;
  const brand: Brand = { ink: p.brandInk, monogram: p.monogram };
  const name = EQUIPMENT[p.exterior]?.name ?? 'Branch';
  return (
    <Vignette label={`${name} branch front${p.fitout ? ', under fit-out' : ''}`} ink={p.ink}>
      <Neighbours />
      {facade.draw(brand)}
      <Flag x={facade.flag[0]} y={facade.flag[1]} ink={p.flagInk ?? p.brandInk} />
      {p.fitout && <Scaffold box={facade.box} />}
    </Vignette>
  );
});
