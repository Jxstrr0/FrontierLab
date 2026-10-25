// The Weekly Ledger's weak-capital story says how to fix it (SIMULATION §15):
// private banks are pointed at a private placement, listed ones at a secondary.
import { describe, expect, it } from 'vitest';
import { LEDGER_TEMPLATES } from '../../src/data/ledgerTemplates';
import { advanceWeeks } from '../../src/sim/engine';
import { newGame } from '../../src/sim/newGame';
import { fillTemplate } from '../../src/sim/newsFormat';
import type { NewsContext } from '../../src/sim/newsStory';
import { closeStories } from '../../src/sim/newsWeek';

function capitalStory(listed: boolean) {
  const s = newGame({ seed: 42, cityId: 'cal', bankName: 'Fix Bank' });
  advanceWeeks(s, 1);
  const snap = s.history.weekly.at(-1)!;
  snap.tier = 'critical';
  snap.capitalRatio = 0.034;
  if (listed) s.stock.status = 'public';
  const ctx = { state: s, week: snap.week, sym: '$', bank: 'Fix Bank' } as NewsContext;
  const story = closeStories(ctx).find((st) => st.key === 'CAPITAL_WEAK')!;
  return LEDGER_TEMPLATES.CAPITAL_WEAK!.map((t) => fillTemplate(t.b, story.tokens));
}

describe('capital warning in the paper', () => {
  it('tells a private bank to raise shares, sell stocks or cut risk', () => {
    for (const body of capitalStory(false)) {
      expect(body).toMatch(/Private placement/);
      expect(body).toMatch(/risk appetite/);
      expect(body).not.toMatch(/\{fix\}/);
    }
  });

  it('points a listed bank at a secondary offering', () => {
    for (const body of capitalStory(true)) expect(body).toMatch(/Secondary offering/);
  });
});
