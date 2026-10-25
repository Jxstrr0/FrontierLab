// What each local building style looks like (ART_DIRECTION §2.1,
// data/cityLooks.ts Vernacular): for every district, which fabric fills its
// tiles (a street-hugging row of houses, a suburban house, a styled tower or
// the district's classic building), plus the style's industry and tree.
// Purely visual tuning; the drawers live in styleRows / styleHouses /
// styleTowers / styleIndustry.
import type { Vernacular } from '../data/cityLooks';
import type { DistrictId } from '../data/types';
import type { TreeKind } from './flora';
import type { HouseKind } from './styleHouses';
import type { IndustryKind } from './styleIndustry';
import { ROWS } from './styleRowSpecs';
import type { RowSpec } from './styleRows';
import type { TowerKind } from './styleTowers';

export type Fabric =
  | { kind: 'row'; spec: RowSpec }
  | { kind: 'house'; house: HouseKind }
  | { kind: 'tower'; tower: TowerKind }
  /** The district's own default building (buildingsTall.ts / buildingsLow.ts). */
  | { kind: 'classic' }
  /** `a` with chance `p`, else `b` (picked per tile). */
  | { kind: 'mix'; a: Fabric; b: Fabric; p: number };

export interface StyleProfile {
  fabric: Partial<Record<DistrictId, Fabric>>;
  industry: IndustryKind;
  tree: TreeKind;
  /** Chance a midtown tile holds a small church with a spire. */
  spireChance: number;
}

const row = (spec: RowSpec): Fabric => ({ kind: 'row', spec });
const house = (h: HouseKind): Fabric => ({ kind: 'house', house: h });
const tower = (t: TowerKind): Fabric => ({ kind: 'tower', tower: t });
const CLASSIC: Fabric = { kind: 'classic' };

export const STYLE_PROFILES: Record<Vernacular, StyleProfile> = {
  prairie: {
    fabric: {
      midtown: row(ROWS.mainStreet),
      downtown: { kind: 'mix', a: tower('glass'), b: row(ROWS.commerce), p: 0.3 },
      suburbs: house('ranch'),
    },
    industry: 'elevator',
    tree: 'round',
    spireChance: 0,
  },
  glass: {
    fabric: {
      midtown: row(ROWS.condo),
      downtown: tower('podium'),
      suburbs: house('modern'),
      financial: tower('glass'),
    },
    industry: 'sawtooth',
    tree: 'conifer',
    spireChance: 0,
  },
  brick: {
    fabric: {
      midtown: row(ROWS.walkup),
      downtown: row(ROWS.loft),
      suburbs: house('porch'),
      financial: tower('stone'),
    },
    industry: 'sawtooth',
    tree: 'round',
    spireChance: 0.02,
  },
  painted: {
    fabric: {
      midtown: row(ROWS.bayRow),
      downtown: row(ROWS.bayTall),
      suburbs: house('bay'),
      financial: tower('glass'),
    },
    industry: 'sawtooth',
    tree: 'round',
    spireChance: 0,
  },
  coastal: {
    fabric: {
      midtown: row(ROWS.shingleHouse),
      downtown: tower('podium'),
      suburbs: house('shingle'),
      financial: tower('glass'),
    },
    industry: 'sawtooth',
    tree: 'conifer',
    spireChance: 0,
  },
  terrace: {
    fabric: {
      midtown: row(ROWS.terrace),
      downtown: tower('civic'),
      suburbs: house('semi'),
      financial: { kind: 'mix', a: tower('glass'), b: CLASSIC, p: 0.6 },
    },
    industry: 'sawtooth',
    tree: 'round',
    spireChance: 0.03,
  },
  mansard: {
    fabric: {
      midtown: row(ROWS.mansard),
      downtown: row(ROWS.mansard),
      suburbs: house('villa'),
      financial: tower('glass'),
    },
    industry: 'sawtooth',
    tree: 'round',
    spireChance: 0.02,
  },
  timber: {
    fabric: {
      midtown: row(ROWS.timberRow),
      downtown: { kind: 'mix', a: tower('glass'), b: row(ROWS.stoneGable), p: 0.3 },
      suburbs: house('timber'),
      financial: tower('glass'),
    },
    industry: 'sawtooth',
    tree: 'round',
    spireChance: 0.05,
  },
  canal: {
    fabric: {
      midtown: row(ROWS.canalRow),
      downtown: row(ROWS.canalTall),
      waterfront: row(ROWS.canalRow),
      suburbs: row(ROWS.canalSmall),
    },
    industry: 'sawtooth',
    tree: 'poplar',
    spireChance: 0.03,
  },
  alpine: {
    fabric: {
      midtown: row(ROWS.alpine),
      downtown: row({ ...ROWS.alpine, maxStoreys: 7 }),
      suburbs: house('chalet'),
      financial: tower('stone'),
    },
    industry: 'sawtooth',
    tree: 'conifer',
    spireChance: 0.03,
  },
  dense: {
    fabric: {
      midtown: { kind: 'mix', a: house('tiny'), b: tower('pencil'), p: 0.55 },
      downtown: { kind: 'mix', a: tower('pencil'), b: row(ROWS.denseBlock), p: 0.5 },
      suburbs: house('tiny'),
      financial: tower('glass'),
    },
    industry: 'sawtooth',
    tree: 'round',
    spireChance: 0,
  },
  colonial: {
    fabric: {
      midtown: row(ROWS.verandahRow),
      downtown: { kind: 'mix', a: tower('glass'), b: tower('civic'), p: 0.35 },
      suburbs: house('bungalow'),
      financial: tower('glass'),
    },
    industry: 'sawtooth',
    tree: 'round',
    spireChance: 0.02,
  },
  tropical: {
    fabric: {
      midtown: row(ROWS.shophouse),
      downtown: tower('slab'),
      waterfront: tower('slab'),
      suburbs: { kind: 'mix', a: tower('slab'), b: house('modern'), p: 0.5 },
      financial: tower('glass'),
    },
    industry: 'sawtooth',
    tree: 'palm',
    spireChance: 0,
  },
  outback: {
    fabric: {
      midtown: row(ROWS.outbackMain),
      downtown: row(ROWS.outbackMain),
      suburbs: house('homestead'),
    },
    industry: 'barrel',
    tree: 'scrub',
    spireChance: 0,
  },
};

/** The tree a style plants in its parks and yards. */
export function treeKindFor(style: Vernacular): TreeKind {
  return STYLE_PROFILES[style].tree;
}
