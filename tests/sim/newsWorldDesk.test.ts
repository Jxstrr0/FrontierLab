// The Weekly Ledger beyond your bank (SIMULATION §24.1–24.3): World desk beats
// follow each country's season and economy, every country holds elections,
// share-move stories quote the real price, templates fill every token, and
// saves from v33 gain the new desk fields.
import { describe, expect, it } from 'vitest';
import { NEWS_ELECTIONS } from '../../src/config/balance';
import { LEDGER_TEMPLATES } from '../../src/data/ledgerTemplates';
import { WORLD_BEATS } from '../../src/data/newsWorldBeats';
import { newGame } from '../../src/sim/newGame';
import { beatFits } from '../../src/sim/newsWorldDesk';
import { newsExact } from '../../src/sim/newsFormat';
import { migrate } from '../../src/sim/save/migrations';
import { SCHEMA_VERSION, type GameState, type LedgerIssue } from '../../src/sim/state';
import { runScript } from '../helpers/scenario';

const beat = (key: string) => WORLD_BEATS.find((b) => b.key === key)!;

describe('World desk beats', () => {
  const s = newGame({ seed: 3, cityId: 'cal' });
  const country = (id: string) => ({ ...s.world.countries.CA!, id }) as never;

  it('every beat has templates', () => {
    for (const b of WORLD_BEATS) expect(LEDGER_TEMPLATES).toHaveProperty(b.key);
  });

  it('follows the seasons and the climate', () => {
    expect(beatFits(beat('WORLD_BUSHFIRE'), country('AU'), 1)).toBe(true);
    expect(beatFits(beat('WORLD_BUSHFIRE'), country('AU'), 7)).toBe(false);
    expect(beatFits(beat('WORLD_SNOWSTORM'), country('CA'), 1)).toBe(true);
    expect(beatFits(beat('WORLD_SNOWSTORM'), country('AU'), 7)).toBe(false);
    // Australia's summer heatwaves come in January.
    expect(beatFits(beat('WORLD_HEATWAVE'), country('AU'), 1)).toBe(true);
    expect(beatFits(beat('WORLD_HEATWAVE'), country('AU'), 7)).toBe(false);
  });

  it('follows the economy', () => {
    const boom = { ...s.world.countries.CA!, phase: 'expansion' as const };
    const slump = { ...boom, phase: 'recession' as const };
    expect(beatFits(beat('WORLD_LAYOFFS'), boom, 5)).toBe(false);
    expect(beatFits(beat('WORLD_LAYOFFS'), slump, 5)).toBe(true);
    expect(beatFits(beat('WORLD_PRICES'), { ...boom, inflation: 1.5 }, 5)).toBe(false);
    expect(beatFits(beat('WORLD_PRICES'), { ...boom, inflation: 6 }, 5)).toBe(true);
  });
});

describe('The paper over five years', () => {
  const issues: LedgerIssue[] = [];
  const prices: Record<string, string>[] = [];
  const state = runScript(260, (st) => {
    const issue = st.news.issues.at(-1)!;
    issues.push(structuredClone(issue));
    const map: Record<string, string> = {};
    for (const c of Object.values(st.market.companies))
      map[c.ticker] = newsExact(c.price, st.settings.currency);
    prices.push(map);
  });
  const all = issues.flatMap((i) => i.articles);

  it('fills every token', () => {
    for (const a of all) expect(a.headline + a.body).not.toMatch(/\{\w+\}/);
  });

  it('reports campaigns and results from several countries', () => {
    const results = all.filter((a) => /^ELECTION_(WON|HELD):/.test(a.ref!));
    const countries = new Set(results.map((a) => a.ref!.split(':')[1]!.split('#')[0]));
    expect(countries.size).toBeGreaterThanOrEqual(5);
    for (const c of Object.values(state.news.desk!.elections))
      expect(c!.nextWeek).toBeGreaterThan(260 - NEWS_ELECTIONS.termWeeks);
  });

  it('quotes the real closing price in share-move stories', () => {
    let checked = 0;
    issues.forEach((issue, w) => {
      for (const a of issue.articles.filter((x) => x.ref!.startsWith('STOCK_MOVER_'))) {
        const text = a.headline + a.body;
        const ticker = Object.keys(prices[w]!).find((t) => text.includes(prices[w]![t]!));
        expect(ticker).toBeDefined();
        checked += 1;
      }
    });
    expect(checked).toBeGreaterThan(20);
  });

  it('runs world stories from many countries and a fortnightly Money Column', () => {
    const world = all.filter((a) => a.tab === 'world');
    expect(new Set(world.map((a) => a.ref!.split(':')[1]!.split('#')[0])).size).toBe(
      Object.keys(state.world.countries).length,
    );
    expect(all.filter((a) => a.ref!.startsWith('COLUMN_')).length).toBeGreaterThan(100);
  });
});

describe('v33 → v34 migration', () => {
  it('gives an existing news desk empty cooldowns and elections', () => {
    const s0 = newGame({ seed: 5, cityId: 'cal' });
    const raw = JSON.parse(JSON.stringify(s0)) as GameState & { schemaVersion: number };
    raw.news.desk = { proposals: [], seasons: {}, polls: {}, assetMarks: {} } as never;
    raw.schemaVersion = 33;
    const s = migrate(raw as never) as unknown as GameState;
    expect(s.schemaVersion).toBe(SCHEMA_VERSION);
    expect(s.news.desk!.worldRecent).toEqual({});
    expect(s.news.desk!.elections).toEqual({});
  });
});
