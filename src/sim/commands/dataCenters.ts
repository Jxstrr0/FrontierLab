// Data center commands (stage C2c, SIMULATION §9.9): build one on a free lot
// or at a regional energy site, upgrade a part, rename or close it.
import {
  BRANCH_NAME_MAX,
  CLOSE_RECOVERY,
  CLOSE_RENT_WEEKS,
  DATA_CENTER,
  EQUIPMENT_LIFE_WEEKS,
  FITOUT_LIFE_WEEKS,
} from '../../config/balance';
import { CITIES, isRegional } from '../../data/cities';
import {
  DC_PARTS,
  DC_SLOTS,
  DC_SLOT_NAMES,
  type DcBuild,
  type DcSlot,
} from '../../data/dataCenters';
import { assetBookValue } from '../balanceSheet';
import { hallWeeks } from '../dataCenters';
import { pushEvent } from '../events';
import { newId } from '../ids';
import { postCash, postPnl, spend } from '../ledger';
import { listPrice } from '../nominal';
import type { DataCenter, GameState } from '../state';
import { fail, money, ok, type CommandResult } from './result';

/** Where a data center goes: a free storefront lot, or a regional energy site. */
export type DcWhere = { lotId: string } | { siteId: string };

/** Today's price of a part in a city (§4.6 price list). */
export function partPrice(state: GameState, partId: string, cityId: string): number {
  return listPrice(state, DC_PARTS[partId]?.cost ?? 0, cityId);
}

function placeOf(state: GameState, where: DcWhere) {
  if ('lotId' in where) {
    const lot = state.world.lots[where.lotId];
    return lot ? { cityId: lot.cityId, label: lot.address } : undefined;
  }
  const site = state.world.sites[where.siteId];
  if (!site || site.kind !== 'employer' || !isRegional(site.cityId)) return undefined;
  return { cityId: site.cityId, label: site.employer?.name ?? site.address };
}

/** Itemized cost of a data center: its parts, the lease deposit and the first week's rent. */
export function dataCenterQuote(state: GameState, where: DcWhere, build: DcBuild) {
  const place = placeOf(state, where);
  const cityId = place?.cityId ?? '';
  const parts = DC_SLOTS.reduce((sum, slot) => sum + partPrice(state, build[slot], cityId), 0);
  let deposit = 0;
  let rent = 0;
  if ('lotId' in where) {
    const lot = state.world.lots[where.lotId];
    deposit = lot?.deposit ?? 0;
    rent = lot?.weeklyRent ?? 0;
  } else if (place) {
    rent = listPrice(state, DATA_CENTER.energySiteRent * (CITIES[cityId]?.costIndex ?? 1), cityId);
  }
  return { parts, deposit, rent, total: parts + deposit + rent, weeks: hallWeeks(build) };
}

/** Data centers at an energy site. */
export function dataCentersAtSite(state: GameState, siteId: string): DataCenter[] {
  return Object.values(state.dataCenters).filter((d) => d.siteId === siteId);
}

/** Why a data center can't be built there right now, or undefined if it can. */
export function dataCenterBlocker(
  state: GameState,
  where: DcWhere,
  build: DcBuild,
): string | undefined {
  const place = placeOf(state, where);
  if (!place) return 'That site no longer exists.';
  if ('lotId' in where && state.world.lots[where.lotId]!.occupant) {
    return 'This storefront is already taken.';
  }
  if (
    'siteId' in where &&
    dataCentersAtSite(state, where.siteId).length >= DATA_CENTER.perEnergySite
  ) {
    return `This energy site already holds ${DATA_CENTER.perEnergySite} data centers.`;
  }
  if (place.cityId !== state.world.currentCityId)
    return "You can only build in the city you're in.";
  for (const slot of DC_SLOTS) {
    if (DC_PARTS[build[slot]]?.slot !== slot) return `Pick a valid ${DC_SLOT_NAMES[slot]} option.`;
  }
  const tier = state.company.tier;
  if (tier === 'restricted' || tier === 'critical') {
    return `The regulator won't allow new builds at the ${tier} tier.`;
  }
  const quote = dataCenterQuote(state, where, build);
  if (state.company.cash < quote.total)
    return `Not enough cash: you need ${money(state, quote.total)}.`;
  return undefined;
}

/** "<City> Data Center", numbered when the name is taken. */
export function defaultDataCenterName(state: GameState, cityId: string): string {
  const base = `${CITIES[cityId]?.name ?? 'Remote'} Data Center`;
  const taken = new Set(Object.values(state.dataCenters).map((d) => d.name));
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base} ${n}`)) return `${base} ${n}`;
}

function addPartAsset(state: GameState, dc: DataCenter, slot: DcSlot): void {
  const cost = partPrice(state, dc.build[slot], dc.cityId);
  if (cost <= 0) return;
  state.company.fixedAssets.push({
    id: newId(state, 'fa'),
    // The hall is the building; power and cooling are plant.
    kind: slot === 'hall' ? 'fitout' : 'equipment',
    slot,
    cost,
    lifeWeeks: slot === 'hall' ? FITOUT_LIFE_WEEKS : EQUIPMENT_LIFE_WEEKS,
    ageWeeks: 0,
    ownerId: dc.id,
  });
  postCash(state, -cost, 'investing');
}

/** Builds a data center; it opens after its hall's fit-out (8–16 weeks, §9.9). */
export function buildDataCenter(
  state: GameState,
  args: { where: DcWhere; build: DcBuild; name?: string },
): CommandResult<{ dataCenterId: string }> {
  const blocker = dataCenterBlocker(state, args.where, args.build);
  if (blocker) return fail(blocker);
  const place = placeOf(state, args.where)!;
  const quote = dataCenterQuote(state, args.where, args.build);
  const id = newId(state, 'dc');
  const dc: DataCenter = {
    id,
    cityId: place.cityId,
    name: (args.name?.trim() || defaultDataCenterName(state, place.cityId)).slice(
      0,
      BRANCH_NAME_MAX,
    ),
    status: 'fitout',
    weeksLeft: quote.weeks,
    builtWeek: state.clock.week,
    build: { ...args.build },
    lease: { weeklyRent: quote.rent, deposit: quote.deposit },
  };
  if ('lotId' in args.where) {
    dc.lotId = args.where.lotId;
    state.world.lots[dc.lotId]!.occupant = { type: 'player', id };
  } else {
    dc.siteId = args.where.siteId;
  }
  state.dataCenters[id] = dc;
  for (const slot of DC_SLOTS) addPartAsset(state, dc, slot);
  postCash(state, -quote.deposit, 'investing');
  state.company.leaseDeposits += quote.deposit;
  spend(state, 'rent', quote.rent);
  pushEvent(
    state,
    'DATA_CENTER_STARTED',
    { dataCenterId: id, name: dc.name, city: dc.cityId, site: place.label, weeks: quote.weeks },
    2,
    id,
  );
  return ok({ dataCenterId: id });
}

/** Book value of one slot's part. */
function slotBook(state: GameState, dc: DataCenter, slot: DcSlot): number {
  return state.company.fixedAssets
    .filter((a) => a.ownerId === dc.id && a.slot === slot)
    .reduce((sum, a) => sum + assetBookValue(a), 0);
}

/** Why a part can't be swapped in, or undefined. Only a bigger or better part is allowed. */
export function dcUpgradeBlocker(
  state: GameState,
  dataCenterId: string,
  slot: DcSlot,
  partId: string,
): string | undefined {
  const dc = state.dataCenters[dataCenterId];
  if (!dc) return 'That data center no longer exists.';
  const part = DC_PARTS[partId];
  const now = DC_PARTS[dc.build[slot]];
  if (!part || part.slot !== slot || !now) return `Pick a valid ${DC_SLOT_NAMES[slot]} option.`;
  if (part.cost <= now.cost) return 'Pick a part better than the one fitted.';
  if (slot === 'hall' && dc.status === 'fitout') return 'Wait for the fit-out to finish.';
  const cost = partPrice(state, partId, dc.cityId);
  if (state.company.cash < cost) return `Not enough cash: you need ${money(state, cost)}.`;
  return undefined;
}

/**
 * Swaps in a better part (§9.9). The old part is written off. Power and
 * cooling take effect at once; a new GPU hall refits for
 * DATA_CENTER.upgradeWeeksShare of its build weeks, closed meanwhile.
 */
export function upgradeDataCenter(
  state: GameState,
  dataCenterId: string,
  slot: DcSlot,
  partId: string,
): CommandResult {
  const blocker = dcUpgradeBlocker(state, dataCenterId, slot, partId);
  if (blocker) return fail(blocker);
  const dc = state.dataCenters[dataCenterId]!;
  postPnl(state, 'depreciation', slotBook(state, dc, slot));
  state.company.fixedAssets = state.company.fixedAssets.filter(
    (a) => !(a.ownerId === dc.id && a.slot === slot),
  );
  dc.build[slot] = partId;
  addPartAsset(state, dc, slot);
  if (slot === 'hall') {
    dc.status = 'fitout';
    dc.weeksLeft = Math.ceil(hallWeeks(dc.build) * DATA_CENTER.upgradeWeeksShare);
  }
  pushEvent(
    state,
    'DATA_CENTER_UPGRADED',
    { dataCenterId: dc.id, name: dc.name, slot: DC_SLOT_NAMES[slot], part: DC_PARTS[partId]!.name },
    4,
    dc.id,
  );
  return ok();
}

export function renameDataCenter(
  state: GameState,
  dataCenterId: string,
  name: string,
): CommandResult {
  const dc = state.dataCenters[dataCenterId];
  const clean = name.trim().slice(0, BRANCH_NAME_MAX);
  if (!dc) return fail('That data center no longer exists.');
  if (!clean) return fail('Give it a name.');
  dc.name = clean;
  return ok();
}

/** What closing a data center returns: part of its equipment's book value and the deposit less rent. */
export function closeDataCenterQuote(state: GameState, dataCenterId: string) {
  const dc = state.dataCenters[dataCenterId];
  if (!dc) return undefined;
  const book = state.company.fixedAssets
    .filter((a) => a.ownerId === dc.id)
    .reduce((sum, a) => sum + assetBookValue(a), 0);
  const recovery = book * CLOSE_RECOVERY;
  const forfeit = Math.min(dc.lease.deposit, dc.lease.weeklyRent * CLOSE_RENT_WEEKS);
  return { book, recovery, forfeit, cashBack: recovery + dc.lease.deposit - forfeit };
}

/** Closes a data center: equipment sold at CLOSE_RECOVERY of book, the rest written off (as a sales office). */
export function closeDataCenter(state: GameState, dataCenterId: string): CommandResult {
  const dc = state.dataCenters[dataCenterId];
  const quote = closeDataCenterQuote(state, dataCenterId);
  if (!dc || !quote) return fail('That data center no longer exists.');
  state.company.fixedAssets = state.company.fixedAssets.filter((a) => a.ownerId !== dc.id);
  postCash(state, quote.recovery, 'investing');
  postPnl(state, 'depreciation', quote.book - quote.recovery);
  state.company.leaseDeposits -= dc.lease.deposit;
  postCash(state, dc.lease.deposit, 'investing');
  spend(state, 'rent', quote.forfeit);
  const lot = dc.lotId ? state.world.lots[dc.lotId] : undefined;
  if (lot?.occupant?.id === dc.id) delete lot.occupant;
  delete state.dataCenters[dc.id];
  pushEvent(
    state,
    'DATA_CENTER_CLOSED',
    { dataCenterId: dc.id, name: dc.name, city: dc.cityId },
    3,
  );
  return ok();
}
