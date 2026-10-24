// Pin rules for vacation homes and car dealers (SCREENS §19): "For sale" while
// nobody owns a home, your seal once it's yours ("Rebuilding" while it runs),
// and a seal on a dealer while a financing deal is active. Never "For lease".
import { describe, expect, it } from 'vitest';
import { personalPinInfo } from '../../src/app/personal/personalPins';
import * as cmd from '../../src/sim/commands';
import { homeAsking, homeSite } from '../../src/sim/personalValues';
import { openBank } from '../helpers/incidents';

describe('personal pins', () => {
  it('tags a home For sale, then seals it once yours', () => {
    const { s } = openBank();
    s.personal.cash = 50_000_000;
    const site = homeSite(s, 'bowvalley')!;
    expect(personalPinInfo(s, site)).toMatchObject({ visible: true, tag: 'For sale' });
    expect(cmd.offerHome(s, site.id, homeAsking(s, 'bowvalley'))).toMatchObject({ ok: true });
    expect(personalPinInfo(s, site)).toMatchObject({ owned: true });
    expect(personalPinInfo(s, site)?.tag).toBeUndefined();
    cmd.rebuildHome(s, 'bowvalley');
    expect(personalPinInfo(s, site)).toMatchObject({ owned: true, tag: 'Rebuilding' });
  });

  it('seals a dealer while a financing deal runs', () => {
    const { s } = openBank();
    const dealer = Object.values(s.world.sites).find(
      (x) => x.kind === 'autoDealer' && x.cityId === 'cal',
    )!;
    expect(personalPinInfo(s, dealer)?.owned).toBeUndefined();
    expect(cmd.signDealerDeal(s, dealer.id).ok).toBe(true);
    expect(personalPinInfo(s, dealer)).toMatchObject({ owned: true });
    expect(cmd.endDealerDeal(s, dealer.id).ok).toBe(true);
    expect(personalPinInfo(s, dealer)?.owned).toBeUndefined();
  });
});
