// Offline support (Stage 10): the service worker's precache list, cache version
// and template filling, the registration switch, and the async autosave's
// "don't overwrite a newer save" rule.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cacheVersion, fillWorker, precacheList } from '../../src/app/pwa/precache';
import { canApplyUpdate, wantsServiceWorker } from '../../src/app/pwa/register';
import { isSuperseded } from '../../src/app/saves/autosave';
import type { SaveMeta } from '../../src/sim/save/storage';

const bytes = (s: string) => new TextEncoder().encode(s);

describe('precacheList', () => {
  it('keeps the app shell, chunks and woff2 fonts as worker-relative URLs', () => {
    const list = precacheList([
      'index.html',
      'sw.js',
      'manifest.webmanifest',
      'assets/index-abc.js',
      'assets/index-abc.js.map',
      'assets/public-sans-latin-400-normal-x.woff2',
      'assets/public-sans-latin-400-normal-y.woff',
      'icons/icon-512.png',
      'icons/icon-maskable-512.png',
      'icons/apple-touch-icon.png',
    ]);
    expect(list).toEqual([
      './assets/index-abc.js',
      './assets/public-sans-latin-400-normal-x.woff2',
      './icons/apple-touch-icon.png',
      './index.html',
      './manifest.webmanifest',
    ]);
  });
});

describe('cacheVersion', () => {
  const files = [
    { path: 'index.html', bytes: bytes('<html>') },
    { path: 'assets/a.js', bytes: bytes('console.log(1)') },
  ];
  it('is stable for the same build, whatever the file order', () => {
    expect(cacheVersion(files)).toBe(cacheVersion([...files].reverse()));
  });
  it('changes when any file changes', () => {
    const changed = [files[0]!, { path: 'assets/a.js', bytes: bytes('console.log(2)') }];
    expect(cacheVersion(changed)).not.toBe(cacheVersion(files));
  });
});

describe('fillWorker', () => {
  it('fills the real sw.js template', () => {
    const template = readFileSync(new URL('../../src/app/pwa/sw.js', import.meta.url), 'utf8');
    const out = fillWorker(template, 'v1', ['./index.html', './assets/a.js']);
    expect(out).toContain('const VERSION = "v1";');
    expect(out).toContain('const PRECACHE = ["./index.html","./assets/a.js"];');
    expect(out).not.toContain('__VS_');
  });
  it('refuses a template without placeholders', () => {
    expect(() => fillWorker('const x = 1;', 'v1', [])).toThrow();
  });
});

describe('wantsServiceWorker', () => {
  it('is on by default, off with ?nosw', () => {
    expect(wantsServiceWorker(new URL('https://example.test/VaultStreet/'))).toBe(true);
    expect(wantsServiceWorker(new URL('https://example.test/VaultStreet/?debug'))).toBe(true);
    expect(wantsServiceWorker(new URL('https://example.test/VaultStreet/?nosw'))).toBe(false);
  });
});

describe('isSuperseded', () => {
  const meta = (savedAt: number) => ({ savedAt }) as SaveMeta;
  it('skips writing an autosave older than what the slot already holds', () => {
    expect(isSuperseded(100, meta(200))).toBe(true);
    expect(isSuperseded(200, meta(100))).toBe(false);
    expect(isSuperseded(100, null)).toBe(false);
  });
});

describe('canApplyUpdate', () => {
  it('reloads into a new version only on the title screen with no game loaded', () => {
    expect(canApplyUpdate('title', false)).toBe(true);
    expect(canApplyUpdate('title', true)).toBe(false);
    expect(canApplyUpdate('game', true)).toBe(false);
    expect(canApplyUpdate('newgame', false)).toBe(false);
    expect(canApplyUpdate('settings', false)).toBe(false);
  });
});
