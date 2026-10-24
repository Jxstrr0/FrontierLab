// Real estate and lobbying screen selectors (SCREENS §15, §16): property pins
// show only for listed or owned buildings (never "For lease"), the panel view
// kinds, offer stepper bounds, the Company panel's rows, and campaign cards
// with the reason a campaign can't start.
import { describe, expect, it } from 'vitest';
import { REAL_ESTATE } from '../../src/config/balance';
import { campaignCards, pendingCampaigns, winsInForce } from '../../src/app/lobbying/lobbyingView';
import { propertyPinInfo } from '../../src/app/realEstate/propertyPin';
import {
  offerBounds,
  ownedBuildings,
  propertyView,
  reoRows,
} from '../../src/app/realEstate/realEstateView';
import * as cmd from '../../src/sim/commands';
import { newGame } from '../../src/sim/newGame';
import type { GameState } from '../../src/sim/state';

function game(): GameState {
  const s = newGame({ seed: 42, cityId: 'cal', bankName: 'View Bank' });
  s.company.cash += 60_000_000;
  s.company.paidInCapital += 60_000_000;
  return s;
}

const props = (s: GameState) => Object.values(s.world.sites).filter((x) => x.kind === 'property');

describe('property pins', () => {
  it('shows listed and owned buildings only', () => {
    const s = game();
    for (const site of props(s)) {
      const info = propertyPinInfo(s, site);
      const listed = !!s.realEstate.listings[site.id];
      expect(info.visible).toBe(listed);
      if (listed) expect(info.tag).toBe('For sale');
      expect(info.tag).not.toBe('For lease');
      expect(info.owned).toBeFalsy();
    }
    const listing = Object.values(s.realEstate.listings)[0]!;
    cmd.offerProperty(s, listing.siteId, listing.asking, 'company');
    const site = s.world.sites[listing.siteId]!;
    expect(propertyPinInfo(s, site)).toMatchObject({ visible: true, owned: true });
    expect(propertyPinInfo(s, site).tag).toBeUndefined();
    cmd.setPropertyForSale(s, site.id, true);
    expect(propertyPinInfo(s, site).tag).toBe('Selling');
  });
});

describe('property panel views', () => {
  it('reads listed, owned and neither', () => {
    const s = game();
    const listing = Object.values(s.realEstate.listings)[0]!;
    const unlisted = props(s).find((x) => !s.realEstate.listings[x.id])!;
    expect(propertyView(s, listing.siteId)?.kind).toBe('listed');
    const none = propertyView(s, unlisted.id);
    expect(none?.kind).toBe('none');
    if (none?.kind === 'none') expect(none.refreshIn).toBe(REAL_ESTATE.refreshWeeks);
    cmd.offerProperty(s, listing.siteId, listing.asking, 'company');
    expect(propertyView(s, listing.siteId)?.kind).toBe('owned');
    const rows = ownedBuildings(s, 'company');
    expect(rows).toHaveLength(1);
    expect(rows[0]!.value).toBeCloseTo(listing.estimate, 6);
    expect(ownedBuildings(s, 'personal')).toHaveLength(0);
  });

  it('bounds the offer stepper from 80% of asking to asking', () => {
    const b = offerBounds(4_123_456);
    expect(b.max).toBe(4_123_456);
    expect(b.min / b.max).toBeGreaterThan(0.79);
    expect(b.min / b.max).toBeLessThan(0.81);
    expect(b.step).toBeGreaterThanOrEqual(1000);
  });

  it('lists foreclosed homes per city with carrying cost', () => {
    const s = game();
    s.reo.cal = { units: 12.4, value: 5_200_000, mode: 'hold', hpiRef: 100 };
    const [row] = reoRows(s);
    expect(row).toMatchObject({ cityId: 'cal', city: 'Calgary', units: 12 });
    expect(row!.carrying).toBeCloseTo(6_000, 6);
    cmd.setReoMode(s, 'cal', 'selling');
    expect(reoRows(s)[0]!.sellsIn).toBeGreaterThanOrEqual(1);
  });
});

describe('lobbying firm views', () => {
  it('explains why a campaign is unavailable and tracks campaigns', () => {
    const s = game();
    const firm = 'site_cal_lobbyingFirm_parliamentRow';
    const cards = campaignCards(s, firm);
    expect(cards.map((c) => c.spec.id)).toEqual(['easeBuffer', 'fastTrack', 'stallBuffer']);
    expect(cards.find((c) => c.spec.id === 'stallBuffer')!.blocked).toMatch(/no capital buffer/);
    expect(cards.find((c) => c.spec.id === 'easeBuffer')!.blocked).toBeUndefined();
    cmd.startLobbying(s, firm, 'fastTrack');
    expect(pendingCampaigns(s)).toHaveLength(1);
    expect(campaignCards(s, firm).find((c) => c.spec.id === 'fastTrack')!.blocked).toMatch(
      /already under way/,
    );
    s.lobbying.fastTrack = true;
    expect(winsInForce(s)).toEqual(['Your next merger review is fast-tracked.']);
  });
});
