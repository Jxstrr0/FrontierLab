// Prints the title cover's city strip (docs/COVER_SCREEN.md §4.3), loaded as its
// own chunk so world generation and the renderer stay off the title's first
// paint. Builds the city the way the map lab does, renders one wide strip at a
// fixed zoom into a canvas, frame by frame until every chunk is painted, then
// disposes the renderer. The panel pans that canvas with CSS; nothing redraws.
import { generateCityMap, type CityMap } from '../../art/citygen';
import { tileCenter, worldSize } from '../../art/iso';
import { createMapRenderer } from '../../art/isoRenderer';
import type { LotOccupant } from '../../art/mapRenderer';
import {
  COVER_MAX_FRAMES,
  COVER_MAX_PIXELS,
  COVER_NEW_PLAYER_SEED,
  COVER_SHOWCASE_FLAGS,
  COVER_SHOWCASE_INK,
  COVER_ZOOM,
} from '../../config/cover';
import { SIGNATURE_HEIGHT_PX } from '../../config/map';
import { CITIES, isRegional } from '../../data/cities';
import { coverWorld } from '../../sim/coverWorld';
import { newGame } from '../../sim/newGame';
import type { GameState, Lot } from '../../sim/state';
import { mapPlaces, paperColour } from '../map/mapScene';
import {
  aimAtFlags,
  coverCamera,
  coverFocus,
  stripDpr,
  stripSize,
  type CoverChoice,
  type Size,
} from './coverCity';

export interface PrintedCover {
  canvas: HTMLCanvasElement;
  /** The strip in CSS px, and how far it pans each way. */
  width: number;
  height: number;
  pan: number;
  /** Your flags that made it onto the map (0 for a new player's showcase). */
  flags: number;
}

const nextFrame = () => new Promise<void>((done) => requestAnimationFrame(() => done()));

/** Every energy site on the map draws its substation yard, as on the live map (C8c). */
function energyYards(map: CityMap): Record<string, LotOccupant> {
  const yards: Record<string, LotOccupant> = {};
  for (const site of map.siteAt.values()) {
    if (site.kind === 'employer' && isRegional(map.cityId))
      yards[site.id] = { type: 'site', ink: '', building: 'energySite' };
  }
  return yards;
}

/** The saved game's flags and rival flags, for ids the rebuilt map has. */
function savedOccupants(choice: CoverChoice, map: CityMap) {
  const cover = choice.cover!;
  const sites = [...map.siteAt.values()].map((x) => x.id);
  const known = new Set([...map.lotAt.values(), ...map.officeAt.values(), ...sites]);
  const halls = new Set(cover.dataCenters ?? []);
  const occupants = energyYards(map);
  for (const [lotId, ink] of Object.entries(cover.rivals)) {
    if (known.has(lotId)) occupants[lotId] = { type: 'rival', ink };
  }
  let flags = 0;
  for (const id of cover.flags) {
    if (!known.has(id)) continue;
    const ink = choice.brandInk ?? COVER_SHOWCASE_INK;
    // Your data centers stand as low halls, not storefronts.
    occupants[id] = halls.has(id)
      ? { type: 'player', ink, building: 'dataCenter' }
      : { type: 'player', ink };
    flags += 1;
  }
  return { occupants, flags };
}

/** Where each of your flags stands on the map (world px). */
function flagPoints(map: CityMap, occupants: Record<string, LotOccupant>) {
  const points = [];
  const siteIds = new Map([...map.siteAt].map(([i, x]) => [i, x.id]));
  for (const at of [map.lotAt, map.officeAt, siteIds]) {
    for (const [index, id] of at) {
      if (occupants[id]?.type !== 'player') continue;
      points.push(tileCenter(map.tiles, index % map.tiles, Math.floor(index / map.tiles)));
    }
  }
  return points;
}

/** A new player's cover: the city's rivals plus a few showcase flags near the financial district. */
function showcaseOccupants(state: GameState, lots: Lot[], map: CityMap) {
  const occupants = energyYards(map);
  for (const lot of lots) {
    if (lot.occupant?.type === 'rival') {
      const ink = state.rivals[lot.occupant.id]?.ink;
      if (ink) occupants[lot.id] = { type: 'rival', ink };
    }
  }
  const f = map.geo.focus;
  lots
    .filter((l) => !l.occupant)
    .sort(
      (a, b) =>
        Math.hypot(a.tile.x - f.x, a.tile.y - f.y) - Math.hypot(b.tile.x - f.x, b.tile.y - f.y),
    )
    .slice(0, COVER_SHOWCASE_FLAGS)
    .forEach((l) => (occupants[l.id] = { type: 'player', ink: COVER_SHOWCASE_INK }));
  return { occupants, flags: 0 };
}

/**
 * Prints the chosen city into a canvas the size of the strip for `panel`.
 * Resolves null if `cancelled()` turns true first (the title was left).
 * Throws on bad data; the panel then keeps its empty paper.
 */
export async function printCover(
  choice: CoverChoice,
  panel: Size,
  dpr: number,
  cancelled: () => boolean,
): Promise<PrintedCover | null> {
  const city = CITIES[choice.cityId];
  if (!city) throw new Error(`Unknown city ${choice.cityId}`);
  const state = choice.cover
    ? coverWorld(choice.cover)
    : newGame({ seed: COVER_NEW_PLAYER_SEED, cityId: city.id });
  const lots = Object.values(state.world.lots).filter((l) => l.cityId === city.id);
  const map = generateCityMap(city, state.meta.seed, lots, mapPlaces(state, city.id));
  const { occupants, flags } = choice.cover
    ? savedOccupants(choice, map)
    : showcaseOccupants(state, lots, map);

  const strip = stripSize(panel);
  const ratio = stripDpr(strip, dpr, COVER_MAX_PIXELS);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(strip.width * ratio);
  canvas.height = Math.round(strip.height * ratio);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2D canvas');

  // A returning player's flags come first; otherwise the signature landmark.
  const district = tileCenter(map.tiles, map.geo.focus.x, map.geo.focus.y);
  const sig = map.landmarks.find((l) => l.id === 'signature');
  const focus =
    flags > 0
      ? aimAtFlags(district, flagPoints(map, occupants))
      : coverFocus(
          district,
          sig && {
            ...tileCenter(map.tiles, sig.x + sig.size / 2, sig.y + sig.size / 2),
            heightPx: SIGNATURE_HEIGHT_PX[sig.signature ?? 'none'],
          },
        );
  const camera = coverCamera(worldSize(map.tiles), strip, COVER_ZOOM, focus);
  const view = { width: strip.width, height: strip.height, devicePixelRatio: ratio };

  const renderer = createMapRenderer(map, {
    ink: city.ink,
    paper: paperColour(),
    cityName: city.name,
  });
  try {
    renderer.setOccupants(occupants);
    for (let frame = 0; renderer.render(ctx, camera, view) && frame < COVER_MAX_FRAMES; frame++) {
      await nextFrame();
      if (cancelled()) {
        canvas.width = 0;
        canvas.height = 0;
        return null;
      }
    }
  } finally {
    renderer.dispose();
  }
  return { canvas, width: strip.width, height: strip.height, pan: strip.pan, flags };
}
