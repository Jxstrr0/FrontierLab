// The Weekly Inference's weak-safety story says how to fix it (SIMULATION §15,
// C7a): staff the Safety & Alignment floor, private or listed.
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
  snap.safetyRatio = 0.5;
  if (listed) s.stock.status = 'public';
  const ctx = { state: s, week: snap.week, sym: '$', bank: 'Fix Bank' } as NewsContext;
  const story = closeStories(ctx).find((st) => st.key === 'CAPITAL_WEAK')!;
  return LEDGER_TEMPLATES.CAPITAL_WEAK!.map((t) => fillTemplate(t.b, story.tokens));
}

describe('safety warning in the paper', () => {
  it('tells the lab to hire safety staff, private or listed', () => {
    for (const listed of [false, true]) {
      for (const body of capitalStory(listed)) {
        expect(body).toMatch(/Safety & Alignment/);
        expect(body).toMatch(/50%/);
        expect(body).not.toMatch(/\{fix\}/);
      }
    }
  });
});
