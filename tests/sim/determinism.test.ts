// Determinism (CLAUDE.md Testing): seed 42 plus the scripted command list, run
// for 260 weeks, must hash to the stored snapshot. Update SNAPSHOT only for an
// intended change, and note it in docs/PROGRESS.md.
import { describe, expect, it } from 'vitest';
import { checksum, serialize } from '../../src/sim/save/serialize';
import { runScript } from '../helpers/scenario';

const SNAPSHOT = '12f03e8e195ddc';

describe('determinism', () => {
  it('produces identical state for the same seed and commands', () => {
    const a = checksum(serialize(runScript(52)));
    const b = checksum(serialize(runScript(52)));
    expect(a).toBe(b);
  });

  it('matches the stored 260-week snapshot', () => {
    const hash = checksum(serialize(runScript(260)));
    expect(hash).toBe(SNAPSHOT);
  }, 60_000);
});
