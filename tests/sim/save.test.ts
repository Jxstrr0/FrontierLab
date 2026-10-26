import { describe, expect, it } from 'vitest';
import { advanceWeeks } from '../../src/sim/engine';
import { deserialize, exportCode, importCode, serialize } from '../../src/sim/save/serialize';
import { runScript } from '../helpers/scenario';
import { SCHEMA_VERSION } from '../../src/sim/state';

describe('saves', () => {
  it('round-trips through JSON and an export code', () => {
    const s = runScript(60);
    const code = exportCode(s);
    expect(code.startsWith(`FL${SCHEMA_VERSION}:`)).toBe(true);
    const back = importCode(code);
    expect(back).toEqual(s);
    expect(deserialize(serialize(s))).toEqual(s);
  });

  it('continues identically after a reload', () => {
    const a = runScript(40);
    const b = importCode(exportCode(a));
    advanceWeeks(a, 10);
    advanceWeeks(b, 10);
    expect(serialize(b)).toBe(serialize(a));
  });

  it('rejects codes from newer versions and junk', () => {
    expect(() => importCode('FL999:abc')).toThrow(/newer version/);
    expect(() => importCode('hello')).toThrow(/start with "FL"/);
    expect(() => deserialize('{"foo":1}')).toThrow(/doesn't look like/);
  });

  it('turns away Vault Street codes with a clear message', () => {
    const vs = exportCode(runScript(1)).replace(/^FL/, 'VS');
    expect(() => importCode(vs)).toThrow(/Vault Street save code/);
  });
});
