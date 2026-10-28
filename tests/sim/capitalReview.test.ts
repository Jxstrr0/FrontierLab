// The board's capital review (SIMULATION §19.6b): raised at a year start when
// surplus cash clears the bar; each answer moves cash, shares or a project and
// a listed lab's sentiment, and the balance identity holds throughout.
import { describe, expect, it } from 'vitest';
import { BOARD_CAPITAL } from '../../src/config/balance';
import { INCIDENT_SPECS } from '../../src/data/incidents';
import { companyArr } from '../../src/sim/arr';
import { resolveIncident } from '../../src/sim/commands';
import { boardCapitalReview, capitalSurplus } from '../../src/sim/incident/capitalReview';
import { optionBlocker } from '../../src/sim/incidents';
import { FOUNDER_ID, sharesHeld } from '../../src/sim/shares';
import type { GameState, Incident } from '../../src/sim/state';
import { identityGap, publicBank } from '../helpers/markets';

const review = (s: GameState): Incident | undefined =>
  s.incidents.active.find((i) => i.type === 'CAPITAL_REVIEW');

/** A listed lab holding `surplus` over the board's reserve (owner's capital, so books balance). */
function richLab(surplus = 1_000_000_000): GameState {
  const s = publicBank();
  const add = surplus - capitalSurplus(s);
  s.company.cash += add;
  s.company.paidInCapital += add;
  return s;
}

describe('the capital review', () => {
  it('measures surplus as cash − reserveArrShare × ARR', () => {
    const s = publicBank();
    expect(capitalSurplus(s)).toBeCloseTo(
      s.company.cash - BOARD_CAPITAL.reserveArrShare * companyArr(s),
    );
  });

  it('stays quiet under minSurplus and asks above it', () => {
    const s = richLab(BOARD_CAPITAL.minSurplus / 2);
    boardCapitalReview(s);
    expect(review(s)).toBeUndefined();
    const t = richLab();
    boardCapitalReview(t);
    const inc = review(t)!;
    expect(inc.data.amount).toBe(Math.round(1_000_000_000 * BOARD_CAPITAL.deployShare));
    expect(INCIDENT_SPECS.CAPITAL_REVIEW!.worst).toBe('bank');
    expect(INCIDENT_SPECS.CAPITAL_REVIEW!.yours).toBe(true);
  });

  it('pays a special dividend at once, the founder taking their share', () => {
    const s = richLab();
    boardCapitalReview(s);
    const inc = review(s)!;
    const amount = Number(inc.data.amount);
    const cash = s.company.cash;
    const re = s.company.retainedEarnings;
    const personal = s.personal.cash;
    const stake = sharesHeld(s, FOUNDER_ID) / s.company.sharesOutstanding;
    const sentiment = s.stock.sentiment;
    expect(resolveIncident(s, inc.id, 'dividend').ok).toBe(true);
    expect(cash - s.company.cash).toBeCloseTo(amount);
    expect(re - s.company.retainedEarnings).toBeCloseTo(amount);
    expect(s.personal.cash - personal).toBeCloseTo(amount * stake);
    expect(s.stock.sentiment).toBeGreaterThan(sentiment);
    expect(identityGap(s)).toBeLessThan(1);
  });

  it('buys back shares from the public', () => {
    const s = richLab();
    boardCapitalReview(s);
    const inc = review(s)!;
    const out = s.company.sharesOutstanding;
    expect(optionBlocker(s, inc, 'buyback')).toBeUndefined();
    expect(resolveIncident(s, inc.id, 'buyback').ok).toBe(true);
    expect(s.company.sharesOutstanding).toBeLessThan(out);
    expect(identityGap(s)).toBeLessThan(1);
  });

  it('funds a frontier project only when one can start', () => {
    const s = richLab();
    boardCapitalReview(s);
    const inc = review(s)!;
    expect(optionBlocker(s, inc, 'project')).toBeDefined();
    (s.partnerships as Record<string, unknown>).probe = { balance: 1e12 };
    expect(optionBlocker(s, inc, 'project')).toBeUndefined();
    expect(resolveIncident(s, inc.id, 'project').ok).toBe(true);
    expect(s.projects.active?.id).toBe('lodestar');
  });

  it('banking it disappoints the market', () => {
    const s = richLab();
    boardCapitalReview(s);
    const sentiment = s.stock.sentiment;
    resolveIncident(s, review(s)!.id, 'bank');
    expect(s.stock.sentiment).toBeCloseTo(sentiment * (1 + BOARD_CAPITAL.sentiment.bank));
  });
});
