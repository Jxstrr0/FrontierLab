// The rich list (SIMULATION §22): 50 generated fortunes inside the range,
// growing with the economy plus −1–4% a year, and your year-end rank by net worth (none below #50),
// with the RICH_LIST story in The Weekly Ledger.
import { describe, expect, it } from 'vitest';
import { RICH_LIST } from '../../src/config/balance';
import { composeNews } from '../../src/sim/news';
import { netWorth } from '../../src/sim/netWorth';
import { newGame } from '../../src/sim/newGame';
import { rankFor, richListRows, richListYear } from '../../src/sim/richList';

const game = () => newGame({ seed: 42, cityId: 'cal', bankName: 'Rich Bank' });

describe('rich list', () => {
  it('seeds 50 named fortunes within the range, sorted, the same for the same seed', () => {
    const s = game();
    const f = s.personal.empire.richList.fortunes;
    expect(f).toHaveLength(RICH_LIST.size);
    for (const x of f) {
      expect(x.worth).toBeGreaterThanOrEqual(RICH_LIST.fortune[0] - RICH_LIST.roundTo);
      expect(x.worth).toBeLessThanOrEqual(RICH_LIST.fortune[1] + RICH_LIST.roundTo);
      expect(x.name).toMatch(/^\S+ \S+$/);
      expect(x.source.length).toBeGreaterThan(0);
    }
    expect([...f].sort((a, b) => b.worth - a.worth)).toEqual(f);
    expect(new Set(f.map((x) => x.name)).size).toBe(f.length);
    expect(game().personal.empire.richList.fortunes).toEqual(f);
  });

  it('grows every fortune with the economy plus its own real growth at year end', () => {
    const s = game();
    const before = new Map(s.personal.empire.richList.fortunes.map((x) => [x.id, x.worth]));
    richListYear(s); // the first ranking only sets the economy's reference level
    for (const x of s.personal.empire.richList.fortunes) {
      const g = x.worth / before.get(x.id)! - 1;
      expect(g).toBeGreaterThan(RICH_LIST.growth[0] - 0.01);
      expect(g).toBeLessThan(RICH_LIST.growth[1] + 0.01);
    }
    expect(s.personal.empire.richList.nominalRef).toBe(s.world.countries.CA!.nominal);
    // A doubled economy doubles every fortune on top of its own growth.
    const mid = new Map(s.personal.empire.richList.fortunes.map((x) => [x.id, x.worth]));
    s.world.countries.CA!.nominal *= 2;
    richListYear(s);
    for (const x of s.personal.empire.richList.fortunes) {
      const g = x.worth / mid.get(x.id)! / 2 - 1;
      expect(g).toBeGreaterThan(RICH_LIST.growth[0] - 0.01);
      expect(g).toBeLessThan(RICH_LIST.growth[1] + 0.01);
    }
  });

  it('leaves a small founder unranked, then ranks by net worth with a story', () => {
    const s = game();
    richListYear(s);
    expect(s.personal.empire.richList.rank).toBeUndefined();
    expect(s.events.log.some((e) => e.type === 'RICH_LIST')).toBe(false);

    const f = s.personal.empire.richList.fortunes;
    // Worth just above the 10th fortune after next year's growth (8% max) → #10 or better.
    s.personal.cash = f[9]!.worth * 1.2;
    richListYear(s);
    const rank = s.personal.empire.richList.rank!;
    const worth = netWorth(s).total;
    expect(rank).toBe(
      1 + s.personal.empire.richList.fortunes.filter((x) => x.worth > worth).length,
    );
    expect(rank).toBeLessThanOrEqual(10);
    const ev = s.events.log.find((e) => e.type === 'RICH_LIST')!;
    expect(ev.payload).toMatchObject({ rank, entered: true });

    composeNews(s);
    const story = s.news.issues.at(-1)!.articles.find((a) => a.ref?.startsWith('RICH_LIST:'))!;
    expect(`${story.headline} ${story.body}`).toContain(`#${rank}`);
    expect(story.headline).toContain(s.meta.founderName);
  });

  it('rankFor counts fortunes above you and stops at the list size', () => {
    const fortunes = [3, 2, 1].map((w, i) => ({ id: `r${i}`, name: 'A B', source: 'x', worth: w }));
    expect(rankFor(fortunes, 2.5)).toBe(2);
    expect(rankFor(fortunes, 10)).toBe(1);
    expect(rankFor(fortunes, 0)).toBe(4);
  });

  it('prints the list with you slotted in', () => {
    const s = game();
    const rows = richListRows(s);
    const you = rows.find((r) => r.you)!;
    expect(you.rank).toBe(RICH_LIST.size + 1);
    expect(rows.filter((r) => !r.you)).toHaveLength(RICH_LIST.size);
  });
});
