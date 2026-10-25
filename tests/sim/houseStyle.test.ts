// House style (CONTENT §7a, DATA_MODEL §12): New Game stores the chosen style
// of the branch fronts, a game started without one gets a style from its seed,
// and v18 saves are given one the same way.
import { describe, expect, it } from 'vitest';
import { HOUSE_STYLE_IDS } from '../../src/data/houseStyles';
import { newGame } from '../../src/sim/newGame';
import { migrate } from '../../src/sim/save/migrations';
import { SCHEMA_VERSION, type GameState } from '../../src/sim/state';

describe('house style', () => {
  it('keeps the style chosen at New Game', () => {
    const s = newGame({ seed: 5, cityId: 'cal', houseStyle: 'civic' });
    expect(s.meta.houseStyle).toBe('civic');
  });

  it('picks one from the seed when none is chosen', () => {
    const styles = new Set(
      [1, 2, 3, 4, 5].map((seed) => newGame({ seed, cityId: 'cal' }).meta.houseStyle),
    );
    expect(styles.size).toBe(HOUSE_STYLE_IDS.length);
  });

  it('gives v18 saves a style from their seed', () => {
    const s = newGame({ seed: 7, cityId: 'cal' });
    const raw = JSON.parse(JSON.stringify(s)) as Record<string, unknown> & {
      schemaVersion: number;
    };
    delete (raw.meta as Partial<GameState['meta']>).houseStyle;
    raw.schemaVersion = 18;
    const up = migrate(raw) as unknown as GameState;
    expect(up.schemaVersion).toBe(SCHEMA_VERSION);
    expect(up.meta.houseStyle).toBe(HOUSE_STYLE_IDS[7 % HOUSE_STYLE_IDS.length]);
  });
});
