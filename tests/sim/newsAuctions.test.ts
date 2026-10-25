// Auction stories in The Weekly Ledger (SIMULATION §24): previews, your wins and
// a discovered fake, with every template token filled.
import { describe, expect, it } from 'vitest';
import { COLLECTIBLES } from '../../src/data/collectibles';
import { LEDGER_TEMPLATES } from '../../src/data/ledgerTemplates';
import * as cmd from '../../src/sim/commands';
import { advanceWeeks } from '../../src/sim/engine';
import { newGame } from '../../src/sim/newGame';
import { fillTemplate } from '../../src/sim/newsFormat';
import { auctionStories } from '../../src/sim/newsAuctions';
import { newsContext, type Story } from '../../src/sim/newsStory';

const filled = (st: Story) => {
  for (const t of LEDGER_TEMPLATES[st.key]) {
    expect(fillTemplate(t.h, st.tokens)).not.toMatch(/[{}]/);
    expect(fillTemplate(t.b, st.tokens)).not.toMatch(/[{}]/);
  }
};

describe('auction news', () => {
  it('previews sales, reports your win and a fake found by appraisal', () => {
    const s = newGame({ seed: 42, cityId: 'cal', bankName: 'Gavel Bank' });
    cmd.travelTo(s, 'nyc');
    while (s.auctions.marlowe!.listedWeek === undefined) advanceWeeks(s, 1);
    const preview = auctionStories(newsContext(s, s.events.log)).find(
      (x) => x.key === 'AUCTION_PREVIEW',
    );
    expect(preview).toBeDefined();
    filled(preview!);

    const lot = s.auctions.marlowe!.lots[0]!;
    lot.genuine = false;
    cmd.placeBid(s, 'marlowe', lot.id, 1e12);
    s.personal.cash = 50_000_000;
    const due = s.auctions.marlowe!.nextWeek;
    while (s.clock.week < due) advanceWeeks(s, 1);
    const won = auctionStories(newsContext(s, s.events.log)).find(
      (x) => x.key === 'AUCTION_WON' || x.key === 'AUCTION_RECORD_YOURS',
    );
    expect(won).toBeDefined();
    filled(won!);

    cmd.appraiseCollectible(s, s.personal.empire.collectibles[0]!.id);
    advanceWeeks(s, 1);
    const fake = auctionStories(newsContext(s, s.events.log)).find((x) => x.key === 'AUCTION_FAKE');
    expect(fake).toBeDefined();
    filled(fake!);
    expect(fake!.tokens.item).toBe(COLLECTIBLES[lot.itemId]!.name);
  });
});
