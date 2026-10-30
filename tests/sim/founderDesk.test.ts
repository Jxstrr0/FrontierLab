// The founder's desk (CONTENT §22b, 2026-10-30): eight early cases that fire
// once a game while the desk is open, each option doing what its preview says;
// price wars as one case a quarter; the retired bank-branch cases never roll.
import { describe, expect, it } from 'vitest';
import { FOUNDER_DESK, INCIDENTS, PRICE_WAR } from '../../src/config/balance';
import { INCIDENT_PARAMS as P } from '../../src/data/incidentParams';
import { INCIDENT_SPECS } from '../../src/data/incidents';
import { FOUNDER_SPECS } from '../../src/data/incidentsFounder';
import { LEDGER_TEMPLATES } from '../../src/data/ledgerTemplates';
import * as cmd from '../../src/sim/commands';
import { planCut, ratingMod, takeupMult } from '../../src/sim/incident/effects';
import { founderDeskOpen } from '../../src/sim/incident/founderRules';
import {
  forceIncident,
  incidentChance,
  raiseIncident,
  runIncidents,
} from '../../src/sim/incidents';
import { hashSeed } from '../../src/sim/rng';
import { sharesHeld } from '../../src/sim/shares';
import type { GameState } from '../../src/sim/state';
import { identityGap } from '../helpers/mergers';
import { addOpenDataCenter, openBank } from '../helpers/incidents';

const FOUNDER_TYPES = Object.keys(FOUNDER_SPECS);

/** Forces `type`, resolves `option`, and checks the books; returns what the case needs. */
function play(
  type: string,
  option: string,
  setup?: (s: GameState, b: GameState['branches'][string]) => void,
) {
  const { s, b } = openBank();
  setup?.(s, b);
  s.rng.incidents = hashSeed(7, type);
  const inc = forceIncident(s, type, 'company');
  expect(inc, type).toBeDefined();
  const cash = s.company.cash;
  const r = cmd.resolveIncident(s, inc!.id, option);
  expect(r.ok, `${type}/${option}`).toBe(true);
  expect(identityGap(s)).toBeLessThan(1);
  return { s, b, inc: inc!, cash, outcome: r.ok ? r.outcome : undefined };
}

describe("the founder's desk catalog", () => {
  it('has eight company cases that fire once a game, each with a Ledger story', () => {
    expect(FOUNDER_TYPES).toHaveLength(8);
    for (const type of FOUNDER_TYPES) {
      const spec = INCIDENT_SPECS[type]!;
      expect(spec.scope, type).toBe('company');
      expect(spec.trigger, type).toBe('rolled');
      expect(spec.baseP, type).toBe(FOUNDER_DESK.baseP);
      expect(spec.cooldownWeeks, type).toBe(INCIDENTS.onceWeeks);
      expect(spec.options.map((o) => o.id)).toContain(spec.worst);
      expect(`INCIDENT_${type}` in LEDGER_TEMPLATES, type).toBe(true);
    }
  });

  it('opens with an open sales office in the first three years, rests between cases, and never repeats one', () => {
    const { s } = openBank();
    expect(founderDeskOpen(s)).toBe(true);
    expect(incidentChance(s, 'PRESS_INTERVIEW', 'company')).toBe(FOUNDER_DESK.baseP);
    const inc = forceIncident(s, 'PRESS_INTERVIEW', 'company')!;
    // A pending founder case closes the desk; so does the rest after it.
    expect(founderDeskOpen(s)).toBe(false);
    expect(incidentChance(s, 'HACKATHON', 'company')).toBe(0);
    cmd.resolveIncident(s, inc.id, 'decline');
    expect(founderDeskOpen(s)).toBe(false);
    s.clock.week += FOUNDER_DESK.gapWeeks;
    expect(founderDeskOpen(s)).toBe(true);
    // Once a game: the same case never comes back, others still can.
    expect(raiseIncident(s, 'PRESS_INTERVIEW', 'company', 'company')).toBeUndefined();
    expect(incidentChance(s, 'HACKATHON', 'company')).toBe(FOUNDER_DESK.baseP);
    // The desk closes for good after untilWeek.
    s.clock.week = FOUNDER_DESK.untilWeek;
    expect(founderDeskOpen(s)).toBe(false);
    expect(incidentChance(s, 'HACKATHON', 'company')).toBe(0);
  });
});

describe("the founder's desk cases", () => {
  it('a viral demo lifts awareness everywhere, more when you push it', () => {
    const { b: fresh } = openBank();
    const pushed = play('VIRAL_DEMO', 'push');
    const enjoyed = play('VIRAL_DEMO', 'enjoy');
    expect(pushed.cash - pushed.s.company.cash).toBeCloseTo(P.VIRAL_DEMO.pushCost);
    expect(pushed.b.awareness - fresh.awareness).toBeCloseTo(P.VIRAL_DEMO.pushAwareness);
    expect(enjoyed.b.awareness - fresh.awareness).toBeCloseTo(P.VIRAL_DEMO.enjoyAwareness);
  });

  it('a feature request can be built, promised or declined', () => {
    const built = play('FEATURE_REQUEST', 'build');
    expect(built.cash - built.s.company.cash).toBeCloseTo(P.FEATURE_REQUEST.buildCost);
    expect(ratingMod(built.s, built.b, 'products')).toBeCloseTo(P.FEATURE_REQUEST.buildProducts);
    const promised = play('FEATURE_REQUEST', 'promise');
    expect(ratingMod(promised.s, promised.b, 'products')).toBeCloseTo(
      P.FEATURE_REQUEST.promiseProducts,
    );
    const declined = play('FEATURE_REQUEST', 'decline');
    expect(ratingMod(declined.s, declined.b, 'products')).toBe(0);
  });

  it("the angel's cheque brings cash in for new shares at a discount", () => {
    const { s, inc, cash } = play('ANGEL_OFFER', 'take');
    const raised = Number(inc.data.raised);
    expect(raised).toBeGreaterThan(0);
    expect(s.company.cash - cash).toBeCloseTo(raised);
    const investor = String(inc.data.investor);
    const holder = s.stock.holders.find((h) => h.name === investor);
    expect(holder?.kind).toBe('fund');
    expect(sharesHeld(s, holder!.id)).toBe(Number(inc.data.shares));
    expect(s.stock.placements.at(-1)?.investor).toBe(investor);
    // Declining keeps the cap table as it was, and a listed lab never gets the offer.
    const kept = play('ANGEL_OFFER', 'decline');
    expect(kept.s.stock.holders).toHaveLength(1);
    const { s: listed } = openBank();
    listed.stock.status = 'public';
    expect(incidentChance(listed, 'ANGEL_OFFER', 'company')).toBe(0);
  });

  it('an interview lifts awareness and sometimes leaves a gaffe', () => {
    const outcomes = new Set<string>();
    for (let seed = 0; seed < 12; seed++) {
      const { s, b } = openBank();
      const before = b.awareness;
      const inc = forceIncident(s, 'PRESS_INTERVIEW', 'company')!;
      s.rng.incidents = hashSeed(seed, 'talk');
      const r = cmd.resolveIncident(s, inc.id, 'talk');
      expect(r.ok).toBe(true);
      expect(b.awareness - before).toBeCloseTo(P.PRESS_INTERVIEW.awareness);
      if (r.ok && r.outcome) outcomes.add(r.outcome);
      const gaffe = ratingMod(s, b, 'overall');
      expect([0, P.PRESS_INTERVIEW.gaffeOverall]).toContain(Number(gaffe.toFixed(6)));
    }
    expect(outcomes.size).toBe(2);
  });

  it('a poached manager stays for a raise or leaves the office unmanaged', () => {
    const hire = (s: GameState, b: GameState['branches'][string]) => {
      const cand = s.people.managerCandidates[b.cityId]![0]!;
      expect(cmd.hireManager(s, b.id, cand.id).ok).toBe(true);
    };
    const { s: noMgr } = openBank();
    expect(incidentChance(noMgr, 'MANAGER_POACHED', 'company')).toBe(0);
    const kept = play('MANAGER_POACHED', 'counter', hire);
    const mgr = kept.s.people.managers[kept.b.managerId!]!;
    expect(mgr.salary).toBeGreaterThan(
      Number(kept.inc.data.raise) / P.MANAGER_POACHED.raiseShare - 1,
    );
    expect(String(kept.inc.data.manager)).toBe(mgr.name);
    const gone = play('MANAGER_POACHED', 'release', hire);
    expect(gone.b.managerId).toBeUndefined();
    expect(gone.outcome).toMatch(/has joined/);
  });

  it('a cloud outage costs burst money or a week offline, and never hits a lab with its own GPUs', () => {
    const rented = (s: GameState) => {
      s.compute.demandGpus = 500;
    };
    const paid = play('CLOUD_OUTAGE', 'burst', rented);
    expect(paid.cash - paid.s.company.cash).toBeCloseTo(Number(paid.inc.data.burst));
    expect(paid.s.compute.outageWeeksLeft).toBe(0);
    const dark = play('CLOUD_OUTAGE', 'ride', rented);
    expect(dark.s.compute.outageWeeksLeft).toBe(P.CLOUD_OUTAGE.outageWeeks);
    expect(dark.s.events.log.some((e) => e.type === 'INCIDENT_NEWS')).toBe(true);
    const { s: owner } = openBank();
    owner.compute.demandGpus = 500;
    addOpenDataCenter(owner, false);
    expect(incidentChance(owner, 'CLOUD_OUTAGE', 'company')).toBe(0);
  });

  it('a hackathon and course credits lift take-up of the API and Plus', () => {
    const { b: fresh } = openBank();
    const h = play('HACKATHON', 'sponsor');
    expect(takeupMult(h.s, P.HACKATHON.product)).toBeCloseTo(P.HACKATHON.takeup);
    expect(h.b.awareness - fresh.awareness).toBeCloseTo(P.HACKATHON.awareness);
    const c = play('CAMPUS_CREDITS', 'give');
    expect(takeupMult(c.s, P.CAMPUS_CREDITS.product)).toBeCloseTo(P.CAMPUS_CREDITS.takeup);
    expect(c.cash - c.s.company.cash).toBeCloseTo(P.CAMPUS_CREDITS.creditsCost);
    const passed = play('HACKATHON', 'pass');
    expect(takeupMult(passed.s, P.HACKATHON.product)).toBe(1);
  });
});

describe('price wars as one case a quarter', () => {
  it('names every city, matches in all of them, and waits a quarter before the next case', () => {
    const { s } = openBank();
    const inc = raiseIncident(s, 'PRICE_WAR', 'company', 'company', {
      bank: 'Nimbus Labs and 1 other lab',
      bump: PRICE_WAR.bump,
      cityIds: 'cal,tor,van,sea',
    })!;
    expect(inc).toBeDefined();
    expect(String(inc.data.text)).toContain('Calgary, Toronto, Vancouver and 1 more city');
    expect(String(inc.data.text)).toContain('Nimbus Labs and 1 other lab');
    cmd.resolveIncident(s, inc.id, 'match');
    for (const city of ['cal', 'tor', 'van', 'sea'])
      expect(planCut(s, city)).toBeCloseTo(P.PRICE_WAR.matchCut);
    expect(planCut(s, 'nyc')).toBe(0);
    expect(
      raiseIncident(s, 'PRICE_WAR', 'company', 'company', {
        bank: 'X',
        bump: 0.05,
        cityIds: 'nyc',
      }),
    ).toBeUndefined();
    s.clock.week += PRICE_WAR.caseWeeks;
    runIncidents(s);
    expect(
      raiseIncident(s, 'PRICE_WAR', 'company', 'company', {
        bank: 'X',
        bump: 0.05,
        cityIds: 'nyc',
      }),
    ).toBeDefined();
  });

  it("still answers an older save's per-city case in its city", () => {
    const { s } = openBank();
    const inc = raiseIncident(s, 'PRICE_WAR', 'city', 'cal', { bank: 'Nimbus Labs', bump: 0.05 })!;
    expect(String(inc.data.text)).toContain('in Calgary');
    cmd.resolveIncident(s, inc.id, 'match');
    expect(planCut(s, 'cal')).toBeCloseTo(P.PRICE_WAR.matchCut);
  });
});

describe('retired bank-branch cases', () => {
  it('a break-in and a heatwave no longer roll, but an open case from an old save still resolves', () => {
    for (const type of ['ROBBERY', 'BRANCH_FLOOD']) {
      expect(INCIDENT_SPECS[type]!.trigger).toBe('triggered');
      const { s, b } = openBank();
      const inc = raiseIncident(s, type, 'branch', b.id, { loss: 50_000, net: 10_000 })!;
      expect(inc).toBeDefined();
      expect(cmd.resolveIncident(s, inc.id, INCIDENT_SPECS[type]!.worst).ok).toBe(true);
    }
  });
});
