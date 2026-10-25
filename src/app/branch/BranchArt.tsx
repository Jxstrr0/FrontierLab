// Branch hero vignette (ART_DIRECTION §3, "Branch exterior"): the exterior
// the player built, between two faint neighbours, dressed in the bank's house
// style (its name sign, lamps, planters and roof flag; houseStyleArt.tsx),
// with people passing on the pavement. A branch in fit-out wears scaffolding
// and an "Opening soon" board; an acquired branch still converting shows the
// old bank's name and colours. Also the live preview in Build branch
// (SCREENS §4) and New Game's house style picker.
import { memo } from 'preact/compat';
import { hatch, rect } from '../../art/engrave';
import { EQUIPMENT } from '../../data/equipment';
import { Vignette } from '../components/Vignette';
import type { Brand, Facade } from './facadeParts';
import { Columns, Deco } from './facadesGrand';
import { Brick, GlassFront, Storefront } from './facadesLow';
import { grow, Lamp, NameSign, Planter, StyleDoor, StyleFlag } from './houseStyleArt';
import { Standing } from '../components/isoPeople';
import type { HouseStyle } from '../../data/types';
import '../components/interior.css';
import './houseStyle.css';

/** One composition per exterior option (CONTENT §7 ids). */
const FACADES: Record<string, Facade> = {
  ext_storefront: {
    draw: Storefront,
    flag: [104, 50],
    box: [88, 50, 152, 82],
    anchors: {
      sign: { x: 100, y: 60, w: 120, h: 14 },
      lamps: {
        pts: [
          [189, 110],
          [224, 110],
        ],
      },
      planters: { xs: [108, 180], y: 132 },
      door: { x: 196, y: 103, w: 22, h: 29 },
    },
  },
  ext_brick: {
    draw: Brick,
    flag: [96, 36],
    box: [80, 36, 166, 96],
    anchors: {
      sign: { x: 131, y: 89.5, w: 58, h: 10 },
      lamps: {
        pts: [
          [90, 107],
          [230, 107],
        ],
      },
      planters: { xs: [137, 183], y: 132 },
      door: { x: 149, y: 104, w: 22, h: 28, arch: true },
    },
  },
  ext_glass: {
    draw: GlassFront,
    flag: [214, 16],
    box: [92, 16, 150, 116],
    anchors: {
      sign: { x: 104, y: 30, w: 112, h: 14 },
      lamps: {
        pts: [
          [141, 114],
          [179, 114],
        ],
      },
      planters: { xs: [134, 186], y: 132 },
      door: { x: 148, y: 106, w: 24, h: 26 },
    },
  },
  ext_columns: {
    draw: Columns,
    flag: [160, 26],
    box: [76, 26, 168, 106],
    anchors: {
      sign: { x: 98, y: 55, w: 124, h: 7 },
      lamps: {
        pts: [
          [81, 104],
          [239, 104],
        ],
        post: true,
      },
      planters: { xs: [70, 250], y: 132 },
      door: { x: 148, y: 80, w: 24, h: 33 },
    },
  },
  ext_deco: {
    draw: Deco,
    flag: [160, 10],
    box: [70, 10, 180, 122],
    anchors: {
      sign: { x: 120, y: 63, w: 80, h: 8 },
      lamps: {
        pts: [
          [140, 112],
          [180, 112],
        ],
      },
      planters: { xs: [126, 194], y: 132 },
      door: { x: 147, y: 105, w: 26, h: 27 },
    },
  },
};

/** Ground under each lamp post (the Classic Columns posts stand on the bottom step). */
const POST_GROUND = 124;

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

/** Two people strolling along the pavement, one each way. */
function Passersby() {
  const walk = (
    x: number,
    dx: number,
    secs: number,
    delay: number,
    hair: number,
    carry?: 'bag',
  ) => (
    <g transform={`translate(${x} 141) scale(1.25)`}>
      <g
        class="in-walk"
        style={{
          '--dx': `${dx}px`,
          '--dy': '0px',
          '--walk-s': `${secs}s`,
          animationDelay: `${delay}s`,
        }}
      >
        <g class="in-step">
          <Standing mood="guest" hair={hair} carry={carry} />
        </g>
      </g>
    </g>
  );
  return (
    <g>
      {walk(-12, 275, 30, 0, 3, 'bag')}
      {walk(334, -275, 36, -11, 8)}
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
  /** The name on the sign and the house style that dresses the front. */
  bankName: string;
  style: HouseStyle;
  /** Ink of the bank whose flag flies (an acquired branch converting). */
  flagInk?: string;
  fitout?: boolean;
  ink?: string;
}) {
  const facade = FACADES[p.exterior] ?? FACADES.ext_storefront!;
  const brand: Brand = { ink: p.brandInk, monogram: p.monogram };
  const name = EQUIPMENT[p.exterior]?.name ?? 'Branch';
  const a = facade.anchors;
  return (
    <Vignette
      label={`${name} branch front${p.fitout ? ', under fit-out' : ''}`}
      ink={p.ink}
      class="in-alive"
    >
      <Neighbours />
      {facade.draw(brand)}
      <NameSign style={p.style} a={a.sign} name={p.bankName} brand={brand} />
      <StyleDoor style={p.style} a={a.door} ink={p.brandInk} />
      {a.lamps.pts.map((pt, n) =>
        a.lamps.post ? (
          <Lamp style={p.style} at={pt} ground={POST_GROUND} n={n} />
        ) : (
          <g transform={grow(pt[0], pt[1])}>
            <Lamp style={p.style} at={pt} n={n} />
          </g>
        ),
      )}
      {a.planters.xs.map((x, n) => (
        <g transform={grow(x, a.planters.y)}>
          <Planter style={p.style} x={x} ground={a.planters.y} ink={p.brandInk} n={n} />
        </g>
      ))}
      <StyleFlag
        style={p.style}
        x={facade.flag[0]}
        y={facade.flag[1]}
        ink={p.flagInk ?? p.brandInk}
      />
      {p.fitout && <Scaffold box={facade.box} />}
      <Passersby />
    </Vignette>
  );
});
