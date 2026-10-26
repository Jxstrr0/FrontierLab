// Pure choices for the title cover, "Living skyline" (docs/COVER_SCREEN.md §4):
// which city to print, where the camera sits over it, how big the strip is
// and what screen readers hear. No DOM, so it's unit-tested.
import type { Camera } from '../../art/mapRenderer';
import type { Point } from '../../art/iso';
import {
  COVER_FLAG_REACH,
  COVER_PAN_PX,
  COVER_PAN_REFERENCE_WIDTH,
  COVER_SIGNATURE_LIFT,
  COVER_SIGNATURE_REACH,
} from '../../config/cover';
import { CITIES } from '../../data/cities';
import type { CoverMeta } from '../../sim/coverMeta';
import type { SaveMeta } from '../saves';

/** The city that opens with Saskatoon for a new install. */
const FIRST_CITY = 'sas';

export interface CoverChoice {
  cityId: string;
  /** A save exists (Continue is on offer). */
  returning: boolean;
  bankName?: string;
  brandInk?: string;
  /** The save card's record, when it has one: print that city with its flags. */
  cover?: CoverMeta;
}

export interface Size {
  width: number;
  height: number;
}

/**
 * The latest save's current city when its card remembers one; otherwise the
 * rotation city for this launch (`index` steps once per launch and wraps).
 */
export function pickCoverCity(
  meta: SaveMeta | null,
  index: number,
  cityIds: readonly string[],
): CoverChoice {
  const brand = meta ? { returning: true, bankName: meta.bankName, brandInk: meta.brandInk } : {};
  const cover = meta?.cover;
  if (cover && CITIES[cover.cityId])
    return { ...brand, returning: true, cityId: cover.cityId, cover };
  const known = cityIds.filter((id) => CITIES[id]);
  const i = Number.isInteger(index) && index >= 0 ? index : 0;
  const cityId = known.length ? known[i % known.length]! : FIRST_CITY;
  return { returning: false, ...brand, cityId };
}

/** The rotation index to store for the next launch. */
export const nextCoverIndex = (index: number, count: number): number =>
  count > 0 ? (index + 1) % count : 0;

/**
 * Where the camera aims: the financial district, pulled halfway toward the
 * signature landmark (lifted so its top shows) when that's close by.
 */
export function coverFocus(focus: Point, signature?: Point & { heightPx: number }): Point {
  if (!signature) return focus;
  const top = { x: signature.x, y: signature.y - signature.heightPx * COVER_SIGNATURE_LIFT };
  if (Math.hypot(top.x - focus.x, top.y - focus.y) > COVER_SIGNATURE_REACH) return focus;
  return { x: (focus.x + top.x) / 2, y: (focus.y + top.y) / 2 };
}

/**
 * A returning player's aim: the financial district and their nearest flag in
 * frame together (halfway between) when close, else centred on that flag.
 */
export function aimAtFlags(focus: Point, flags: readonly Point[]): Point {
  let best: Point | null = null;
  let bestD = Infinity;
  for (const f of flags) {
    const d = Math.hypot(f.x - focus.x, f.y - focus.y);
    if (d < bestD) [best, bestD] = [f, d];
  }
  if (!best) return focus;
  if (bestD > COVER_FLAG_REACH) return best;
  return { x: (focus.x + best.x) / 2, y: (focus.y + best.y) / 2 };
}

/**
 * The renderer camera for a strip `view` CSS px big at `zoom`, centred on
 * `focus` but kept inside the map; centred on the map along any axis where
 * the strip is wider than the map.
 */
export function coverCamera(world: Size, view: Size, zoom: number, focus: Point): Camera {
  const axis = (worldLen: number, viewLen: number, at: number) => {
    const span = viewLen / zoom;
    if (span >= worldLen) return (worldLen - span) / 2;
    return Math.min(worldLen - span, Math.max(0, at - span / 2));
  };
  return {
    x: axis(world.width, view.width, focus.x),
    y: axis(world.height, view.height, focus.y),
    zoom,
  };
}

/** How far the strip drifts each way for a panel this wide (CSS px). */
export const panDistance = (panelWidth: number): number =>
  Math.round((COVER_PAN_PX * panelWidth) / COVER_PAN_REFERENCE_WIDTH);

/** The strip: the panel plus the pan distance on both sides. */
export function stripSize(panel: Size): Size & { pan: number } {
  const pan = panDistance(panel.width);
  return { width: Math.ceil(panel.width + 2 * pan), height: Math.ceil(panel.height), pan };
}

/** The device pixel ratio to print at, lowered so the canvas stays under `maxPixels`. */
export function stripDpr(size: Size, dpr: number, maxPixels: number): number {
  const area = size.width * size.height;
  if (area <= 0) return 1;
  return Math.max(0.5, Math.min(dpr, Math.sqrt(maxPixels / area)));
}

const WORDS = [
  'no',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
];

/** The panel's accessible description (docs/COVER_SCREEN.md §6). */
export function coverLabel(cityId: string, flags: number): string {
  const city = CITIES[cityId];
  if (!city) return 'An engraved city map';
  const base = `An engraved map of ${city.name} printed in ${city.inkName.toLowerCase()}`;
  if (flags <= 0) return `${base}.`;
  const n = WORDS[flags] ?? String(flags);
  return `${base}, with your bank’s flags on ${n} ${flags === 1 ? 'rooftop' : 'rooftops'}.`;
}
