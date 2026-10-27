// Test setup for incidents: a Calgary game with one branch opened by hand, and
// the AI-side preconditions (a trained model, Creative Suite users, an open
// data center at an energy site) the AI-native cases need.
import { DEFAULT_DC_BUILD } from '../../src/data/dataCenters';
import { REFERENCE_BUILDS } from '../../src/data/equipment';
import { INCIDENT_PARAMS } from '../../src/data/incidentParams';
import { emptyBook } from '../../src/sim/branch/books';
import * as cmd from '../../src/sim/commands';
import { newGame } from '../../src/sim/newGame';
import type { Branch, DataCenter, GameState, UnderwritingModel } from '../../src/sim/state';
import { activeModel } from '../../src/sim/underwriting';
import { freeLot } from './scenario';

/** A Calgary game with one open mid branch (opened by hand for unit tests). */
export function openBank(district = 'midtown'): { s: GameState; b: Branch } {
  const s = newGame({ seed: 3, cityId: 'cal', bankName: 'Case Bank' });
  const r = cmd.buildBranch(s, { lotId: freeLot(s, district).id, build: REFERENCE_BUILDS.mid });
  if (!r.ok) throw new Error(r.reason);
  const b = s.branches[r.branchId]!;
  b.status = 'open';
  b.customers = 2_000;
  return { s, b };
}

/** A trained model generation built on the house model. */
export function addTrainedModel(s: GameState, id = 'm_test'): UnderwritingModel {
  const house = activeModel(s);
  const m: UnderwritingModel = {
    ...house,
    id,
    name: `${s.meta.bankName} ${s.training.generation + 1}`,
    source: 'trained',
    mix: { ...house.mix },
    radar: [...house.radar] as UnderwritingModel['radar'],
    lift: [0, 0, 0, 0, 0],
    generation: s.training.generation + 1,
    trainedWeek: s.clock.week,
  };
  s.underwriting.models[id] = m;
  s.training.generation += 1;
  return m;
}

/** An open data center, at an energy site when `energySite` (a fake site id is enough for the rules). */
export function addOpenDataCenter(s: GameState, energySite: boolean, id = 'dc_test'): DataCenter {
  const dc: DataCenter = {
    id,
    cityId: energySite ? 'fmm' : 'cal',
    name: energySite ? 'Fort McMurray Hall' : 'Calgary Data Center',
    status: 'open',
    weeksLeft: 0,
    builtWeek: 0,
    openedWeek: 0,
    build: { ...DEFAULT_DC_BUILD },
    lease: { weeklyRent: 0, deposit: 0 },
  };
  if (energySite) dc.siteId = 'site_energy_test';
  s.dataCenters[id] = dc;
  return dc;
}

/** Everything the AI-native rolled cases need to fire at `b`. */
export function aiReady(s: GameState, b: Branch): void {
  addTrainedModel(s);
  cmd.setOffered(s, b.id, INCIDENT_PARAMS.DEEPFAKE.product, true);
  const book = (b.books[INCIDENT_PARAMS.DEEPFAKE.product] ??= emptyBook());
  book.accounts = 200;
  book.balance = 200 * 15 * 12;
  addOpenDataCenter(s, true);
}
