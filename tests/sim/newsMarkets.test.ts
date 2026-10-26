// Markets stories in The Weekly Ledger (Stage 6): your capital raises and
// listing make the paper with the right numbers, notable earnings run, and a
// sharp week for the Ledger Composite replaces the routine market wrap.
import { describe, expect, it } from 'vitest';
import { STOCK_MARKET } from '../../src/config/balance';
import * as cmd from '../../src/sim/commands';
import { pushEvent } from '../../src/sim/events';
import { composeNews } from '../../src/sim/news';
import type { GameState } from '../../src/sim/state';
import { BANK, eligibleBank, publicBank } from '../helpers/markets';

const issue = (s: GameState) => {
  composeNews(s);
  return s.news.issues.at(-1)!.articles;
};

describe('markets news', () => {
  it('reports a placement with the investor and the money raised', () => {
    const s = eligibleBank();
    const r = cmd.privatePlacement(s, BANK, 0.1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const a = issue(s).find((x) => x.ref?.startsWith('PLACEMENT:'));
    expect(a).toBeDefined();
    expect(`${a!.headline} ${a!.body}`).toContain(r.investor);
    expect(a!.tab).toBe('business');
  });

  it('runs the listing with the ticker and exchange', () => {
    const s = publicBank();
    const a = issue(s).find((x) => x.ref?.startsWith('IPO_LISTED:'));
    expect(a).toBeDefined();
    expect(`${a!.headline} ${a!.body}`).toContain(s.stock.ticker!);
    expect(`${a!.headline} ${a!.body}`).toContain('Maple Exchange');
  });

  it('prints notable earnings only', () => {
    const s = eligibleBank();
    const base = { company: 'Cobalt AI', ticker: 'CBAI', eps: 3.1, quarter: 'Q1 2027' };
    pushEvent(s, 'COMPANY_EARNINGS', { ...base, companyId: 'cbai', surprisePct: 9 }, 2);
    pushEvent(s, 'COMPANY_EARNINGS', { ...base, companyId: 'slvs', surprisePct: 1 }, 0);
    const refs = issue(s).map((x) => x.ref ?? '');
    expect(refs.some((r) => r.startsWith('COMPANY_EARNINGS_BEAT:cbai'))).toBe(true);
    expect(refs.some((r) => r.includes(':slvs'))).toBe(false);
  });

  it('a big index week leads the markets page instead of the routine wrap', () => {
    const s = eligibleBank();
    const pct = -STOCK_MARKET.indexMoveNews * 100 - 1;
    s.market.indexHistory = [1000, 1000 * (1 + pct / 100)];
    pushEvent(s, 'MARKET_MOVE', { index: s.market.indexHistory[1]!, pct }, 1);
    const wraps = issue(s).filter((x) => /^MARKET_(UP|DOWN):/.test(x.ref ?? ''));
    expect(wraps).toHaveLength(1);
    expect(wraps[0]!.ref).toMatch(/^MARKET_DOWN:/);
    expect(`${wraps[0]!.headline} ${wraps[0]!.body}`).toContain('Inference Composite');
  });
});
