// AI-native incidents (CONTENT §22, 2026-10-27): each case fires only under
// its precondition, every option applies its effect, and the books balance.
import { describe, expect, it } from 'vitest';
import { WEEKS_PER_YEAR } from '../../src/config/balance';
import { INCIDENT_PARAMS as P } from '../../src/data/incidentParams';
import { INCIDENT_SPECS } from '../../src/data/incidents';
import { LEDGER_TEMPLATES } from '../../src/data/ledgerTemplates';
import { gpuDerate, isPulled, ratingMod, riskCoverageBonus } from '../../src/sim/incident/effects';
import * as cmd from '../../src/sim/commands';
import { dataCenterPowerBill, runningGpus, usableGpus } from '../../src/sim/dataCenters';
import { weeklyTick } from '../../src/sim/engine';
import { forceIncident, incidentChance, raiseIncident } from '../../src/sim/incidents';
import { hashSeed } from '../../src/sim/rng';
import type { GameState } from '../../src/sim/state';
import { RADAR, activeModel } from '../../src/sim/underwriting';
import { identityGap } from '../helpers/mergers';
import { addOpenDataCenter, addTrainedModel, aiReady, openBank } from '../helpers/incidents';

const AI_TYPES = [
  'JAILBREAK',
  'HALLUCINATION_SUIT',
  'COPYRIGHT_SUIT',
  'WEIGHTS_LEAK',
  'DEEPFAKE',
  'DC_FIRE',
  'GRID_FAILURE',
];

/** Resolves `option` on a fresh case of `type`, returning the state and the outcome. */
function play(type: string, option: string, seed = 1, setup?: (s: GameState) => void) {
  const { s, b } = openBank();
  aiReady(s, b);
  setup?.(s);
  s.rng.incidents = hashSeed(seed, type);
  const inc = forceIncident(s, type, INCIDENT_SPECS[type]!.scope === 'branch' ? b.id : 'company')!;
  expect(inc, type).toBeDefined();
  const cash = s.company.cash;
  const r = cmd.resolveIncident(s, inc.id, option);
  expect(r.ok, `${type}/${option}`).toBe(true);
  expect(identityGap(s)).toBeLessThan(1);
  return { s, b, inc, cash, outcome: r.ok ? r.outcome : undefined };
}

describe('AI incident catalog', () => {
  it('has two texts, Ledger templates and a price severity for every case', () => {
    for (const type of AI_TYPES) {
      const spec = INCIDENT_SPECS[type]!;
      expect(spec.texts?.length, type).toBeGreaterThanOrEqual(1);
      expect(`INCIDENT_${type}` in LEDGER_TEMPLATES, type).toBe(true);
      expect(spec.options.map((o) => o.id)).toContain(spec.worst);
    }
    for (const key of ['LAWSUIT_LOST', 'WEIGHTS_LEAKED', 'GRID_OUTAGE'])
      expect(LEDGER_TEMPLATES[key as keyof typeof LEDGER_TEMPLATES]).toHaveLength(2);
  });

  it('picks one of the case texts when raised', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 12; seed++) {
      const { s, b } = openBank();
      aiReady(s, b);
      s.rng.incidents = hashSeed(seed, 'texts');
      seen.add(String(forceIncident(s, 'JAILBREAK', 'company')!.data.text));
    }
    expect(seen.size).toBe(2);
  });
});

describe('AI incident preconditions', () => {
  it('needs customers for a jailbreak or a hallucination suit, and a safer or sharper model lowers the odds', () => {
    const { s, b } = openBank();
    const m = activeModel(s);
    m.radar[RADAR.safety] = 3;
    m.radar[RADAR.reasoning] = 3;
    const jail = incidentChance(s, 'JAILBREAK', 'company');
    const suit = incidentChance(s, 'HALLUCINATION_SUIT', 'company');
    expect(jail).toBeCloseTo(0.002 * (1.3 - 0.3));
    expect(suit).toBeCloseTo(0.001 * (1.3 - 0.3));
    m.radar[RADAR.safety] = 9;
    m.radar[RADAR.reasoning] = 9;
    expect(incidentChance(s, 'JAILBREAK', 'company')).toBeLessThan(jail);
    expect(incidentChance(s, 'HALLUCINATION_SUIT', 'company')).toBeLessThan(suit);
    b.customers = 0;
    expect(incidentChance(s, 'JAILBREAK', 'company')).toBe(0);
    expect(incidentChance(s, 'HALLUCINATION_SUIT', 'company')).toBe(0);
  });

  it('needs a trained model for the copyright suit and the weights leak', () => {
    const { s } = openBank();
    expect(incidentChance(s, 'COPYRIGHT_SUIT', 'company')).toBe(0);
    expect(incidentChance(s, 'WEIGHTS_LEAK', 'company')).toBe(0);
    addTrainedModel(s);
    expect(incidentChance(s, 'COPYRIGHT_SUIT', 'company')).toBeCloseTo(0.0015);
    const leak = incidentChance(s, 'WEIGHTS_LEAK', 'company');
    expect(leak).toBeGreaterThan(0);
    // A seated CTO with full expertise lowers the leak odds, as for a data breach.
    s.executives.seats.cto = { expertise: 100 } as NonNullable<typeof s.executives.seats.cto>;
    expect(incidentChance(s, 'WEIGHTS_LEAK', 'company')).toBeLessThan(leak);
  });

  it('needs Creative Suite users at the office for deepfake misuse', () => {
    const { s, b } = openBank();
    expect(incidentChance(s, 'DEEPFAKE', b.id)).toBe(0);
    aiReady(s, b);
    expect(incidentChance(s, 'DEEPFAKE', b.id)).toBeCloseTo(0.002);
    b.offered[P.DEEPFAKE.product]!.on = false;
    expect(incidentChance(s, 'DEEPFAKE', b.id)).toBe(0);
  });

  it('needs an open data center for a fire, one at an energy site for a grid failure', () => {
    const { s } = openBank();
    expect(incidentChance(s, 'DC_FIRE', 'company')).toBe(0);
    expect(incidentChance(s, 'GRID_FAILURE', 'company')).toBe(0);
    addOpenDataCenter(s, false, 'dc_city');
    expect(incidentChance(s, 'DC_FIRE', 'company')).toBeCloseTo(0.0008);
    expect(incidentChance(s, 'GRID_FAILURE', 'company')).toBe(0);
    addOpenDataCenter(s, true, 'dc_site');
    expect(incidentChance(s, 'DC_FIRE', 'company')).toBeCloseTo(0.0016);
    expect(incidentChance(s, 'GRID_FAILURE', 'company')).toBeCloseTo(0.002);
  });
});

describe('jailbreak', () => {
  it('patches at a cost with a short Products dip', () => {
    const { s, b, cash } = play('JAILBREAK', 'patch');
    expect(s.company.cash).toBeCloseTo(cash - P.JAILBREAK.patchCost);
    expect(ratingMod(s, b, 'products')).toBeCloseTo(P.JAILBREAK.patchProducts);
    s.clock.week += P.JAILBREAK.patchWeeks + 1;
    expect(ratingMod(s, b, 'products')).toBe(0);
  });

  it('ignored, it dents Safety coverage and the Overall rating', () => {
    const { s, b, cash } = play('JAILBREAK', 'ignore');
    expect(s.company.cash).toBe(cash);
    expect(riskCoverageBonus(s)).toBeCloseTo(P.JAILBREAK.ignoreSafety);
    expect(ratingMod(s, b, 'overall')).toBeCloseTo(P.JAILBREAK.ignoreOverall);
  });

  it('a post-mortem costs more and lifts Safety coverage for half a year', () => {
    const { s, cash } = play('JAILBREAK', 'postmortem');
    expect(s.company.cash).toBeCloseTo(cash - P.JAILBREAK.postMortemCost);
    expect(riskCoverageBonus(s)).toBeCloseTo(P.JAILBREAK.postMortemSafety);
  });
});

describe('hallucination lawsuit', () => {
  it('settles for a share of ARR (at least the minimum)', () => {
    const { s, inc, cash } = play('HALLUCINATION_SUIT', 'settle');
    const settle = inc.options.find((o) => o.id === 'settle')!.cost;
    expect(settle).toBeGreaterThanOrEqual(P.HALLUCINATION_SUIT.minSettle);
    expect(s.company.cash).toBeCloseTo(cash - settle);
  });

  it('fought, it is a coin flip: nothing, or bigger damages and an Overall hit', () => {
    const results = new Set<string>();
    for (let seed = 0; seed < 12; seed++) {
      const { s, b, inc, cash, outcome } = play('HALLUCINATION_SUIT', 'fight', seed);
      const lose = Number(inc.data.lose);
      if (s.company.cash < cash) {
        expect(s.company.cash).toBeCloseTo(cash - lose);
        expect(ratingMod(s, b, 'overall')).toBeCloseTo(P.HALLUCINATION_SUIT.loseOverall);
        expect(s.events.log.some((e) => e.type === 'LAWSUIT_LOST')).toBe(true);
        results.add('lost');
      } else {
        expect(ratingMod(s, b, 'overall')).toBe(0);
        results.add('won');
      }
      expect(outcome).toBeTruthy();
    }
    expect(results).toEqual(new Set(['won', 'lost']));
  });

  it('disclaimers cost nothing and leave a Products dip that does not expire', () => {
    const { s, b, cash } = play('HALLUCINATION_SUIT', 'disclaimers');
    expect(s.company.cash).toBe(cash);
    s.clock.week += 520;
    expect(ratingMod(s, b, 'products')).toBeCloseTo(P.HALLUCINATION_SUIT.disclaimerProducts);
  });
});

describe('training-data copyright suit', () => {
  it('licences the data at a fee per trained generation', () => {
    const { s, inc, cash } = play('COPYRIGHT_SUIT', 'licence', 1, (st) =>
      addTrainedModel(st, 'm_two'),
    );
    expect(inc.data.models).toBe(2);
    expect(s.company.cash).toBeCloseTo(cash - 2 * P.COPYRIGHT_SUIT.licencePerModel);
  });

  it('fights with odds set by the CSO and the Safety floor', () => {
    const { s, b } = openBank();
    aiReady(s, b);
    const base = raiseIncident(s, 'COPYRIGHT_SUIT', 'company', 'company', { licence: 1, lose: 2 })!;
    s.executives.seats.cro = { expertise: 100 } as NonNullable<typeof s.executives.seats.cro>;
    s.incidents.cooldowns = {};
    s.incidents.active = [];
    const cso = raiseIncident(s, 'COPYRIGHT_SUIT', 'company', 'company', { licence: 1, lose: 2 })!;
    expect(Number(cso.data.odds)).toBeCloseTo(
      Number(base.data.odds) + P.COPYRIGHT_SUIT.fightCsoSlope,
    );
    expect(Number(cso.data.odds)).toBeLessThanOrEqual(1);
  });

  it('retrains without the data: every trained model loses Breadth', () => {
    const { s } = play('COPYRIGHT_SUIT', 'retrain');
    const m = s.underwriting.models.m_test!;
    expect(m.lift![RADAR.breadth]).toBeCloseTo(-P.COPYRIGHT_SUIT.breadthHit);
    const house = activeModel(s);
    expect(m.radar[RADAR.breadth]).toBeLessThan(house.radar[RADAR.breadth]);
  });
});

describe('model weights leak', () => {
  it('rotating the keys costs the fee and ends it', () => {
    const { s, cash } = play('WEIGHTS_LEAK', 'rotate');
    expect(s.company.cash).toBeCloseTo(cash - P.WEIGHTS_LEAK.rotateCost);
    expect(s.events.log.some((e) => e.type === 'WEIGHTS_LEAKED')).toBe(false);
  });

  it('staying quiet sometimes surfaces: an Overall hit and a story', () => {
    const results = new Set<boolean>();
    for (let seed = 0; seed < 16; seed++) {
      const { s, b, cash } = play('WEIGHTS_LEAK', 'quiet', seed);
      expect(s.company.cash).toBe(cash);
      const exposed = s.events.log.some((e) => e.type === 'WEIGHTS_LEAKED');
      expect(ratingMod(s, b, 'overall')).toBeCloseTo(exposed ? P.WEIGHTS_LEAK.exposedOverall : 0);
      results.add(exposed);
    }
    expect(results).toEqual(new Set([true, false]));
  });
});

describe('deepfake misuse', () => {
  it('watermarking costs a fee and lifts Service', () => {
    const { s, b, cash } = play('DEEPFAKE', 'watermark');
    expect(s.company.cash).toBeCloseTo(cash - P.DEEPFAKE.watermarkCost);
    expect(ratingMod(s, b, 'service')).toBeCloseTo(P.DEEPFAKE.watermarkService);
  });

  it('pulling the Creative Suite bills nothing for it and signs nobody up, then expires', () => {
    const { s, b } = play('DEEPFAKE', 'pull');
    expect(isPulled(s, b.id, P.DEEPFAKE.product)).toBe(true);
    const book = b.books[P.DEEPFAKE.product]!;
    expect(book.balance).toBeGreaterThan(0);
    // A week with the plan pulled: no new seats, and the apps line carries none of its billing.
    const w = s.clock.week;
    s.clock.day = (w + 1) * 7;
    s.clock.week = w + 1;
    weeklyTick(s);
    expect(book.last.newAccounts).toBe(0);
    const row = b.pnl.at(-1)!;
    expect(row.lines.apps).toBeLessThan(book.balance / WEEKS_PER_YEAR);
    s.clock.week = w + P.DEEPFAKE.pullWeeks + 1;
    expect(isPulled(s, b.id, P.DEEPFAKE.product)).toBe(false);
  });

  it('a statement dents the office’s awareness', () => {
    const { s, b } = openBank();
    aiReady(s, b);
    const before = b.awareness;
    const inc = forceIncident(s, 'DEEPFAKE', b.id)!;
    expect(inc.data.text).toContain('Calgary');
    cmd.resolveIncident(s, inc.id, 'statement');
    expect(b.awareness).toBeCloseTo(Math.max(0, before - P.DEEPFAKE.statementAwareness));
  });
});

describe('data-centre fire', () => {
  it('names a data center and prices the repair per usable GPU', () => {
    const { s, inc, cash } = play('DC_FIRE', 'repair');
    const dc = s.dataCenters[String(inc.data.dataCenterId)]!;
    expect(inc.data.text).toContain(dc.name);
    expect(s.company.cash).toBeCloseTo(cash - usableGpus(dc.build) * P.DC_FIRE.repairPerGpu);
    expect(gpuDerate(s, dc.id)).toBe(0);
  });

  it('left alone, 30% of its GPUs are out for 12 weeks and the power bill falls with them', () => {
    const { s, inc } = play('DC_FIRE', 'derate');
    const dc = s.dataCenters[String(inc.data.dataCenterId)]!;
    const full = usableGpus(dc.build);
    expect(runningGpus(s, dc)).toBe(Math.round(full * (1 - P.DC_FIRE.derate)));
    const fullBill = dataCenterPowerBill(
      { ...s, incidents: { ...s.incidents, effects: [] } } as GameState,
      dc,
    );
    expect(dataCenterPowerBill(s, dc)).toBeCloseTo(fullBill * (1 - P.DC_FIRE.derate), 0);
    s.clock.week += P.DC_FIRE.derateWeeks + 1;
    expect(runningGpus(s, dc)).toBe(full);
  });
});

describe('grid failure', () => {
  it('diesel backup costs per running GPU and keeps the lights on', () => {
    const { s, inc, cash } = play('GRID_FAILURE', 'diesel');
    const dc = s.dataCenters[String(inc.data.dataCenterId)]!;
    expect(dc.siteId).toBeDefined();
    expect(s.company.cash).toBeCloseTo(cash - runningGpus(s, dc) * P.GRID_FAILURE.dieselPerGpu);
    expect(s.compute.outageWeeksLeft).toBe(0);
  });

  it('waiting for the grid starts the compute outage clock', () => {
    const { s } = play('GRID_FAILURE', 'outage');
    expect(s.compute.outageWeeksLeft).toBe(P.GRID_FAILURE.outageWeeks);
    expect(s.events.log.some((e) => e.type === 'GRID_OUTAGE')).toBe(true);
  });
});
