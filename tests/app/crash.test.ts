// The crash screen's decision (src/app/crash.ts): which uncaught errors stop the game.
import { describe, expect, it } from 'vitest';
import { crashDetail, isCrash } from '../../src/app/crash';
import { CRASH_DETAIL_MAX_CHARS } from '../../src/config/saveLimits';

const HOME = 'https://frontierlab.longlight.games';

describe('crash screen', () => {
  it('stops the game for an error in its own code', () => {
    expect(isCrash(new TypeError("Cannot read properties of null (reading 'speed')"))).toBe(true);
    expect(isCrash(new RangeError('Invalid array length'), `${HOME}/assets/index.js`, HOME)).toBe(
      true,
    );
    expect(isCrash(new ReferenceError('x is not defined'))).toBe(true);
  });

  it('leaves alone what is not a crash', () => {
    // A file that didn't download: offline, or a new version went live mid-play.
    expect(
      isCrash(new TypeError('Failed to fetch dynamically imported module: /assets/Panel.js')),
    ).toBe(false);
    expect(isCrash(new TypeError('Load failed'))).toBe(false);
    expect(isCrash(new TypeError('NetworkError when attempting to fetch resource.'))).toBe(false);
    // Browser notices and refusals the game already handles.
    expect(
      isCrash(new Error('ResizeObserver loop completed with undelivered notifications.')),
    ).toBe(false);
    expect(isCrash(Object.assign(new Error('Share cancelled'), { name: 'AbortError' }))).toBe(
      false,
    );
    expect(isCrash(Object.assign(new Error('play() failed'), { name: 'NotAllowedError' }))).toBe(
      false,
    );
    // Things that are not errors at all, and another program's script on the page.
    expect(isCrash('Script error.')).toBe(false);
    expect(isCrash(null)).toBe(false);
    expect(isCrash(new TypeError('boom'), 'chrome-extension://abc/content.js', HOME)).toBe(false);
  });

  it('keeps the detail line short and names the version', () => {
    const line = crashDetail(new TypeError('x'.repeat(500)), '0.1.65.0');
    expect(line.startsWith('v0.1.65.0 · TypeError: xxx')).toBe(true);
    expect(line.length).toBe(CRASH_DETAIL_MAX_CHARS);
    expect(crashDetail('nope', '1.0.0.0')).toBe('v1.0.0.0 · Unknown error');
  });
});
