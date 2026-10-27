// Customer businesses (stage C5a, SIMULATION §11.0, archive/CONVERSION_PLAN §3.3): when
// a city is generated, part of its spare storefronts become named businesses
// that hold their lot for good, and its employers become anchor accounts. Each
// has a sector, size, pentagon and yearly AI budget; some start with a rival
// lab's contract. Contracts and the renewal season are in contracts.ts (C5b).
// Seeding draws from the city's own `businesses:{cityId}` stream, so a city's
// businesses are the same whenever it is first visited.
import { BUSINESS, SECTOR_DISTRICT_WEIGHT } from '../config/balance';
import { CITIES } from '../data/cities';
import {
  ANCHOR_SECTOR,
  BUSINESS_NAME_PREFIXES,
  DEAL_SECTORS,
  DEAL_SECTOR_BY_ID,
  type DealSectorSpec,
} from '../data/dealSectors';
import type { Pentagon } from '../data/types';
import { quarterStartWeek } from './calendar';
import { clamp } from './math';
import { listLevel } from './nominal';
import { stream, type Rng } from './rng';
import type { Business, BusinessSize, GameState, Lot, Site } from './state';

const SIZES = ['small', 'mid', 'large'] as const;

/** The sector spec of a business (anchors use ANCHOR_SECTOR). */
export function sectorOf(b: Business): DealSectorSpec {
  return b.sector === ANCHOR_SECTOR.id
    ? ANCHOR_SECTOR
    : (DEAL_SECTOR_BY_ID[b.sector] ?? ANCHOR_SECTOR);
}

/** Every business in a city, in id order. */
export function businessesIn(state: GameState, cityId: string): Business[] {
  return Object.values(state.businesses)
    .filter((b) => b.cityId === cityId)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** The anchor account at an employer site, if any. */
export function businessAtSite(state: GameState, siteId: string): Business | undefined {
  return Object.values(state.businesses).find((b) => b.siteId === siteId);
}

/** Rival labs with an open office in the city, weighted by office size (bigger offices win more). */
export function rivalsIn(state: GameState, cityId: string): { item: string; weight: number }[] {
  const out: { item: string; weight: number }[] = [];
  for (const bank of Object.values(state.rivals).sort((a, b) => (a.id < b.id ? -1 : 1))) {
    if (bank.status !== 'active') continue;
    const office = bank.branches.find((br) => br.cityId === cityId);
    if (office) out.push({ item: bank.id, weight: office.size + 1 });
  }
  return out;
}

function rollPentagon(rng: Rng, sector: DealSectorSpec, size: BusinessSize): Pentagon {
  const spec = BUSINESS.sizes[size];
  const p = sector.profile.map((v) =>
    clamp(Math.round(rng.normal(v, BUSINESS.pentagonSigma)), 1, 10),
  ) as Pentagon;
  p[1] = clamp(p[1] + spec.budgetPip, 1, 10);
  p[3] = clamp(p[3] + spec.switchPip, 1, 10);
  return p;
}

/** A name not yet used in the city; falls back to a numbered one. */
function uniqueName(rng: Rng, words: string[], used: Set<string>): string {
  let name = '';
  for (let i = 0; i < BUSINESS.nameTries; i++) {
    name = `${rng.pick(BUSINESS_NAME_PREFIXES)} ${rng.pick(words)}`;
    if (!used.has(name)) break;
  }
  for (let n = 2; used.has(name); n++) name = `${name.replace(/ \d+$/, '')} ${n}`;
  used.add(name);
  return name;
}

/**
 * Signs `b` with a rival lab: value budget × U(contractShare), renewing at the
 * U{quarters}-th quarter start from now.
 */
export function signRival(
  state: GameState,
  rng: Rng,
  b: Business,
  rivalId: string,
  quarters: readonly [number, number],
): void {
  b.vendor = { type: 'rival', id: rivalId };
  b.contractValue = Math.round((b.budget * rng.range(...BUSINESS.contractShare)) / 100) * 100;
  b.renewalWeek = quarterStartWeek(state.meta.startDate, state.clock.week, rng.int(...quarters));
  delete b.startWeek;
}

/** Signs a starting rival contract, renewing at one of the next `term` quarter starts. */
function maybeRivalContract(
  state: GameState,
  rng: Rng,
  b: Business,
  rivals: { item: string; weight: number }[],
  odds: number,
  preferred?: string,
): void {
  const pick = preferred && rivals.some((r) => r.item === preferred) ? preferred : undefined;
  if (rivals.length === 0 || !rng.chance(odds)) return;
  const id = pick ?? rng.pickWeighted(rivals);
  signRival(state, rng, b, id, [1, sectorOf(b).termQuarters[1]]);
}

/**
 * Spare storefronts in one district that become businesses: lotShare of them,
 * always leaving at least keepFreePerDistrict free for offices.
 */
export function businessLotCount(free: number): number {
  return Math.max(
    0,
    Math.min(Math.round(free * BUSINESS.lotShare), free - BUSINESS.keepFreePerDistrict),
  );
}

function newBusiness(
  state: GameState,
  cityId: string,
  n: number,
  fields: Pick<Business, 'name' | 'sector' | 'size' | 'pentagon' | 'budget'> &
    Partial<Pick<Business, 'lotId' | 'siteId'>>,
): Business {
  const b: Business = { id: `biz_${cityId}_${String(n).padStart(3, '0')}`, cityId, ...fields };
  state.businesses[b.id] = b;
  return b;
}

/** A storefront business's fields: sector by district, size by weight, budget by lot income. */
function rollLotBusiness(
  state: GameState,
  rng: Rng,
  lot: Lot,
  used: Set<string>,
): Pick<Business, 'name' | 'sector' | 'size' | 'pentagon' | 'budget'> {
  const city = CITIES[lot.cityId]!;
  const small = city.size === 'S' || city.size === 'M';
  const sector = rng.pickWeighted(
    DEAL_SECTORS.filter((s) => small || !s.smallCitiesOnly).map((s) => ({
      item: s,
      weight: s.districts.includes(lot.district)
        ? SECTOR_DISTRICT_WEIGHT.match
        : SECTOR_DISTRICT_WEIGHT.other,
    })),
  );
  const size = rng.pickWeighted(
    SIZES.map((item) => ({ item, weight: BUSINESS.sizes[item].weight })),
  );
  const budget =
    Math.round(
      (BUSINESS.sizes[size].budget *
        lot.incomeIndex *
        sector.budgetMult *
        rng.lognormal(1, BUSINESS.budgetSigma) *
        listLevel(state, lot.cityId)) /
        100,
    ) * 100;
  return {
    name: uniqueName(rng, sector.types, used),
    sector: sector.id,
    size,
    pentagon: rollPentagon(rng, sector, size),
    budget,
  };
}

function seedLotBusiness(
  state: GameState,
  rng: Rng,
  lot: Lot,
  n: number,
  used: Set<string>,
): Business {
  const b = newBusiness(state, lot.cityId, n, {
    ...rollLotBusiness(state, rng, lot, used),
    lotId: lot.id,
  });
  lot.occupant = { type: 'business', id: b.id };
  return b;
}

/**
 * A storefront business that failed (C5b): a new business moves into the same
 * storefront under the same id, with no AI vendor. Anchors don't fail.
 */
export function replaceBusiness(state: GameState, rng: Rng, b: Business): void {
  const lot = b.lotId ? state.world.lots[b.lotId] : undefined;
  if (!lot) return;
  const used = new Set(businessesIn(state, b.cityId).map((x) => x.name));
  const fresh = rollLotBusiness(state, rng, lot, used);
  for (const key of ['vendor', 'contractValue', 'renewalWeek', 'startWeek', 'quietUntil'] as const)
    delete b[key];
  Object.assign(b, fresh);
}

/** An employer becomes an anchor account: budget by headcount and pay. */
function seedAnchor(state: GameState, rng: Rng, site: Site, n: number): Business {
  const e = site.employer!;
  const budget =
    Math.round(
      (BUSINESS.sizes.anchor.budget *
        (e.employees / BUSINESS.anchorEmployeesRef) *
        e.incomeMult *
        rng.lognormal(1, BUSINESS.budgetSigma) *
        listLevel(state, site.cityId)) /
        100,
    ) * 100;
  return newBusiness(state, site.cityId, n, {
    name: e.name,
    sector: ANCHOR_SECTOR.id,
    size: 'anchor',
    pentagon: rollPentagon(rng, ANCHOR_SECTOR, 'anchor'),
    budget,
    siteId: site.id,
  });
}

/**
 * Seeds a newly generated city's businesses (worldGen, after rivals and
 * employers are placed) or an older save's city (migration 11 → 12).
 */
export function seedBusinesses(state: GameState, cityId: string): void {
  const city = CITIES[cityId];
  if (!city || city.regional) return;
  if (Object.values(state.businesses).some((b) => b.cityId === cityId)) return;
  const rng = stream(state, `businesses:${cityId}`);
  const rivals = rivalsIn(state, cityId);
  const used = new Set<string>();
  let n = 0;
  const free = Object.values(state.world.lots)
    .filter((l) => l.cityId === cityId && !l.occupant)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  // District by district (in a fixed order), a partial Fisher–Yates shuffle
  // picks which storefronts become businesses.
  for (const district of [...new Set(free.map((l) => l.district))].sort()) {
    const here = free.filter((l) => l.district === district);
    const count = businessLotCount(here.length);
    for (let i = 0; i < count; i++) {
      const j = rng.int(i, here.length - 1);
      [here[i], here[j]] = [here[j]!, here[i]!];
      const b = seedLotBusiness(state, rng, here[i]!, ++n, used);
      maybeRivalContract(state, rng, b, rivals, BUSINESS.rivalHeld);
    }
  }
  const employers = Object.values(state.world.sites)
    .filter((s) => s.cityId === cityId && s.kind === 'employer' && s.employer)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const site of employers) {
    const b = seedAnchor(state, rng, site, ++n);
    used.add(b.name);
    maybeRivalContract(
      state,
      rng,
      b,
      rivals,
      BUSINESS.anchorRivalHeld,
      site.employer!.partnerRivalId,
    );
  }
}
