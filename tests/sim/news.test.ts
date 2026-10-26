// The Weekly Ledger (SIMULATION §24, ROADMAP Stage 5 acceptance): over three
// years every issue carries 6–12 articles, no subject repeats its template in
// back-to-back weeks, and the numbers match the events and the weekly close.
import { describe, expect, it } from 'vitest';
import {
  NEWS_ARCHIVE_ISSUES,
  NEWS_ARTICLES_MAX,
  NEWS_ARTICLES_MIN,
  NEWS_GROUP_CAPS,
  NEWS_ROUTINE_EVERY_WEEKS,
  NEWS_WORLD,
} from '../../src/config/balance';
import { LEDGER_TEMPLATES } from '../../src/data/ledgerTemplates';
import { isoDate } from '../../src/sim/calendar';
import { advanceDay, advanceWeeks } from '../../src/sim/engine';
import { pushEvent } from '../../src/sim/events';
import { newGame } from '../../src/sim/newGame';
import { newsMoney, newsRate } from '../../src/sim/newsFormat';
import type { GameState, LedgerIssue } from '../../src/sim/state';
import { homeCountry } from '../../src/sim/treasury';
import { openScriptedBranch, runScript } from '../helpers/scenario';

/** `${key}:${subject}#${idx}` → [`${key}:${subject}`, idx]. */
function parseRef(ref: string): [string, number] {
  const at = ref.lastIndexOf('#');
  return [ref.slice(0, at), Number(ref.slice(at + 1))];
}

describe('The Weekly Inference over three years', () => {
  const issues: LedgerIssue[] = [];
  const cbChecks: { headline: string; rate: string }[] = [];
  const revenueChecks: { body: string; headline: string; revenue: string }[] = [];
  let homeCbIssues = 0;
  let homeCbStories = 0;
  const state = runScript(156, (s, w) => {
    const issue = s.news.issues.at(-1)!;
    expect(issue.week).toBe(w);
    issues.push(structuredClone(issue));
    const home = homeCountry(s).id;
    for (const e of s.events.log.filter((x) => x.week === w && x.type === 'CB_DECISION')) {
      const a = issue.articles.find(
        (x) => x.ref?.startsWith('CB_') && x.ref.includes(`:${String(e.payload.country)}#`),
      );
      if (e.payload.country === home) {
        homeCbIssues += 1;
        if (a) homeCbStories += 1;
      }
      if (a) cbChecks.push({ headline: a.headline, rate: newsRate(Number(e.payload.rate)) });
    }
    const snap = s.history.weekly.at(-1)!;
    const bankWeek = issue.articles.find((x) => x.ref?.startsWith('BANK_WEEK_'));
    if (bankWeek)
      revenueChecks.push({
        headline: bankWeek.headline,
        body: bankWeek.body,
        revenue: newsMoney(snap.revenue, s.settings.currency),
      });
  });

  it('prints 6–12 articles every week, dated by the calendar', () => {
    expect(issues).toHaveLength(156);
    for (const issue of issues) {
      expect(issue.articles.length).toBeGreaterThanOrEqual(NEWS_ARTICLES_MIN);
      expect(issue.articles.length).toBeLessThanOrEqual(NEWS_ARTICLES_MAX);
      expect(issue.date).toBe(isoDate(state.meta.startDate, issue.week * 7));
      for (const a of issue.articles) {
        expect(a.headline + a.body).not.toMatch(/[{}]|undefined|NaN/);
        expect(a.headline.length).toBeGreaterThan(5);
      }
    }
  });

  it('never repeats a template for the same subject in consecutive issues', () => {
    for (let i = 1; i < issues.length; i++) {
      const prev = new Map(issues[i - 1]!.articles.map((a) => parseRef(a.ref!)));
      for (const a of issues[i]!.articles) {
        const [id, idx] = parseRef(a.ref!);
        if (prev.has(id)) expect(idx, `${id} in week ${issues[i]!.week}`).not.toBe(prev.get(id));
      }
    }
  });

  it('reports every home central bank decision with the decided rate', () => {
    expect(homeCbIssues).toBeGreaterThan(20);
    expect(homeCbStories).toBe(homeCbIssues);
    expect(cbChecks.length).toBeGreaterThan(homeCbIssues);
    for (const c of cbChecks) expect(c.headline).toContain(c.rate);
  });

  it("quotes your bank's revenue from the weekly close, at least every NEWS_ROUTINE_EVERY_WEEKS weeks", () => {
    expect(revenueChecks.length).toBeGreaterThanOrEqual(156 / NEWS_ROUTINE_EVERY_WEEKS);
    for (const c of revenueChecks) expect(c.headline + c.body).toContain(c.revenue);
  });

  it('reads like a living paper: every tab gets stories and many templates appear', () => {
    const tabs = new Set(issues.flatMap((i) => i.articles.map((a) => a.tab)));
    expect([...tabs].sort()).toEqual([
      'banking',
      'business',
      'markets',
      'politics',
      'sports',
      'world',
    ]);
    const keys = new Set(issues.flatMap((i) => i.articles.map((a) => a.ref!.split(':')[0])));
    expect(keys.size).toBeGreaterThan(40);
  });

  it('gives most of each issue to the world beyond your bank (§24.1)', () => {
    for (const issue of issues) {
      const worldTab = issue.articles.filter((a) => a.tab === 'world');
      expect(worldTab.length).toBeGreaterThanOrEqual(NEWS_WORLD.minPerIssue);
      const desk = issue.articles.filter((a) => a.ref!.startsWith('WORLD_'));
      expect(desk.length).toBeLessThanOrEqual(NEWS_GROUP_CAPS.world!);
      const routine = issue.articles.filter((a) =>
        /^(BANK_WEEK_|LOAN_|RATE_WATCH)/.test(a.ref ?? ''),
      );
      expect(routine.length).toBeLessThanOrEqual(NEWS_GROUP_CAPS.youRoutine!);
    }
  });

  it('keeps the last 52 issues', () => {
    expect(state.news.issues).toHaveLength(NEWS_ARCHIVE_ISSUES);
    expect(state.news.issues.at(-1)!.week).toBe(156);
  });
});

function bankAfterOneWeek(): GameState {
  const s = newGame({ seed: 7, cityId: 'cal', bankName: 'Test Bank' });
  openScriptedBranch(s, 'midtown');
  advanceWeeks(s, 1);
  return s;
}

describe('Ledger stories from events', () => {
  it('covers mid-week events once, in the next issue', () => {
    const s = bankAfterOneWeek();
    for (let i = 0; i < 3; i++) advanceDay(s);
    pushEvent(s, 'REG_FINE', { bank: 'Test Bank', amount: 250_000, reason: 'late reporting' }, 1);
    advanceWeeks(s, 1);
    const find = (issue: LedgerIssue) => issue.articles.find((a) => a.ref?.startsWith('REG_FINE'));
    const fine = find(s.news.issues.at(-1)!);
    expect(fine?.headline + ' ' + fine?.body).toContain('$250K');
    advanceWeeks(s, 1);
    expect(find(s.news.issues.at(-1)!)).toBeUndefined();
  });

  it('writes rival, partnership and incident stories with their numbers', () => {
    const s = bankAfterOneWeek();
    const rival = Object.values(s.rivals).find((r) => r.cities.includes('cal'))!;
    const q = 'Q1 2027';
    pushEvent(s, 'RIVAL_EARNINGS', {
      rivalId: rival.id,
      company: rival.name,
      revenue: 12_400_000,
      prevRevenue: 13_000_000,
      pct: -4.6,
      netIncome: 2_100_000,
      quarter: q,
    });
    pushEvent(s, 'RIVAL_DIVIDEND', {
      rivalId: rival.id,
      company: rival.name,
      dps: 0.3,
      yieldPct: 2.52,
      quarter: q,
    });
    pushEvent(s, 'BANK_FAILURE', { rivalId: rival.id, bank: rival.name, n: 7 });
    pushEvent(s, 'PRICE_WAR', {
      rivalId: rival.id,
      bank: rival.name,
      city: 'cal',
      bump: 0.0015,
      savingsRate: 0.031,
    });
    pushEvent(s, 'PARTNERSHIP_SIGNED', {
      partnershipId: 'p1',
      siteId: 's1',
      employer: 'Northfield Hospital',
      kind: 'payroll',
      branchName: 'Midtown',
      fee: 80_000,
    });
    advanceWeeks(s, 1);
    const text = s.news.issues
      .at(-1)!
      .articles.map((a) => `${a.ref} ${a.headline} ${a.body}`)
      .join('\n');
    expect(text).toMatch(/RIVAL_EARNINGS_DOWN.*4\.6%/);
    expect(text).toMatch(/RIVAL_DIVIDEND.*\$0\.30/);
    expect(text).toMatch(/BANK_FAILURE.*7/);
    expect(text).toMatch(/PRICE_WAR.*3\.10%/);
    expect(text).toMatch(/PARTNERSHIP_SIGNED.*Northfield Hospital/);
  });

  it('has 2–4 variants for every template', () => {
    for (const [key, variants] of Object.entries(LEDGER_TEMPLATES)) {
      expect(variants.length, key).toBeGreaterThanOrEqual(2);
      expect(variants.length, key).toBeLessThanOrEqual(4);
    }
  });
});
