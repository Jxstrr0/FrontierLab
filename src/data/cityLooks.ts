// Each city's look on the map (ART_DIRECTION §2.1): its water, how its
// districts are arranged, the local building style, its signature landmark
// and a second "tint" ink for the underprint. Purely what the city looks like;
// the economics live in cities.ts. Names here are generic descriptions of
// shapes, never real landmark or brand names.

/**
 * The shape of a city's water.
 * - none: landlocked
 * - coast: open sea or lake along one edge
 * - river: a river winding across the grid, crossed by bridges
 * - twinRivers: the city sits between two rivers that meet at the sea
 * - bay: a bay cutting in from one corner, with a peninsula
 * - lake: a wide lake along one edge with a river feeding it
 * - harbour: a harbour channel splitting the city into two shores
 * - canals: rings of canals around the centre, with a river mouth
 * - islands: a bay dotted with built-up islands and canals
 */
export type WaterForm =
  'none' | 'coast' | 'river' | 'twinRivers' | 'bay' | 'lake' | 'harbour' | 'canals' | 'islands';

/** Local building style: changes rooflines, materials and street details. */
export type Vernacular =
  | 'prairie' // low timber houses, wide lots, grain elevators
  | 'glass' // glass towers and podiums, condo slabs
  | 'brick' // brick walk-ups, fire escapes, outside stairs
  | 'painted' // bay-windowed painted rowhouses on steep streets
  | 'coastal' // shingled houses, evergreen trees
  | 'terrace' // brick terraces with chimney stacks, stone civic blocks
  | 'mansard' // cream stone blocks with zinc mansard roofs, even cornices
  | 'timber' // half-timbered old town with steep roofs beside glass towers
  | 'canal' // narrow tall gabled canal houses
  | 'alpine' // steep roofs, shutters, church spires
  | 'dense' // tight small houses, pencil towers, rooftop tanks
  | 'colonial' // verandah houses, sandstone, terracotta roofs
  | 'tropical' // white slab towers, shophouses, palms
  | 'outback'; // corrugated sheds, water tanks, sparse

/** A city's one-of-a-kind landmark (drawn over a whole block). */
export type Signature =
  | 'chateauHotel' // a turreted riverside hotel with a copper roof
  | 'needleTower' // a slim concrete tower with a round lookout
  | 'sailCanopy' // a pier hall roofed with white sails
  | 'broadcastTower' // a very tall concrete tower with a pod and mast
  | 'domedBasilica' // a great domed church on a hillside
  | 'decoSpire' // a stepped art-deco skyscraper with a spire
  | 'twinAntenna' // a black tower with two rooftop masts
  | 'suspensionBridge' // two tall bridge towers with sweeping cables
  | 'saucerTower' // a tower crowned with a flying-saucer deck
  | 'observationWheel' // a giant wheel beside the water
  | 'latticeTower' // a tall iron lattice tower on four legs
  | 'steppedGables' // an old town hall row with stepped gables
  | 'grandStation' // a long gabled station hall with twin towers
  | 'twinSpires' // a minster with two spires
  | 'latticeMast' // a red-and-white lattice mast
  | 'shellHall' // a harbour hall roofed with white shells
  | 'skyDeck' // three towers joined by a deck on top
  | 'prismTower' // an angular tower of stacked triangles
  | 'none';

export interface CityLook {
  water: WaterForm;
  /**
   * The district arrangement: the default centres turned this many quarter
   * turns around the middle of the grid, then mirrored left-right if set.
   */
  arrange: { turn: 0 | 1 | 2 | 3; mirror: boolean };
  style: Vernacular;
  signature: Signature;
  /** The second ink (underprint wash) for roofs, parks and water. */
  tint: string;
  /** Skyline height: multiplies the financial and downtown storeys. */
  skyline: number;
  /** A large park covering several blocks near the centre. */
  bigPark?: boolean;
}

const look = (l: CityLook) => l;

export const CITY_LOOKS: Record<string, CityLook> = {
  sas: look({
    water: 'river',
    arrange: { turn: 0, mirror: false },
    style: 'prairie',
    signature: 'chateauHotel',
    tint: '#C9A962',
    skyline: 0.7,
  }),
  cal: look({
    water: 'river',
    arrange: { turn: 1, mirror: false },
    style: 'prairie',
    signature: 'needleTower',
    tint: '#A9B57A',
    skyline: 0.95,
  }),
  van: look({
    water: 'harbour',
    arrange: { turn: 2, mirror: true },
    style: 'glass',
    signature: 'sailCanopy',
    tint: '#8FB3D1',
    skyline: 1,
  }),
  tor: look({
    water: 'lake',
    arrange: { turn: 0, mirror: true },
    style: 'glass',
    signature: 'broadcastTower',
    tint: '#86BCC6',
    skyline: 1.15,
  }),
  mtl: look({
    water: 'river',
    arrange: { turn: 3, mirror: false },
    style: 'brick',
    signature: 'domedBasilica',
    tint: '#D1A0AA',
    skyline: 0.9,
    bigPark: true,
  }),
  nyc: look({
    water: 'twinRivers',
    arrange: { turn: 0, mirror: false },
    style: 'brick',
    signature: 'decoSpire',
    tint: '#8DBBA6',
    skyline: 1.35,
    bigPark: true,
  }),
  chi: look({
    water: 'lake',
    arrange: { turn: 3, mirror: true },
    style: 'brick',
    signature: 'twinAntenna',
    tint: '#9DB4C8',
    skyline: 1.25,
  }),
  sfo: look({
    water: 'bay',
    arrange: { turn: 1, mirror: true },
    style: 'painted',
    signature: 'suspensionBridge',
    tint: '#B7AFCB',
    skyline: 1,
  }),
  sea: look({
    water: 'coast',
    arrange: { turn: 2, mirror: false },
    style: 'coastal',
    signature: 'saucerTower',
    tint: '#93B89D',
    skyline: 1,
  }),
  lon: look({
    water: 'river',
    arrange: { turn: 2, mirror: false },
    style: 'terrace',
    signature: 'observationWheel',
    tint: '#B49ABF',
    skyline: 1.05,
  }),
  par: look({
    water: 'river',
    arrange: { turn: 1, mirror: false },
    style: 'mansard',
    signature: 'latticeTower',
    tint: '#D7A5B2',
    skyline: 0.75,
  }),
  fra: look({
    water: 'river',
    arrange: { turn: 0, mirror: true },
    style: 'timber',
    signature: 'steppedGables',
    tint: '#A3C1B6',
    skyline: 1.15,
  }),
  ams: look({
    water: 'canals',
    arrange: { turn: 3, mirror: false },
    style: 'canal',
    signature: 'grandStation',
    tint: '#93B4CF',
    skyline: 0.7,
  }),
  zur: look({
    water: 'lake',
    arrange: { turn: 2, mirror: true },
    style: 'alpine',
    signature: 'twinSpires',
    tint: '#A7B3C2',
    skyline: 0.8,
  }),
  tyo: look({
    water: 'islands',
    arrange: { turn: 1, mirror: false },
    style: 'dense',
    signature: 'latticeMast',
    tint: '#97A3D1',
    skyline: 1.2,
  }),
  syd: look({
    water: 'harbour',
    arrange: { turn: 3, mirror: true },
    style: 'colonial',
    signature: 'shellHall',
    tint: '#E0A894',
    skyline: 1.05,
  }),
  sin: look({
    water: 'bay',
    arrange: { turn: 2, mirror: false },
    style: 'tropical',
    signature: 'skyDeck',
    tint: '#C3A0CC',
    skyline: 1.2,
  }),
  hkg: look({
    water: 'harbour',
    arrange: { turn: 0, mirror: false },
    style: 'glass',
    signature: 'prismTower',
    tint: '#8FC7B8',
    skyline: 1.45,
  }),
  fmm: look({
    water: 'none',
    arrange: { turn: 0, mirror: false },
    style: 'prairie',
    signature: 'none',
    tint: '#B8A27E',
    skyline: 1,
  }),
  plb: look({
    water: 'coast',
    arrange: { turn: 0, mirror: false },
    style: 'outback',
    signature: 'none',
    tint: '#D49577',
    skyline: 1,
  }),
  mid: look({
    water: 'none',
    arrange: { turn: 0, mirror: false },
    style: 'outback',
    signature: 'none',
    tint: '#CDB38A',
    skyline: 1,
  }),
};

/** A city's look; unknown ids get a plain coastal look. */
export function cityLook(cityId: string): CityLook {
  return (
    CITY_LOOKS[cityId] ?? {
      water: 'coast',
      arrange: { turn: 0, mirror: false },
      style: 'glass',
      signature: 'none',
      tint: '#B8C4B4',
      skyline: 1,
    }
  );
}
