// Save migration 31 → 32 (owner's review B7, 2026-10-30): the Currencies
// investment is cut. Any position an old save still holds is sold at its last
// rate: the company's into corporate cash (an investing cash flow, so the
// balance identity holds) and the founder's into personal cash. Then the `fx`
// record and its RNG streams go.
import { CITIES } from '../../data/cities';
import { postCash } from '../ledger';
import type { GameState } from '../state';

/** The strength index every currency started at under the old schema. */
const OLD_FX_START_INDEX = 100;

interface OldFxPosition {
  units: number;
  cost: number;
}

interface OldFxState {
  level: Partial<Record<string, number>>;
  history?: Partial<Record<string, number[]>>;
  positions: {
    company: Partial<Record<string, OldFxPosition>>;
    personal: Partial<Record<string, OldFxPosition>>;
  };
}

type OldState = GameState & { fx?: OldFxState };

/** A position's value in home money: units × level[c] / level[home] × 100 (old §19.10). */
function positionValue(fx: OldFxState, home: string, country: string, pos: OldFxPosition): number {
  const homeLevel = fx.level[home] ?? OLD_FX_START_INDEX;
  const level = fx.level[country] ?? OLD_FX_START_INDEX;
  return pos.units * (level / homeLevel) * OLD_FX_START_INDEX;
}

export function migrateCurrencies(state: GameState): void {
  const s = state as OldState;
  const fx = s.fx;
  if (fx) {
    const home = CITIES[s.meta.homeCityId]?.country ?? 'CA';
    let company = 0;
    for (const [c, pos] of Object.entries(fx.positions?.company ?? {}))
      if (pos) company += positionValue(fx, home, c, pos);
    if (company !== 0) postCash(s, company, 'investing');
    let personal = 0;
    for (const [c, pos] of Object.entries(fx.positions?.personal ?? {}))
      if (pos) personal += positionValue(fx, home, c, pos);
    s.personal.cash += personal;
    delete s.fx;
  }
  for (const key of Object.keys(s.rng)) {
    if (key === 'fx' || key.startsWith('fx:')) delete s.rng[key];
  }
}
