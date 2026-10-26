// Logo shape (CONTENT §7b, DATA_MODEL §12): New Game stores the chosen outline
// of the bank's mark, a game started without one is round, and v19 saves keep
// the round medallion they have always worn.
import { describe, expect, it } from 'vitest';
import { logoPath } from '../../src/art/logoShapes';
import { DEFAULT_LOGO_SHAPE, LOGO_SHAPE_IDS } from '../../src/data/logoShapes';
import { newGame } from '../../src/sim/newGame';
import { migrate } from '../../src/sim/save/migrations';
import { SCHEMA_VERSION, type GameState } from '../../src/sim/state';

describe('logo shape', () => {
  it('keeps the shape chosen at New Game', () => {
    const s = newGame({ seed: 5, cityId: 'cal', logoShape: 'shield' });
    expect(s.meta.logoShape).toBe('shield');
  });

  it('is round when none is chosen', () => {
    expect(newGame({ seed: 5, cityId: 'cal' }).meta.logoShape).toBe(DEFAULT_LOGO_SHAPE);
  });

  it('keeps v19 saves round', () => {
    const s = newGame({ seed: 7, cityId: 'cal' });
    const raw = JSON.parse(JSON.stringify(s)) as Record<string, unknown> & {
      schemaVersion: number;
    };
    delete (raw.meta as Partial<GameState['meta']>).logoShape;
    raw.schemaVersion = 19;
    const up = migrate(raw) as unknown as GameState;
    expect(up.schemaVersion).toBe(SCHEMA_VERSION);
    expect(up.meta.logoShape).toBe(DEFAULT_LOGO_SHAPE);
  });

  it('draws a closed outline for every shape', () => {
    for (const id of LOGO_SHAPE_IDS) {
      const d = logoPath(id, 15, 15, 14);
      expect(d.startsWith('M')).toBe(true);
      expect(d.endsWith('Z')).toBe(true);
      expect(d).not.toMatch(/NaN/);
    }
  });
});
