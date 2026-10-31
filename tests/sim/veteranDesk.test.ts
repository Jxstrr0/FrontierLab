// The veteran's desk (CONTENT §22c, 2026-10-31): six later cases that open in
// year 3, fire once a game, rest between cases, and keep the books balanced.
import { describe, expect, it } from 'vitest';
import { INCIDENTS, VETERAN_DESK } from '../../src/config/balance';
import { INCIDENT_SPECS } from '../../src/data/incidents';
import { VETERAN_SPECS } from '../../src/data/incidentsVeteran';
import { LEDGER_TEMPLATES } from '../../src/data/ledgerTemplates';
import { emptyBook } from '../../src/sim/branch/books';
import * as cmd from '../../src/sim/commands';
import { veteranDeskOpen } from '../../src/sim/incident/veteranRules';
import { forceIncident, incidentChance, raiseIncident } from '../../src/sim/incidents';
import { hashSeed } from '../../src/sim/rng';
import { identityGap } from '../helpers/mergers';
import { openBank } from '../helpers/incidents';

const TYPES = Object.keys(VETERAN_SPECS);

function veteranGame() {
  const { s, b } = openBank();
  s.clock.week = VETERAN_DESK.fromWeek;
  s.training.generation = 1;
  (b.books.api ??= emptyBook()).balance = 1_000_000;
  return { s, b };
}

describe("the veteran's desk", () => {
  it('has six once-a-game company cases with two texts and a Ledger story each', () => {
    expect(TYPES).toHaveLength(6);
    for (const type of TYPES) {
      const spec = INCIDENT_SPECS[type]!;
      expect(spec.scope, type).toBe('company');
      expect(spec.cooldownWeeks, type).toBe(INCIDENTS.onceWeeks);
      expect(spec.texts?.length, type).toBeGreaterThanOrEqual(1);
      expect(spec.options.map((o) => o.id)).toContain(spec.worst);
      expect(`INCIDENT_${type}` in LEDGER_TEMPLATES, type).toBe(true);
    }
  });

  it('stays closed before year 3, then opens, rests and never repeats a case', () => {
    const { s } = veteranGame();
    s.clock.week = VETERAN_DESK.fromWeek - 1;
    expect(veteranDeskOpen(s)).toBe(false);
    expect(incidentChance(s, 'REUNION', 'company')).toBe(0);
    s.clock.week = VETERAN_DESK.fromWeek;
    expect(incidentChance(s, 'REUNION', 'company')).toBe(VETERAN_DESK.baseP);
    const inc = forceIncident(s, 'REUNION', 'company')!;
    expect(veteranDeskOpen(s)).toBe(false);
    cmd.resolveIncident(s, inc.id, 'card');
    s.clock.week += VETERAN_DESK.gapWeeks;
    expect(veteranDeskOpen(s)).toBe(true);
    expect(raiseIncident(s, 'REUNION', 'company', 'company')).toBeUndefined();
  });

  it('resolves every option of every case with the books in balance', () => {
    for (const type of TYPES) {
      for (const opt of VETERAN_SPECS[type]!.options) {
        const { s } = veteranGame();
        s.rng.incidents = hashSeed(11, type);
        const inc = forceIncident(s, type, 'company');
        expect(inc, type).toBeDefined();
        const r = cmd.resolveIncident(s, inc!.id, opt.id);
        expect(r.ok, `${type}/${opt.id}`).toBe(true);
        expect(identityGap(s)).toBeLessThan(1);
      }
    }
  });
});
