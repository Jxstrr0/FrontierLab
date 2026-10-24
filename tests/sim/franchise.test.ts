// Sports franchises (SCREENS §20, DESIGN §5.16): buying in the club's city,
// the company-owned club through buy, weeks and sale with the balance identity
// intact, personal finances, value growth, season finishes, transfer windows,
// and the acceptance test: kit sponsorship raises brand awareness in that
// country, and only there.
import { describe, expect, it } from 'vitest';
import { FRANCHISE as F } from '../../src/config/balance';
import { CITIES } from '../../src/data/cities';
import { balanceSheet } from '../../src/sim/balanceSheet';
import * as cmd from '../../src/sim/commands';
import { advanceWeeks } from '../../src/sim/engine';
import { clubWeek } from '../../src/sim/franchiseMath';
import { postCash } from '../../src/sim/ledger';
import { newGame } from '../../src/sim/newGame';
import type { GameState } from '../../src/sim/state';
import { generateCity } from '../../src/sim/worldGen';
import { bankWithFloors } from '../helpers/scenario';

const game = () => newGame({ seed: 42, cityId: 'cal', bankName: 'Club Bank' });

function fund(s: GameState, amount: number) {
  postCash(s, amount, 'financing');
  s.company.paidInCapital += amount;
}

function expectIdentity(s: GameState) {
  const bs = balanceSheet(s);
  expect(Math.abs(bs.equity - bs.expectedEquity)).toBeLessThan(1);
}

/** Advances to the next tick whose week of the year is `woy`. */
function advanceToWeek(s: GameState, woy: number) {
  for (let i = 0; i < 60 && clubWeek(s) !== woy; i++) advanceWeeks(s, 1);
  expect(clubWeek(s)).toBe(woy);
}

describe('buying a club', () => {
  it('needs you in the city, an offer of at least 90% and the cash', () => {
    const s = game();
    const value = s.clubs.bighorns!.value;
    s.personal.cash = 2e9;
    expect(cmd.buyClub(s, 'lakehawks', 3e9, 'personal')).toMatchObject({ ok: false });
    expect(cmd.buyClub(s, 'bighorns', value * 0.85, 'personal')).toMatchObject({ ok: false });
    s.personal.cash = value * 0.5;
    expect(cmd.buyClub(s, 'bighorns', value, 'personal')).toMatchObject({ ok: false });
    s.personal.cash = 2e9;
    expect(cmd.buyClub(s, 'bighorns', value * F.offerMin, 'personal').ok).toBe(true);
    const club = s.clubs.bighorns!;
    expect(club.owner).toBe('personal');
    expect(club.value).toBe(value * F.offerMin);
    expect(s.personal.cash).toBeCloseTo(2e9 - value * F.offerMin, 0);
    expect(s.events.log.some((e) => e.type === 'CLUB_BOUGHT')).toBe(true);
    expect(cmd.buyClub(s, 'bighorns', value, 'personal')).toMatchObject({ ok: false });
  });

  it('refuses a company purchase at the Restricted capital tier', () => {
    const s = game();
    fund(s, 2e9);
    s.company.tier = 'restricted';
    expect(cmd.buyClub(s, 'bighorns', 1e9, 'company')).toMatchObject({ ok: false });
  });

  it('pays a personally owned club’s net income into personal cash', () => {
    const s = game();
    s.personal.cash = 2e9;
    cmd.buyClub(s, 'bighorns', s.clubs.bighorns!.value, 'personal');
    const before = s.personal.cash;
    const pnlBefore = s.ledger.pnl.franchiseRevenue;
    advanceWeeks(s, 4);
    const club = s.clubs.bighorns!;
    const season = club.season;
    expect(season.broadcasting).toBeGreaterThan(0);
    expect(season.payroll).toBeGreaterThan(0);
    expect(s.ledger.pnl.franchiseRevenue).toBe(pnlBefore);
    expect(s.personal.cash).not.toBe(before);
  });
});

describe('a company-owned club', () => {
  it('keeps the balance identity through buy, a season of weeks and sale', () => {
    const s = game();
    fund(s, 2e9);
    const value = s.clubs.bighorns!.value;
    expect(cmd.buyClub(s, 'bighorns', value, 'company').ok).toBe(true);
    expect(balanceSheet(s).franchise).toBe(value);
    expectIdentity(s);
    let revenue = 0;
    let costs = 0;
    for (let w = 0; w < 30; w++) {
      advanceWeeks(s, 1);
      revenue += s.ledger.pnl.franchiseRevenue;
      costs += s.ledger.pnl.franchiseCosts;
      expectIdentity(s);
    }
    expect(revenue).toBeGreaterThan(0);
    expect(costs).toBeGreaterThan(0);
    expect(cmd.setKitSponsor(s, 'bighorns', true).ok).toBe(true);
    advanceWeeks(s, 2);
    expectIdentity(s);
    const club = s.clubs.bighorns!;
    const marked = club.value;
    const cash = s.company.cash;
    const r = cmd.sellClub(s, 'bighorns');
    expect(r.ok).toBe(true);
    expect(club.owner).toBe('outside');
    expect(club.kit.sponsor).toBe('outside');
    expect(s.company.cash - cash).toBeCloseTo(Math.round(marked * (1 - F.saleFee)), 0);
    expect(balanceSheet(s).franchise).toBe(0);
    expectIdentity(s);
    advanceWeeks(s, 1);
    expectIdentity(s);
  });

  it('opens Arena Naming Rights in its city, and selling the club ends it', () => {
    const s = bankWithFloors(['marketing'], { capital: 2e9 });
    const order = { campaignId: 'naming', scope: 'city', targetId: 'cal' } as const;
    expect(cmd.startBrandCampaign(s, order)).toMatchObject({ ok: false });
    expect(cmd.buyClub(s, 'bighorns', s.clubs.bighorns!.value, 'company').ok).toBe(true);
    expect(cmd.startBrandCampaign(s, order).ok).toBe(true);
    expect(s.marketing.campaigns.some((c) => c.campaignId === 'naming')).toBe(true);
    expect(cmd.sellClub(s, 'bighorns').ok).toBe(true);
    expect(s.marketing.campaigns.some((c) => c.campaignId === 'naming')).toBe(false);
    expectIdentity(s);
  });
});

describe('club seasons and value', () => {
  it('grows unowned clubs with league revenue (about 5% a year)', () => {
    const s = game();
    const before = Object.fromEntries(Object.values(s.clubs).map((c) => [c.clubId, c.value]));
    advanceWeeks(s, 52);
    const growth = Object.values(s.clubs).map((c) => c.value / before[c.clubId]! - 1);
    const mean = growth.reduce((a, b) => a + b, 0) / growth.length;
    expect(mean).toBeGreaterThan(0.02);
    expect(mean).toBeLessThan(0.08);
  });

  it('finishes each season with a position, an event for your club and a fresh record', () => {
    const s = game();
    s.personal.cash = 2e9;
    cmd.buyClub(s, 'bighorns', s.clubs.bighorns!.value, 'personal');
    advanceToWeek(s, 23); // the season's last week
    const season = s.events.log.find((e) => e.type === 'CLUB_SEASON');
    expect(season?.payload.clubId).toBe('bighorns');
    const pos = season!.payload.pos as number;
    expect(pos).toBeGreaterThanOrEqual(1);
    expect(pos).toBeLessThanOrEqual(F.leagueSize);
    expect(s.clubs.bighorns!.lastFinish).toBe(pos);
    const played = s.clubs.bighorns!.record.reduce((a, b) => a + b, 0);
    expect(played).toBeGreaterThan(15);
    advanceToWeek(s, F.seasonStartWeek);
    for (const c of Object.values(s.clubs)) expect(c.record.reduce((a, b) => a + b, 0)).toBe(1);
    // Football can draw; hockey never does.
    expect(s.clubs.bighorns!.record[2]).toBe(0);
  });
});

describe('transfers', () => {
  it('opens a market only during a window and caps the squad at 5 stars', () => {
    const s = game();
    s.personal.cash = 3e9;
    cmd.buyClub(s, 'bighorns', s.clubs.bighorns!.value, 'personal');
    const club = s.clubs.bighorns!;
    // The game starts in the January window with the market open.
    expect(club.market.length).toBeGreaterThanOrEqual(F.marketSize[0]);
    const target = club.market[0]!;
    expect(cmd.signPlayer(s, 'bighorns', target.id)).toMatchObject({ ok: false });
    const worst = [...club.stars].sort((a, b) => a.rating - b.rating)[0]!;
    const cash = s.personal.cash;
    expect(cmd.releasePlayer(s, 'bighorns', worst.id).ok).toBe(true);
    const severance = Math.round(worst.salary * worst.years * F.releaseShare);
    expect(cash - s.personal.cash).toBeCloseTo(severance, 0);
    const fee = target.fee!;
    expect(cmd.signPlayer(s, 'bighorns', target.id).ok).toBe(true);
    expect(club.stars).toHaveLength(F.maxStars);
    expect(club.stars.some((p) => p.id === target.id)).toBe(true);
    expect(club.season.transfers).toBeCloseTo(severance + fee, 0);
    expect(s.events.log.some((e) => e.type === 'CLUB_SIGNED')).toBe(true);
    // After the window closes the market is gone and signing is refused.
    advanceToWeek(s, 6);
    expect(club.market).toEqual([]);
    expect(cmd.signPlayer(s, 'bighorns', 'nobody')).toMatchObject({ ok: false });
    advanceToWeek(s, 27);
    expect(club.market.length).toBeGreaterThanOrEqual(F.marketSize[0]);
  });
});

describe('kit sponsorship', () => {
  const setup = (kit: boolean) => {
    const s = game();
    generateCity(s, 'tor');
    generateCity(s, 'nyc');
    s.personal.cash = 2e9;
    expect(cmd.buyClub(s, 'bighorns', s.clubs.bighorns!.value, 'personal').ok).toBe(true);
    if (kit) {
      expect(cmd.setKitSponsor(s, 'bighorns', true).ok).toBe(true);
      expect(s.events.log.some((e) => e.type === 'KIT_SPONSOR')).toBe(true);
    }
    advanceWeeks(s, 20);
    return s;
  };

  it('Kit sponsorship raises brand awareness in that country', () => {
    const on = setup(true);
    const off = setup(false);
    for (const id of ['cal', 'tor']) {
      expect(CITIES[id]!.country).toBe(CITIES.cal!.country);
      const gain = on.world.cities[id]!.brandAwareness - off.world.cities[id]!.brandAwareness;
      expect(gain, id).toBeGreaterThan(0.04);
    }
    // Cities in other countries are unchanged.
    expect(on.world.cities.nyc!.brandAwareness).toBeCloseTo(
      off.world.cities.nyc!.brandAwareness,
      12,
    );
  });

  it('only for your own club, and kit colours from the palette', () => {
    const s = game();
    expect(cmd.setKitSponsor(s, 'bighorns', true)).toMatchObject({ ok: false });
    s.personal.cash = 2e9;
    cmd.buyClub(s, 'bighorns', s.clubs.bighorns!.value, 'personal');
    expect(cmd.setKit(s, 'bighorns', 'navy', 'navy')).toMatchObject({ ok: false });
    expect(cmd.setKit(s, 'bighorns', 'navy', 'hotpink')).toMatchObject({ ok: false });
    expect(cmd.setKit(s, 'bighorns', 'navy', 'gold').ok).toBe(true);
    expect(s.clubs.bighorns!.kit).toMatchObject({ primary: 'navy', secondary: 'gold' });
  });
});
