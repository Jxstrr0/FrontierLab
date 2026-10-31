import { describe, expect, it } from 'vitest';
import { FEATURES } from '../../src/config/balance';

describe('feature flags', () => {
  // Flags exist only for partly built systems; every stage so far is finished.
  it('holds only boolean flags, and none while every system is complete', () => {
    for (const value of Object.values(FEATURES)) expect(typeof value).toBe('boolean');
    expect(Object.keys(FEATURES)).toHaveLength(0);
  });
});
