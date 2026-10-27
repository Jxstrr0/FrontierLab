// The world calendar, commodities and archive in The Weekly Ledger (SIMULATION
// §24.4–24.6): tournaments run their full script in order, the annual fixtures
// come round every year, commodity prices stay near their anchors and quote
// the stored price, reprints quote a real earlier issue and run once, and
// saves from v35 gain the new desk fields.
import { describe, expect, it } from 'vitest';
import { NEWS_COMMODITIES } from '../../src/config/balance';
import { COMMODITIES } from '../../src/data/commodities';
import { WORLD_BEATS } from '../../src/data/newsWorldBeats';
import { LEDGER_TEMPLATES } from '../../src/data/ledgerTemplates';
import { cupScript, gamesScript } from '../../src/sim/newsTournaments';
import { rngFromState } from '../../src/sim/rng';
import { type LedgerIssue } from '../../src/sim/state';
import { runScript } from '../helpers/scenario';

const refKey = (ref: string) => ref.split(':')[0]!;

describe('tournament scripts', () => {
  const host = { city: 'Sydney', country: 'AU' as const };

  it('plays the Nations Cup in order, ending with a final between the two semi-final winners', () => {
    const script = cupScript(2030, host, rngFromState([1, 2, 3, 4]));
    expect(script.map((s) => s.key)).toEqual([
      'CUP_ANNOUNCED',
      'CUP_OPENING',
      'CUP_GROUPS',
      'CUP_SEMIS',
      'CUP_FINAL',
    ]);
    const offsets = script.map((s) => s.offset);
    expect(offsets).toEqual([...offsets].sort((a, b) => a - b));
    const semis = script[3]!.tokens;
    const final = script[4]!.tokens;
    expect([semis.f1, semis.f2].sort()).toEqual([final.winner, final.loser].sort());
    for (const s of script) expect(LEDGER_TEMPLATES).toHaveProperty(s.key);
  });

  it('closes the World Games with a medal table in gold order', () => {
    const close = gamesScript(2032, host, rngFromState([5, 6, 7, 8])).at(-1)!.tokens;
    expect(Number(close.g1)).toBeGreaterThanOrEqual(Number(close.g2));
    expect(Number(close.g2)).toBeGreaterThanOrEqual(Number(close.g3));
  });

  it('every new world beat has templates', () => {
    for (const b of WORLD_BEATS) expect(LEDGER_TEMPLATES).toHaveProperty(b.key);
    expect(WORLD_BEATS.length).toBeGreaterThanOrEqual(60);
  });
});

describe('the paper over six years', () => {
  const issues: LedgerIssue[] = [];
  const state = runScript(312, (s) => {
    issues.push(structuredClone(s.news.issues.at(-1)!));
  });
  const all = issues.flatMap((i) => i.articles);
  const keys = all.map((a) => refKey(a.ref!));

  it('fills every token', () => {
    for (const a of all) expect(a.headline + a.body).not.toMatch(/\{\w+\}/);
  });

  it('runs a Nations Cup, two World Games, an Expo and every annual fixture', () => {
    expect(keys).toContain('CUP_FINAL');
    expect(keys.filter((k) => k === 'GAMES_CLOSE').length).toBe(2);
    expect(keys).toContain('EXPO_OPENS');
    expect(keys).toContain('EXPO_CLOSES');
    for (const k of ['FILM_AWARDS', 'SCIENCE_PRIZE', 'NEW_YEAR'])
      expect(keys.filter((x) => x === k).length).toBeGreaterThanOrEqual(5);
    expect(keys.filter((k) => k === 'SALE_BOOM' || k === 'SALE_QUIET').length).toBe(6);
  });

  it('keeps commodity prices near their anchors and quotes the stored price', () => {
    for (const spec of COMMODITIES) {
      const h = state.news.desk!.commodities[spec.id]!;
      expect(h.length).toBe(NEWS_COMMODITIES.historyWeeks);
      const nominal =
        Object.values(state.world.countries).reduce((sum, c) => sum + c!.nominal, 0) /
        Object.values(state.world.countries).length;
      const ratio = h.at(-1)! / (spec.base * nominal);
      expect(ratio).toBeGreaterThan(0.5);
      expect(ratio).toBeLessThan(2);
    }
    expect(keys.filter((k) => k === 'COMMODITY_WRAP').length).toBeGreaterThan(50);
  });

  it('reprints real earlier headlines, each at most once', () => {
    const reprints = all.filter((a) => refKey(a.ref!) === 'ARCHIVE');
    expect(reprints.length).toBeGreaterThan(20);
    const archive = state.news.desk!.archive;
    for (const r of reprints)
      expect(archive.some((a) => r.headline.includes(a.headline))).toBe(true);
    // Each reprint flags its original, so the count matches: none ran twice.
    expect(archive.filter((a) => a.reprinted).length).toBe(reprints.length);
  });
});
