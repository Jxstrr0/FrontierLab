// Corporate debt from investment banks (SIMULATION §19.9): venture debt offers,
// accepting and repaying term loans, drawing and repaying credit lines, and old
// rival-lab loans from earlier saves. The balance identity holds throughout and
// money moves in the financing category.
import { describe, expect, it } from 'vitest';
import { CORPORATE_LENDING } from '../../src/config/balance';
import { REFERENCE_BUILDS } from '../../src/data/equipment';
import { balanceSheet, corporateDebtTotal } from '../../src/sim/balanceSheet';
import * as cmd from '../../src/sim/commands';
import {
  amortizedPayment,
  creditLimit,
  lenderName,
  lendersNearYou,
} from '../../src/sim/corporateDebt';
import { advanceWeeks } from '../../src/sim/engine';
import { newGame } from '../../src/sim/newGame';
import type { GameState } from '../../src/sim/state';
import { homeCountry } from '../../src/sim/homeCountry';
import { freeLot } from '../helpers/scenario';

function setup(): GameState {
  const s = newGame({ seed: 5, cityId: 'cal', bankName: 'Borrow Bank', competitors: 3 });
  const r = cmd.buildBranch(s, { lotId: freeLot(s, 'midtown').id, build: REFERENCE_BUILDS.mid });
  if (!r.ok) throw new Error(r.reason);
  advanceWeeks(s, 1);
  return s;
}

const gap = (s: GameState) => {
  const bs = balanceSheet(s);
  return Math.abs(bs.equity - bs.expectedEquity);
};

describe('corporate lending', () => {
  it('amortizes to zero over the term', () => {
    const p = amortizedPayment(1_000_000, 0.08, 104);
    let bal = 1_000_000;
    for (let w = 0; w < 104; w++) bal -= p - (bal * 0.08) / 52;
    expect(Math.abs(bal)).toBeLessThan(1);
  });

  it('offers 2–3 loans per nearby investment bank within the equity cap and rate band', () => {
    const s = setup();
    const lenders = lendersNearYou(s);
    expect(lenders.length).toBeGreaterThan(0);
    for (const l of lenders) expect(l.kind).toBe('investmentBank');
    const offers = s.corporateDebt.offers;
    expect(offers.length).toBeGreaterThanOrEqual(lenders.length);
    expect(offers.length).toBeLessThanOrEqual(lenders.length * 3);
    const equity = balanceSheet(s).equity;
    const policy = homeCountry(s).policyRate;
    for (const o of offers) {
      expect(o.amount).toBeLessThanOrEqual(CORPORATE_LENDING.maxEquityShare * equity + 1);
      expect(o.rate).toBeGreaterThanOrEqual(policy + CORPORATE_LENDING.spreadBest - 1e-9);
      expect(o.rate).toBeLessThanOrEqual(policy + CORPORATE_LENDING.spreadWorst + 1e-9);
      expect(o.termWeeks).toBeGreaterThanOrEqual(52);
      expect(o.termWeeks).toBeLessThanOrEqual(156);
    }
  });

  it('accepts and repays a loan, keeping the identity and financing flows', () => {
    const s = setup();
    const offer = s.corporateDebt.offers[0]!;
    const cash0 = s.company.cash;
    const fin0 = s.ledger.cash.financing;
    const r = cmd.acceptCorporateLoan(s, offer.id);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(s.company.cash).toBeCloseTo(cash0 + offer.amount, 6);
    expect(s.ledger.cash.financing - fin0).toBeCloseTo(offer.amount, 6);
    expect(corporateDebtTotal(s)).toBeCloseTo(offer.amount, 6);
    // The loan's lender is the investment bank office the offer came from.
    const site = s.world.sites[s.corporateDebt.loans[r.loanId]!.lenderId]!;
    expect(site.kind).toBe('investmentBank');
    const ev = s.events.log.find((e) => e.type === 'CORPORATE_LOAN')!;
    expect(ev.payload.lender).toBe(lenderName(s, site.id));
    expect(ev.payload.lender).not.toBe('your lenders');
    expect(gap(s)).toBeLessThan(1);
    // The same offer cannot be taken twice.
    expect(cmd.acceptCorporateLoan(s, offer.id).ok).toBe(false);

    let interest = 0;
    for (let w = 0; w < 6; w++) {
      advanceWeeks(s, 1);
      expect(gap(s)).toBeLessThan(1);
      const snap = s.history.weekly.at(-1)!;
      interest += snap.pnl.corporateInterest;
      // Principal leaves in financing (the first week also holds the loan coming in).
      if (w > 0) expect(snap.cashFlow.financing).toBeLessThan(0);
      else expect(snap.cashFlow.financing).toBeLessThan(offer.amount);
    }
    expect(interest).toBeGreaterThan(0);
    const loan = s.corporateDebt.loans[r.loanId]!;
    expect(loan.balance).toBeLessThan(offer.amount);
    expect(loan.weeksLeft).toBe(offer.termWeeks - 6);

    const before = s.company.cash;
    expect(cmd.repayCorporateLoan(s, r.loanId).ok).toBe(true);
    expect(s.company.cash).toBeCloseTo(before - loan.balance, 6);
    expect(s.corporateDebt.loans[r.loanId]).toBeUndefined();
    expect(gap(s)).toBeLessThan(1);
  });

  it('draws and repays a line of credit within its live limit', () => {
    const s = setup();
    const lender = lendersNearYou(s)[0]!;
    const limit = creditLimit(s);
    expect(limit).toBeGreaterThan(0);
    expect(cmd.drawCredit(s, lender.id, limit * 1.5).ok).toBe(false);
    expect(cmd.drawCredit(s, lender.id, -5).ok).toBe(false);
    expect(cmd.drawCredit(s, 'nobody', 1000).ok).toBe(false);

    const cash0 = s.company.cash;
    expect(cmd.drawCredit(s, lender.id, limit / 2).ok).toBe(true);
    expect(s.company.cash).toBeCloseTo(cash0 + limit / 2, 6);
    expect(gap(s)).toBeLessThan(1);
    advanceWeeks(s, 2);
    expect(gap(s)).toBeLessThan(1);
    const snap = s.history.weekly.at(-1)!;
    const line = s.corporateDebt.lines[lender.id]!;
    expect(snap.pnl.corporateInterest).toBeCloseTo((line.drawn * line.rate) / 52, 2);
    expect(line.rate).toBeCloseTo(homeCountry(s).policyRate + CORPORATE_LENDING.lineSpread, 9);

    expect(cmd.repayCredit(s, lender.id, limit / 4).ok).toBe(true);
    expect(s.corporateDebt.lines[lender.id]!.drawn).toBeCloseTo(limit / 4, 6);
    expect(cmd.repayCredit(s, lender.id, limit).ok).toBe(true);
    expect(s.corporateDebt.lines[lender.id]).toBeUndefined();
    expect(gap(s)).toBeLessThan(1);
  });

  it('refuses rival labs and banks in cities without your sales office', () => {
    const s = setup();
    const rivalId = Object.keys(s.rivals)[0]!;
    expect(cmd.drawCredit(s, rivalId, 1000).ok).toBe(false);
    const far = Object.values(s.world.sites).find(
      (x) => x.kind === 'investmentBank' && !lendersNearYou(s).some((l) => l.id === x.id),
    );
    if (far) expect(cmd.drawCredit(s, far.id, 1000).ok).toBe(false);
    // An offer whose lender is no longer an investment bank office has expired.
    const offer = s.corporateDebt.offers[0]!;
    offer.lenderId = rivalId;
    expect(cmd.acceptCorporateLoan(s, offer.id).ok).toBe(false);
  });

  it('keeps old rival-lab loans and lines running and repayable', () => {
    const s = setup();
    const rival = Object.values(s.rivals)[0]!;
    // A save from before lending moved: a loan, a line and a stale offer from a rival lab.
    const offer = s.corporateDebt.offers[0]!;
    const r = cmd.acceptCorporateLoan(s, offer.id);
    if (!r.ok) throw new Error(r.reason);
    s.corporateDebt.loans[r.loanId]!.lenderId = rival.id;
    const lender = lendersNearYou(s)[0]!;
    expect(cmd.drawCredit(s, lender.id, 1000).ok).toBe(true);
    s.corporateDebt.lines[rival.id] = { ...s.corporateDebt.lines[lender.id]!, lenderId: rival.id };
    delete s.corporateDebt.lines[lender.id];
    s.corporateDebt.offers.push({ ...offer, id: 'co_old', lenderId: rival.id });
    expect(lenderName(s, rival.id)).toBe(rival.name);
    expect(lenderName(s, 'gone')).toBe('your lenders');

    advanceWeeks(s, 1);
    expect(gap(s)).toBeLessThan(1);
    expect(s.history.weekly.at(-1)!.pnl.corporateInterest).toBeGreaterThan(0);
    // Stale rival offers are replaced by investment bank offers straight away.
    for (const o of s.corporateDebt.offers)
      expect(s.world.sites[o.lenderId]?.kind).toBe('investmentBank');
    expect(cmd.repayCredit(s, rival.id, 1000).ok).toBe(true);
    expect(s.corporateDebt.lines[rival.id]).toBeUndefined();
    expect(cmd.repayCorporateLoan(s, r.loanId).ok).toBe(true);
    expect(gap(s)).toBeLessThan(1);
  });
});
