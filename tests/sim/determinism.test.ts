// Determinism (CLAUDE.md Testing): seed 42 plus the scripted command list, run
// for 260 weeks, must hash to the stored snapshot. Update SNAPSHOT only for an
// intended change, and note it in docs/PROGRESS.md.
import { describe, expect, it } from 'vitest';
import { checksum, serialize } from '../../src/sim/save/serialize';
import { runScript } from '../helpers/scenario';

const SNAPSHOT = '01f3204c67bc2e';

describe('determinism', () => {
  it('produces identical state for the same seed and commands', () => {
    const a = checksum(serialize(runScript(52)));
    const b = checksum(serialize(runScript(52)));
    expect(a).toBe(b);
  });

  it('matches the stored 260-week snapshot', () => {
    const s = runScript(260);
    // The script must stay solvent: a game-over run would stop ticking and hash a frozen world.
    expect(s.flags.gameOver).toBeUndefined();
    expect(checksum(serialize(s))).toBe(SNAPSHOT);
  }, 60_000);
});
