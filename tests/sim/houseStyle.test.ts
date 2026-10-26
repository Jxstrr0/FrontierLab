// House style (CONTENT §7a, DATA_MODEL §12): New Game stores the chosen style
// of the branch fronts, a game started without one gets one of the five
// original styles from its seed.
import { describe, expect, it } from 'vitest';
import { HOUSE_STYLE_IDS, SEEDED_HOUSE_STYLE_IDS } from '../../src/data/houseStyles';
import { newGame } from '../../src/sim/newGame';

describe('house style', () => {
  it('keeps the style chosen at New Game', () => {
    const s = newGame({ seed: 5, cityId: 'cal', houseStyle: 'civic' });
    expect(s.meta.houseStyle).toBe('civic');
  });

  it('picks one of the five original styles from the seed when none is chosen', () => {
    const styles = new Set(
      [1, 2, 3, 4, 5].map((seed) => newGame({ seed, cityId: 'cal' }).meta.houseStyle),
    );
    expect(styles.size).toBe(SEEDED_HOUSE_STYLE_IDS.length);
    expect(SEEDED_HOUSE_STYLE_IDS).toHaveLength(5);
    expect(HOUSE_STYLE_IDS).toContain('quant');
    expect(SEEDED_HOUSE_STYLE_IDS).not.toContain('quant');
  });
});
