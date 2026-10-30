// Save migration 31 → 32 (src/sim/save/migrateCurrencies.ts): the Currencies
// investment is gone, so an old save's positions are sold at their last rate,
// the company's into corporate cash and the founder's into personal cash, the
// `fx` record and its RNG streams are dropped, and the books still balance.
import { describe, expect, it } from 'vitest';
import { advanceWeeks } from '../../src/sim/engine';
import { postCash, postPnl } from '../../src/sim/ledger';
import { newGame } from '../../src/sim/newGame';
import { migrations } from '../../src/sim/save/migrations';
import type { GameState } from '../../src/sim/state';
import { identityGap } from '../helpers/mergers';

interface OldFx {
  level: Record<string, number>;
  history: Record<string, number[]>;
  positions: {
    company: Record<string, { units: number; cost: number }>;
    personal: Record<string, { units: number; cost: number }>;
  };
}

/** A schema-31 save from Calgary (home CA) holding US dollars and yen. */
function oldSave(): { s: GameState; fx: OldFx; companyValue: number; personalValue: number } {
  const s = newGame({ seed: 42, cityId: 'cal', bankName: 'Test Lab' });
  advanceWeeks(s, 2);
  // Levels: CA at 100, US up to 120 (rate 120), JP down to 80 (rate 80).
  const fx: OldFx = {
    level: { CA: 100, US: 120, JP: 80 },
    history: {},
    positions: {
      // Bought 240,000 of USD at 100 (2,400 units), now worth 288,000.
      company: { US: { units: 2_400, cost: 240_000 } },
      // Bought 50,000 of JPY at 100 (500 units), now worth 40,000.
      personal: { JP: { units: 500, cost: 50_000 } },
    },
  };
  // As the old trades did: the company paid out of corporate cash (investing),
  // the founder out of personal cash.
  postCash(s, -240_000, 'investing');
  s.personal.cash -= 50_000;
  // The old weekly step marked the company's gain to investment gains, so the
  // 48,000 the dollars have made is already in the books.
  postPnl(s, 'investmentGains', 48_000);
  (s as GameState & { fx: OldFx }).fx = fx;
  s.rng['fx'] = [1, 2, 3, 4];
  s.rng['fx:RU'] = [5, 6, 7, 8];
  return { s, fx, companyValue: 288_000, personalValue: 40_000 };
}

describe('save migration 31 → 32', () => {
  it('sells company and personal positions into cash and drops fx', () => {
    const { s, companyValue, personalValue } = oldSave();
    const companyCash = s.company.cash;
    const personalCash = s.personal.cash;
    const investing = s.ledger.cash.investing;
    migrations[31]!(s as never);
    expect('fx' in s).toBe(false);
    expect(s.company.cash).toBeCloseTo(companyCash + companyValue, 6);
    expect(s.ledger.cash.investing).toBeCloseTo(investing + companyValue, 6);
    expect(s.personal.cash).toBeCloseTo(personalCash + personalValue, 6);
    expect(s.rng['fx']).toBeUndefined();
    expect(s.rng['fx:RU']).toBeUndefined();
    expect(s.rng['macro:RU']).toBeDefined();
    expect(identityGap(s)).toBeLessThan(1);
  });

  it('leaves a save with no positions alone, apart from the record itself', () => {
    const { s } = oldSave();
    const old = s as GameState & { fx: OldFx };
    old.fx.positions = { company: {}, personal: {} };
    const companyCash = s.company.cash;
    const personalCash = s.personal.cash;
    migrations[31]!(s as never);
    expect('fx' in s).toBe(false);
    expect(s.company.cash).toBe(companyCash);
    expect(s.personal.cash).toBe(personalCash);
  });

  it('copes with a save that never had the record', () => {
    const s = newGame({ seed: 42, cityId: 'cal', bankName: 'Test Lab' });
    const cash = s.company.cash;
    migrations[31]!(s as never);
    expect(s.company.cash).toBe(cash);
    expect(identityGap(s)).toBeLessThan(1);
  });
});
