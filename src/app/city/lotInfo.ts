// Read-only helpers that turn a Lot into the words and numbers the city list and
// the storefront panel show. Nothing here changes game state.
import { RIVAL_RADIUS } from '../../config/balance';
import { DISTRICT_SPECS } from '../../data/districts';
import { SEGMENT_SPECS } from '../../data/segments';
import { SEGMENTS, type SegmentId } from '../../data/types';
import { cityReach } from '../../sim/branch/cityMarket';
import { officeInCity } from '../../sim/branch/officeSize';
import { tileDistance } from '../../sim/citygen';
import type { GameState, Lot } from '../../sim/state';

// Wording thresholds for the UI only (not simulation numbers). Traffic and rent
// are judged against the median storefront of the current city.
const HEAVY_ABOVE = 1.2;
const LIGHT_BELOW = 0.8;
const STEEP_ABOVE = 1.2;
const CHEAP_BELOW = 0.8;
/** A segment must hold at least this share of the lot's mix to get a hint. */
const HINT_MIN_SHARE = 0.3;
/** Income index bands for the Low / Mid / High label. */
const INCOME_LOW_BELOW = 0.85;
const INCOME_HIGH_ABOVE = 1.15;

export const districtName = (lot: Lot): string =>
  DISTRICT_SPECS[lot.district]?.name ?? lot.district;

/** Storefronts in the city the player is in. */
export function cityLots(s: GameState): Lot[] {
  return Object.values(s.world.lots).filter((l) => l.cityId === s.world.currentCityId);
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function average(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
}

export type Level = 'high' | 'mid' | 'low';

export function trafficLevel(lot: Lot, medianTraffic: number): Level {
  const r = medianTraffic > 0 ? lot.footTraffic / medianTraffic : 1;
  return r >= HEAVY_ABOVE ? 'high' : r <= LIGHT_BELOW ? 'low' : 'mid';
}

export function rentLevel(lot: Lot, medianRent: number): Level {
  const r = medianRent > 0 ? lot.weeklyRent / medianRent : 1;
  return r >= STEEP_ABOVE ? 'high' : r <= CHEAP_BELOW ? 'low' : 'mid';
}

export function incomeLabel(index: number): 'Low' | 'Mid' | 'High' {
  return index < INCOME_LOW_BELOW ? 'Low' : index > INCOME_HIGH_ABOVE ? 'High' : 'Mid';
}

const SEGMENT_HINT: Record<SegmentId, string> = {
  STU: 'lots of students nearby',
  YP: 'plenty of developers nearby',
  FAM: 'lots of consumers nearby',
  RET: 'lots of researchers nearby',
  BIZ: 'lots of small shops nearby',
};

/** The advisor's line for a storefront (CONTENT §25), built from the numbers. */
export function storefrontAdvice(lot: Lot, lots: Lot[]): string {
  const traffic = trafficLevel(lot, median(lots.map((l) => l.footTraffic)));
  const rent = rentLevel(lot, median(lots.map((l) => l.weeklyRent)));
  const trafficText = { high: 'heavy', mid: 'steady', low: 'light' }[traffic];
  const rentText = { high: 'steep', mid: 'fair', low: 'cheap' }[rent];
  // "But" when the news is mixed (heavy traffic and steep rent, or light and cheap).
  const mixed = (traffic === 'high' && rent === 'high') || (traffic === 'low' && rent === 'low');
  const joiner = mixed ? 'but' : 'and';
  let line = `Foot traffic is ${trafficText} here, ${joiner} the rent's ${rentText}.`;
  const top = dominantSegment(lot);
  if (top) line += ` ${SEGMENT_HINT[top][0]!.toUpperCase()}${SEGMENT_HINT[top].slice(1)}.`;
  return line;
}

function dominantSegment(lot: Lot): SegmentId | undefined {
  let best: SegmentId | undefined;
  for (const id of SEGMENTS) if (!best || lot.mix[id] > lot.mix[best]) best = id;
  return best && lot.mix[best] >= HINT_MIN_SHARE ? best : undefined;
}

export const segmentName = (id: SegmentId): string => SEGMENT_SPECS[id].name;

/** Rival and own branches within RIVAL_RADIUS tiles of a lot (SIMULATION §9.3). */
export function nearbyCompetition(s: GameState, lot: Lot) {
  const rivalOveralls: number[] = [];
  const ownOveralls: number[] = [];
  for (const other of cityLots(s)) {
    if (other.id === lot.id || !other.occupant) continue;
    if (tileDistance(lot, other) > RIVAL_RADIUS) continue;
    if (other.occupant.type === 'rival') {
      const bank = s.rivals[other.occupant.id];
      const rb = bank?.branches.find((b) => b.lotId === other.id);
      if (rb) rivalOveralls.push(rb.overall);
    } else {
      const own = s.branches[other.occupant.id];
      if (own && own.status !== 'closed') ownOveralls.push(own.ratings.overall);
    }
  }
  return {
    radius: RIVAL_RADIUS,
    rivalCount: rivalOveralls.length,
    rivalAverage: average(rivalOveralls),
    ownCount: ownOveralls.length,
    ownAverage: average(ownOveralls),
  };
}

/**
 * How well your lab covers a city (SIMULATION §9.1–9.2): your sales office
 * there, if any (one per city since C2a), and the share of the city-wide
 * customer pool you already serve. `full` means a new office here is refused.
 */
export function cityCoverage(s: GameState, cityId: string) {
  const office = officeInCity(s, cityId);
  const ours = office ? 1 : 0;
  const reach = cityReach(s, cityId);
  return { office, ours, reach, full: ours > 0 };
}
