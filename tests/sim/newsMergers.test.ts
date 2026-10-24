// M&A stories (SIMULATION §24): every event type renders every variant with no
// unfilled tokens; small offers stay out of the paper; closings lead Banking.
import { describe, expect, it } from 'vitest';
import { MERGERS, NEWS_PRIORITY } from '../../src/config/balance';
import { LEDGER_TEMPLATES } from '../../src/data/ledgerTemplates';
import { newGame } from '../../src/sim/newGame';
import { fillTemplate } from '../../src/sim/newsFormat';
import { mergersStories } from '../../src/sim/newsMergers';
import { newsContext } from '../../src/sim/newsStory';
import type { GameEvent } from '../../src/sim/state';

const ev = (type: string, payload: Record<string, unknown>): GameEvent => ({
  week: 1,
  type,
  payload,
  priority: 5,
});

describe('M&A stories', () => {
  const s = newGame({ seed: 42, cityId: 'cal', bankName: 'Test Bank' });
  const rivalId = Object.keys(s.rivals)[0]!;
  const bank = s.rivals[rivalId]!.name;
  const events = [
    ev('MERGER_OFFER', { rivalId, bank, total: MERGERS.offerNewsMin * 2, premiumPct: 35 }),
    ev('MERGER_OFFER', { rivalId, bank, total: MERGERS.offerNewsMin / 2, premiumPct: 35 }),
    ev('MERGER_REJECTED', { rivalId, bank, reason: 'No.' }),
    ev('MERGER_BLOCKED', { rivalId, bank, reason: 'Deposit share in Calgary: 51%.' }),
    ev('MERGER_LAPSED', { rivalId, bank, reason: 'You no longer had the cash to close.' }),
    ev('ACQUISITION_CLOSED', { rivalId, bank, price: 4.8e6, branches: 3, distressed: false }),
    ev('ACQUISITION_CLOSED', { rivalId, bank, price: 1.2e6, branches: 2, distressed: true }),
    ev('CONVERSION_DONE', { rivalId, bank, branches: 3 }),
    ev('DISTRESSED_SALE', { rivalId, bank, ask: 6.4, pb: 0.55, weeks: 8, n: 3 }),
  ];
  const stories = mergersStories(newsContext(s, events));

  it('renders every variant with all tokens filled', () => {
    expect(stories).toHaveLength(events.length - 1);
    for (const story of stories) {
      for (const t of LEDGER_TEMPLATES[story.key]) {
        const text = fillTemplate(`${t.h} ${t.b}`, story.tokens);
        expect(text, story.key).not.toMatch(/[{}]/);
        expect(text).toContain(story.key === 'MERGER_OFFER' ? 'Test Bank' : '');
      }
    }
  });

  it('puts closings at the top of Banking and the sale price under Markets', () => {
    const closed = stories.find((x) => x.key === 'ACQUISITION_CLOSED')!;
    expect(closed.tab).toBe('banking');
    expect(closed.priority).toBe(NEWS_PRIORITY.companyAlarm);
    expect(stories.some((x) => x.key === 'ACQUISITION_CLOSED_DISTRESSED')).toBe(true);
    const sale = stories.find((x) => x.key === 'DISTRESSED_SALE')!;
    expect(sale.tab).toBe('markets');
    expect(sale.tokens.ask).toBe('$6.40');
  });
});
