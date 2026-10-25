import { describe, expect, it } from 'vitest';
import { FEATURES } from '../../src/config/balance';

describe('feature flags', () => {
  // Stages 1–9 each have a flag; Stage 10 (art, tutorial, sound, PWA) needs none.
  it('has a boolean flag for every system stage after Stage 0', () => {
    expect(Object.keys(FEATURES)).toHaveLength(9);
    for (const value of Object.values(FEATURES)) expect(typeof value).toBe('boolean');
  });
});
