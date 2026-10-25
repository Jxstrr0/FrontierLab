// Company and city incidents (CONTENT §22): data breach, card fraud, the
// regulator's audit and letter, price wars, bank runs and the emergency
// recapitalisation, the governance cases (executives poached, dividends due;
// rules in execRules.ts), plus the insider probe (Stage 9, insiderRule.ts).
import { BANK_RUN as BANK_RUN_P, FAILURE, RECAP, WEEKS_PER_YEAR } from '../../config/balance';
import { CITIES } from '../../data/cities';
import { INCIDENT_PARAMS, INCIDENT_SPECS } from '../../data/incidents';
import { totalDeposits } from '../balanceSheet';
import { ctoExpertise } from '../execSeats';
import { pushEvent } from '../events';
import { spend } from '../ledger';
import { baseId, productSpec } from '../products';
import type { GameState } from '../state';
import { applyWindowStigma } from '../treasury';
import { acceptRecap, endBankRun, recapQuote, statementOdds, takeover } from './capitalEvents';
import { addEffect, incidentPMult } from './effects';
import { DIVIDEND_DUE, EXEC_POACHED } from './execRules';
import { fraudShield, num, ratingHit, type IncidentRule } from './helpers';
import { INSIDER_PROBE } from './insiderRule';
import { compactMoney } from './text';

const P = INCIDENT_PARAMS;
const baseP = (type: string) => INCIDENT_SPECS[type]?.baseP ?? 0;
const totalCustomers = (state: GameState) =>
  Object.values(state.branches).reduce((s, b) => s + (b.status === 'open' ? b.customers : 0), 0);

/** Revenue over the last 52 weekly closes (as the regulator measures it, §15). */
const trailingRevenue = (state: GameState) =>
  state.history.weekly.slice(-WEEKS_PER_YEAR).reduce((sum, w) => sum + w.revenue, 0);

function regFine(state: GameState, amount: number, reason: string): void {
  spend(state, 'fines', amount);
  pushEvent(state, 'REG_FINE', { bank: state.meta.bankName, amount, reason }, 2);
}

const DATA_BREACH: IncidentRule = {
  // × (1 + 2(1 − itCov′)) × (1.2 − CTO expertise/100)
  chance(state) {
    if (totalCustomers(state) <= 0) return 0;
    const it = Math.min(1, state.hq.coverage.it?.kPrime ?? 1);
    return (
      baseP('DATA_BREACH') *
      (1 + P.DATA_BREACH.itSlope * (1 - it)) *
      (P.DATA_BREACH.ctoBase - ctoExpertise(state) / 100) *
      incidentPMult(state, 'DATA_BREACH', 'company')
    );
  },
  roll(state, _scope, rng) {
    const affected = Math.max(
      P.DATA_BREACH.minAffected,
      Math.round(totalCustomers(state) * rng.range(...P.DATA_BREACH.affectedShare)),
    );
    return { affected, fine: P.DATA_BREACH.quietFineShare * Math.max(0, trailingRevenue(state)) };
  },
  costs: (_s, _scope, data) => ({
    notify: num(data, 'affected') * P.DATA_BREACH.notifyPerCustomer,
    quiet: 0,
    forensic: P.DATA_BREACH.forensicCost,
  }),
  expected: (_s, inc, optionId) =>
    optionId === 'quiet' ? P.DATA_BREACH.quietDiscover * num(inc.data, 'fine') : 0,
  apply(state, inc, optionId, rng) {
    const d = P.DATA_BREACH;
    const breach = () =>
      pushEvent(state, 'BREACH', { bank: state.meta.bankName, n: num(inc.data, 'affected') }, 2);
    if (optionId === 'notify') {
      ratingHit(state, 'company', 'overall', d.notifyOverall, d.notifyWeeks);
      breach();
    } else if (optionId === 'forensic') {
      addEffect(state, 'incidentP', 'company', d.forensicPMult, d.forensicWeeks, 'DATA_BREACH');
    } else if (rng.chance(d.quietDiscover)) {
      const fine = num(inc.data, 'fine');
      regFine(state, fine, 'a data breach it kept quiet');
      ratingHit(state, 'company', 'overall', d.quietOverall, d.quietWeeks);
      breach();
      return `It came out. The regulator fined us ${compactMoney(fine, state.settings.currency)}.`;
    } else return 'The fix held and nobody found out.';
  },
};

/** Credit card balances across every branch. */
function cardBalances(state: GameState): number {
  let total = 0;
  for (const b of Object.values(state.branches)) {
    for (const [pid, book] of Object.entries(b.books)) {
      const spec = productSpec(state, pid);
      if (spec && baseId(spec) === 'credit_card') total += book.balance;
    }
  }
  return total;
}

const CARD_FRAUD: IncidentRule = {
  // Banks with card balances: × (1.3 − fraudShield/10)
  chance(state) {
    if (cardBalances(state) <= 0) return 0;
    return (
      baseP('CARD_FRAUD') *
      Math.max(0, P.CARD_FRAUD.shieldBase - fraudShield(state) / 10) *
      incidentPMult(state, 'CARD_FRAUD', 'company')
    );
  },
  roll: (state) => ({ loss: P.CARD_FRAUD.lossShare * cardBalances(state) }),
  costs: (_s, _scope, data) => ({
    absorb: num(data, 'loss'),
    freeze: 0,
    bureau: num(data, 'loss'),
  }),
  apply(state, _inc, optionId) {
    if (optionId === 'freeze')
      addEffect(
        state,
        'takeup',
        'company',
        P.CARD_FRAUD.takeupMult,
        P.CARD_FRAUD.takeupWeeks,
        'credit_card',
      );
  },
};

const REGULATOR_AUDIT: IncidentRule = {
  prepare(_s, _scope, data) {
    const fine = num(data, 'fine');
    data.appealFine = fine * P.REGULATOR_AUDIT.appealLoseMult;
    data.consultants = fine * P.REGULATOR_AUDIT.consultantShare;
  },
  costs: (_s, _scope, data) => ({
    pay: num(data, 'fine'),
    appeal: 0,
    consultants: num(data, 'fine') + num(data, 'consultants'),
  }),
  expected: (_s, inc, optionId) =>
    optionId === 'appeal' ? (1 - P.REGULATOR_AUDIT.appealWin) * num(inc.data, 'appealFine') : 0,
  apply(state, inc, optionId, rng) {
    const fine = num(inc.data, 'fine');
    const reason = 'a failed regulatory review';
    if (optionId === 'appeal') {
      if (rng.chance(P.REGULATOR_AUDIT.appealWin)) return 'The appeal succeeded: no fine.';
      const raised = num(inc.data, 'appealFine');
      regFine(state, raised, reason);
      return `The appeal failed. The fine rose to ${compactMoney(raised, state.settings.currency)}.`;
    }
    // Pay and consultants: the fine is part of the up-front cost.
    pushEvent(state, 'REG_FINE', { bank: state.meta.bankName, amount: fine, reason }, 2);
    if (optionId === 'consultants') {
      const r = P.REGULATOR_AUDIT;
      addEffect(state, 'riskCoverage', 'company', r.consultantCoverage, r.consultantWeeks);
    }
  },
};

const PRICE_WAR: IncidentRule = {
  prepare(_s, scope, data) {
    data.city = CITIES[scope]?.name ?? scope;
    if (typeof data.bank !== 'string') data.bank = 'A rival';
    if (typeof data.bump !== 'number') data.bump = P.PRICE_WAR.matchBoost;
  },
  costs: () => ({ match: 0, hold: 0 }),
  apply(state, inc, optionId) {
    if (optionId === 'match')
      addEffect(state, 'savingsBoost', inc.scope, P.PRICE_WAR.matchBoost, P.PRICE_WAR.matchWeeks);
  },
};

const BANK_RUN: IncidentRule = {
  prepare(state, _scope, data) {
    data.window = windowAmount(state);
    data.odds = statementOdds(state);
  },
  costs: () => ({ window: 0, raise: 0, statement: 0 }),
  apply(state, inc, optionId, rng) {
    if (optionId === 'window') {
      const amount = windowAmount(state);
      state.treasury.window += amount;
      state.treasury.reserves += amount;
      applyWindowStigma(state, amount);
    } else if (optionId === 'raise') {
      addEffect(state, 'savingsBoost', 'company', BANK_RUN_P.savingsBoost, BANK_RUN_P.boostWeeks);
    } else if (state.incidents.bankRunWeeksLeft === undefined) {
      return 'The run had already ended.';
    } else if (rng.chance(num(inc.data, 'odds'))) {
      endBankRun(state);
      return 'The statement worked. The queues have gone.';
    } else return 'Nobody believed the statement. The run goes on.';
  },
};

const RECAP_OFFER: IncidentRule = {
  prepare(state, _scope, data) {
    const q = recapQuote(state);
    data.amount = q.amount;
    data.price = `${state.settings.currency}${q.price.toFixed(2)}`;
    data.shares = q.shares;
    data.floor = FAILURE.takeoverCr;
    data.weeks = Math.max(RECAP.offerWeeks, state.company.lowCapitalWeeks);
  },
  costs: () => ({ accept: 0, decline: 0 }),
  apply(state, _inc, optionId) {
    if (optionId === 'decline') {
      takeover(state);
      return 'The regulator has taken control of the bank.';
    }
    const q = acceptRecap(state);
    return `New shareholders put in ${compactMoney(q.amount, state.settings.currency)}.`;
  },
};

const NOTHING: IncidentRule = { costs: () => ({}), apply: () => undefined };

export const COMPANY_RULES: Record<string, IncidentRule> = {
  DATA_BREACH,
  CARD_FRAUD,
  REGULATOR_AUDIT,
  REGULATOR_LETTER: NOTHING,
  PRICE_WAR,
  BANK_RUN,
  RECAP_OFFER,
  EXEC_POACHED,
  DIVIDEND_DUE,
  INSIDER_PROBE, // Stage 9 (insiderRule.ts)
};

/** Liquidity the central bank window lends in a run: a share of deposits. */
function windowAmount(state: GameState): number {
  return BANK_RUN_P.windowShare * totalDeposits(state);
}

/** This week's data-breach odds, for the IT floor's security posture (CONTENT §22). */
export function breachChance(state: GameState): number {
  return DATA_BREACH.chance?.(state, 'company') ?? 0;
}
