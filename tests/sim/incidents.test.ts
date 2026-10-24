// Incidents (SIMULATION §23, CONTENT §22): the catalog, rolls under their
// conditions and cooldowns, manager delegation, deadlines and timed effects.
import { describe, expect, it } from 'vitest';
import { INCIDENTS } from '../../src/config/balance';
import { INCIDENT_SPECS } from '../../src/data/incidents';
import { balanceSheet } from '../../src/sim/balanceSheet';
import { branchPrice } from '../../src/sim/branch/pricing';
import * as cmd from '../../src/sim/commands';
import { weeklyTick } from '../../src/sim/engine';
import { addEffect, isClosed, riskCoverageBonus } from '../../src/sim/incident/effects';
import { hasRule, incidentChance, raiseIncident, runIncidents } from '../../src/sim/incidents';
import { hashSeed } from '../../src/sim/rng';
import { exportCode, importCode } from '../../src/sim/save/serialize';
import { openBank } from '../helpers/incidents';

const ROLLED = Object.values(INCIDENT_SPECS)
  .filter((x) => x.trigger === 'rolled')
  .map((x) => x.id);

describe('incident catalog', () => {
  it('has a spec and a rule for every CONTENT §22 incident, with a valid worst option', () => {
    const ids = [
      'ROBBERY',
      'ATM_SKIM',
      'DATA_BREACH',
      'MIS_SELLING',
      'REGULATOR_AUDIT',
      'VIRAL_COMPLAINT',
      'EXEC_POACHED',
      'BRANCH_FLOOD',
      'BANK_RUN',
      'CARD_FRAUD',
      'STAFF_WALKOUT',
      'DIVIDEND_DUE',
      'PRICE_WAR',
      'BIG_DEFAULT',
      'INSIDER_PROBE',
      'REGULATOR_LETTER',
      'RECAP_OFFER',
    ];
    for (const id of ids) {
      const spec = INCIDENT_SPECS[id];
      expect(spec, id).toBeDefined();
      expect(hasRule(id), id).toBe(true);
      expect(spec!.options.map((o) => o.id)).toContain(spec!.worst);
      expect(spec!.options.length).toBeGreaterThanOrEqual(spec!.info ? 1 : 2);
    }
  });

  it('raises the Stage 9 insider probe as a personal case with no corporate cost', () => {
    const { s } = openBank();
    const inc = raiseIncident(s, 'INSIDER_PROBE', 'personal', 'personal', { fine: 300_000 });
    expect(inc?.scopeKind).toBe('personal');
    expect(inc?.options.every((o) => o.cost === 0)).toBe(true);
  });
});

describe('rolled incidents', () => {
  it('follow their conditions', () => {
    const { s, b } = openBank();
    // ATM skimming needs an ATM.
    expect(incidentChance(s, 'ATM_SKIM', b.id)).toBeGreaterThan(0);
    b.build.atm = 'atm_none';
    expect(incidentChance(s, 'ATM_SKIM', b.id)).toBe(0);
    // Mis-selling scales with the sign-up bonus level.
    expect(incidentChance(s, 'MIS_SELLING', b.id)).toBe(0);
    b.campaigns.signup_bonus = 1;
    const one = incidentChance(s, 'MIS_SELLING', b.id);
    b.campaigns.signup_bonus = 3;
    expect(incidentChance(s, 'MIS_SELLING', b.id)).toBeCloseTo(one * 3);
    // Viral complaints need Service < 2.5; walkouts need morale < 25.
    expect(incidentChance(s, 'VIRAL_COMPLAINT', b.id)).toBe(0);
    b.ratings.service = 2.2;
    expect(incidentChance(s, 'VIRAL_COMPLAINT', b.id)).toBeCloseTo(0.01);
    expect(incidentChance(s, 'STAFF_WALKOUT', b.id)).toBe(0);
    b.staff.morale = 20;
    expect(incidentChance(s, 'STAFF_WALKOUT', b.id)).toBeCloseTo(0.03);
    // Robbery: × (6 − security)/3, so a fortress vault (5) is 1/3 of a steel vault (3).
    b.build.vault = 'vlt_steel';
    const steel = incidentChance(s, 'ROBBERY', b.id);
    expect(steel).toBeCloseTo(0.0015);
    b.build.vault = 'vlt_fortress';
    expect(incidentChance(s, 'ROBBERY', b.id)).toBeCloseTo(steel / 3);
    // Card fraud needs card balances.
    expect(incidentChance(s, 'CARD_FRAUD', 'company')).toBe(0);
    b.books.credit_card!.balance = 1_000_000;
    expect(incidentChance(s, 'CARD_FRAUD', 'company')).toBeGreaterThan(0);
    expect(incidentChance(s, 'DATA_BREACH', 'company')).toBeGreaterThan(0);
  });

  it('floods waterfront branches three times as often', () => {
    const inland = openBank('midtown');
    const shore = openBank('waterfront');
    expect(incidentChance(shore.s, 'BRANCH_FLOOD', shore.b.id)).toBeCloseTo(
      3 * incidentChance(inland.s, 'BRANCH_FLOOD', inland.b.id),
    );
  });

  it('each one fires under its condition and never during its cooldown', () => {
    for (const type of ROLLED) {
      const { s, b } = openBank();
      b.campaigns.signup_bonus = 2;
      b.ratings.service = 2;
      b.staff.morale = 10;
      b.books.credit_card!.balance = 1_000_000;
      const spec = INCIDENT_SPECS[type]!;
      const scope = spec.scope === 'branch' ? b.id : 'company';
      // A huge probability multiplier makes the roll certain.
      addEffect(s, 'incidentP', scope, 1e6, 100, type);
      runIncidents(s);
      const inc = s.incidents.active.find((i) => i.type === type);
      expect(inc, type).toBeDefined();
      expect(cmd.resolveIncident(s, inc!.id, spec.worst).ok, type).toBe(true);
      for (let w = 1; w < INCIDENTS.cooldownWeeks; w++) {
        s.clock.week += 1;
        runIncidents(s);
        expect(
          s.incidents.active.some((i) => i.type === type),
          `${type} week ${w}`,
        ).toBe(false);
      }
      s.clock.week += 1;
      runIncidents(s);
      expect(
        s.incidents.active.some((i) => i.type === type),
        `${type} after cooldown`,
      ).toBe(true);
    }
  });
});

describe('resolving incidents', () => {
  it('lets a delegated manager resolve branch incidents at once', () => {
    const { s, b } = openBank();
    const cand = s.people.managerCandidates[b.cityId]![0]!;
    cmd.hireManager(s, b.id, cand.id);
    cmd.setDelegation(s, b.id, 'troubles', true);
    const inc = raiseIncident(s, 'ROBBERY', 'branch', b.id, { loss: 50_000, net: 10_000 });
    expect(inc).toBeDefined();
    expect(s.incidents.active).toHaveLength(0);
    const done = s.events.log.find((e) => e.type === 'INCIDENT_RESOLVED');
    expect(done?.payload).toMatchObject({ type: 'ROBBERY', by: 'manager', scope: b.id });
  });

  it('chooses the worst option at the deadline', () => {
    const { s, b } = openBank();
    const before = b.awareness;
    const inc = raiseIncident(s, 'VIRAL_COMPLAINT', 'branch', b.id)!;
    expect(inc.deadlineWeek).toBe(s.clock.week + INCIDENTS.deadlineWeeks);
    s.clock.week = inc.deadlineWeek - 1;
    runIncidents(s);
    expect(s.incidents.active.map((i) => i.id)).toContain(inc.id);
    s.clock.week = inc.deadlineWeek;
    runIncidents(s);
    expect(s.incidents.active.map((i) => i.id)).not.toContain(inc.id);
    const done = s.events.log.find((e) => e.type === 'INCIDENT_RESOLVED');
    expect(done?.payload).toMatchObject({ by: 'deadline', option: 'Ignore it' });
    expect(b.awareness).toBeCloseTo(Math.max(0, before - 0.05));
  });

  it('pays costs, refuses what you cannot afford and keeps the books balanced', () => {
    const { s, b } = openBank();
    const inc = raiseIncident(s, 'BRANCH_FLOOD', 'branch', b.id)!;
    const cash = s.company.cash;
    s.company.cash = 1_000;
    const refused = cmd.resolveIncident(s, inc.id, 'fast');
    expect(refused.ok).toBe(false);
    s.company.cash = cash;
    expect(cmd.resolveIncident(s, inc.id, 'fast').ok).toBe(true);
    expect(s.company.cash).toBeCloseTo(cash - 80_000);
    expect(s.ledger.pnl.incidents).toBeCloseTo(80_000);
    const bs = balanceSheet(s);
    expect(Math.abs(bs.equity - bs.expectedEquity)).toBeLessThan(1);
  });

  it('closes a flooded branch for its repair, then the effect expires', () => {
    const { s, b } = openBank();
    const inc = raiseIncident(s, 'BRANCH_FLOOD', 'branch', b.id)!;
    cmd.resolveIncident(s, inc.id, 'fast');
    const w = s.clock.week;
    s.clock.week = w + 1;
    expect(isClosed(s, b.id)).toBe(true);
    s.clock.week = w;
    s.clock.day = (w + 1) * 7;
    s.clock.week = w + 1;
    weeklyTick(s);
    expect(b.last.served).toBe(0);
    expect(b.pnl.at(-1)!.lines.staff).toBeGreaterThan(0);
    s.clock.week = w + 2;
    expect(isClosed(s, b.id)).toBe(false);
    expect(s.incidents.effects).toHaveLength(0);
  });

  it('matches a price war at every branch in the city', () => {
    const { s, b } = openBank();
    const before = branchPrice(s, b, 'savings');
    const inc = raiseIncident(s, 'PRICE_WAR', 'city', b.cityId, { bank: 'Rival', bump: 0.0015 })!;
    expect(inc.data.text).toContain('Rival');
    cmd.resolveIncident(s, inc.id, 'match');
    s.clock.week += 1;
    expect(branchPrice(s, b, 'savings')).toBeCloseTo(before + 0.0015);
    s.clock.week += 30;
    expect(branchPrice(s, b, 'savings')).toBeCloseTo(before);
  });
});

describe('regulator audit', () => {
  const audit = () => {
    const { s } = openBank();
    const inc = raiseIncident(s, 'REGULATOR_AUDIT', 'company', 'company', { fine: 100_000 })!;
    return { s, inc };
  };

  it('pays the fine', () => {
    const { s, inc } = audit();
    const cash = s.company.cash;
    expect(cmd.resolveIncident(s, inc.id, 'pay').ok).toBe(true);
    expect(s.ledger.pnl.fines).toBeCloseTo(100_000);
    expect(s.company.cash).toBeCloseTo(cash - 100_000);
    expect(s.events.log.some((e) => e.type === 'REG_FINE')).toBe(true);
  });

  it('appeals for no fine or one and a half times it', () => {
    const outcomes = new Set<number>();
    for (let seed = 0; seed < 12; seed++) {
      const { s, inc } = audit();
      s.rng.incidents = hashSeed(seed, 'appeal');
      expect(cmd.resolveIncident(s, inc.id, 'appeal').ok).toBe(true);
      outcomes.add(Math.round(s.ledger.pnl.fines));
    }
    expect([...outcomes].sort()).toEqual([0, 150_000]);
  });

  it('hires consultants: fine plus half again, Risk coverage +0.2 for 26 weeks', () => {
    const { s, inc } = audit();
    expect(inc.options.find((o) => o.id === 'consultants')!.cost).toBe(150_000);
    cmd.resolveIncident(s, inc.id, 'consultants');
    expect(s.ledger.pnl.fines).toBeCloseTo(150_000);
    s.clock.week += 26;
    expect(riskCoverageBonus(s)).toBeCloseTo(0.2);
    s.clock.week += 1;
    expect(riskCoverageBonus(s)).toBe(0);
  });
});

describe('incident saves', () => {
  it('round-trip open cases, cooldowns, effects and a bank run', () => {
    const { s, b } = openBank();
    raiseIncident(s, 'VIRAL_COMPLAINT', 'branch', b.id);
    const flood = raiseIncident(s, 'BRANCH_FLOOD', 'branch', b.id)!;
    cmd.resolveIncident(s, flood.id, 'slow');
    s.incidents.bankRunWeeksLeft = 3;
    expect(s.incidents.effects.length).toBeGreaterThan(0);
    expect(importCode(exportCode(s))).toEqual(s);
  });
});
