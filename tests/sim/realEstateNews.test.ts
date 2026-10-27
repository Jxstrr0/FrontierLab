// Real estate and lobbying stories (SIMULATION §24): every event type renders
// every variant with no unfilled tokens, small building deals stay out of the
// paper, and an exposé leads the paper.
import { describe, expect, it } from 'vitest';
import { NEWS_PRIORITY, REAL_ESTATE } from '../../src/config/balance';
import { LEDGER_TEMPLATES } from '../../src/data/ledgerTemplates';
import { newGame } from '../../src/sim/newGame';
import { fillTemplate } from '../../src/sim/newsFormat';
import { lobbyingStories } from '../../src/sim/newsLobbying';
import { realEstateStories } from '../../src/sim/newsRealEstate';
import { newsContext } from '../../src/sim/newsStory';
import type { GameEvent } from '../../src/sim/state';

const ev = (type: string, payload: Record<string, unknown>): GameEvent => ({
  week: 1,
  type,
  payload,
  priority: 5,
});

describe('real estate and lobbying stories', () => {
  const s = newGame({ seed: 42, cityId: 'cal', bankName: 'Test Bank' });
  const big = REAL_ESTATE.newsMin * 2;
  const deal = { siteId: 'site_x', address: '12 Elm Street', cityId: 'cal' };
  const lobby = {
    campaignId: 'easeBuffer',
    title: 'Ease the capital buffer by 1pp for 4 quarters',
    firm: 'Parliament Row Partners',
    country: 'CA',
  };
  const events = [
    ev('PROPERTY_BOUGHT', { ...deal, price: big, account: 'company' }),
    ev('PROPERTY_BOUGHT', { ...deal, price: big, account: 'personal' }),
    ev('PROPERTY_BOUGHT', { ...deal, price: REAL_ESTATE.newsMin / 2, account: 'company' }),
    ev('PROPERTY_SOLD', { ...deal, price: big, account: 'company' }),
    ev('PROPERTY_SOLD', { ...deal, price: big, account: 'personal' }),
    ev('LOBBY_WON', lobby),
    ev('LOBBY_LOST', lobby),
    ev('LOBBY_EXPOSED', { ...lobby, bank: 'Test Bank', fine: 1.25e6 }),
  ];
  const ctx = newsContext(s, events);
  const stories = [...realEstateStories(ctx), ...lobbyingStories(ctx)];

  it('renders every variant with all tokens filled', () => {
    expect(stories).toHaveLength(events.length - 1);
    for (const story of stories) {
      for (const t of LEDGER_TEMPLATES[story.key]) {
        const text = fillTemplate(`${t.h} ${t.b}`, story.tokens);
        expect(text, story.key).not.toMatch(/[{}]/);
      }
    }
  });

  it('leads with an exposé and names the founder on private deals', () => {
    const exposed = stories.find((x) => x.key === 'LOBBY_EXPOSED')!;
    expect(exposed.priority).toBe(NEWS_PRIORITY.companyAlarm);
    expect(exposed.tokens.fine).toBe('$1.25M');
    expect(exposed.tokens.campaign).toMatch(/^ease the capital buffer/);
    const personal = stories.find((x) => x.key === 'PROPERTY_BOUGHT_PERSONAL')!;
    expect(personal.tokens.founder).toBe(s.meta.founderName);
  });
});
