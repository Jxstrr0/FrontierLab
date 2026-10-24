// Sports club stories (SIMULATION §24, CONTENT §23 SPORTS): every franchise
// event renders every variant with no unfilled tokens, your season finish uses
// the SPORTS headline, and switching the kit sponsor off makes no story.
import { describe, expect, it } from 'vitest';
import { LEDGER_TEMPLATES } from '../../src/data/ledgerTemplates';
import { newGame } from '../../src/sim/newGame';
import { franchiseStories } from '../../src/sim/newsFranchise';
import { fillTemplate } from '../../src/sim/newsFormat';
import { newsContext } from '../../src/sim/newsStory';
import type { GameEvent } from '../../src/sim/state';

const ev = (type: string, payload: Record<string, unknown>): GameEvent => ({
  week: 1,
  type,
  payload,
  priority: 5,
});

describe('franchise stories', () => {
  const s = newGame({ seed: 42, cityId: 'cal', bankName: 'Test Bank' });
  s.clubs.bighorns!.owner = 'personal';
  const club = { clubId: 'bighorns', club: 'Calgary Bighorns' };
  const events = [
    ev('CLUB_SEASON', {
      ...club,
      league: 'Dominion Hockey Association',
      pos: 3,
      record: '24–16',
    }),
    ev('CLUB_BOUGHT', { ...club, owner: 'company', price: 9e8, league: 'x' }),
    ev('CLUB_SOLD', { ...club, owner: 'personal', price: 9.2e8 }),
    ev('KIT_SPONSOR', { ...club, on: true }),
    ev('KIT_SPONSOR', { ...club, on: false }),
    ev('CLUB_SIGNED', { ...club, player: 'Mei Lindqvist', position: 'Centre', fee: 2.6e7 }),
  ];
  const stories = franchiseStories(newsContext(s, events));

  it('renders every variant with all tokens filled', () => {
    expect(stories).toHaveLength(events.length - 1);
    for (const story of stories) {
      for (const t of LEDGER_TEMPLATES[story.key]) {
        const text = fillTemplate(`${t.h} ${t.b}`, story.tokens);
        expect(text, story.key).not.toMatch(/[{}]/);
      }
    }
  });

  it('reports your season with the SPORTS headline', () => {
    const season = stories.find((x) => x.key === 'CLUB_SEASON')!;
    expect(season.tab).toBe('sports');
    const t = LEDGER_TEMPLATES.CLUB_SEASON[0]!;
    expect(fillTemplate(t.h, season.tokens)).toBe(
      'Calgary Bighorns finish 3rd in the Dominion Hockey Association',
    );
    expect(season.tokens.owner).toBe(s.meta.founderName);
    expect(stories.find((x) => x.key === 'CLUB_BOUGHT')!.tokens.owner).toBe('Test Bank');
    expect(stories.find((x) => x.key === 'KIT_SPONSOR')!.tokens.theCountry).toBe('Canada');
  });
});
