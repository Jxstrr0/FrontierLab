import { describe, expect, it } from 'vitest';
import { FEATURES } from '../../src/config/balance';

describe('feature flags', () => {
  it('has a boolean flag for every roadmap stage after Stage 0', () => {
    expect(Object.keys(FEATURES)).toHaveLength(10);
    for (const value of Object.values(FEATURES)) expect(typeof value).toBe('boolean');
  });
});
