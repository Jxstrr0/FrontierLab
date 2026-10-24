// Build-time helpers for the offline service worker (src/app/pwa/sw.js): which
// built files to precache, the build's cache version, and filling in the
// worker template. Pure functions so they can be unit-tested; swPlugin.ts
// calls them after `vite build` has written dist/.

export interface BuiltFile {
  /** Path relative to dist/, with forward slashes (e.g. "assets/index-abc.js"). */
  path: string;
  bytes: Uint8Array;
}

// Not precached: the worker itself, source maps, the .woff font fallbacks
// (every browser with service workers uses the .woff2 files), and the large
// install icons, which the OS fetches once when the game is added to a home screen.
const SKIP = [/^sw\.js$/, /\.map$/, /\.woff$/, /^icons\/icon-.*\.png$/];

/** The dist/ files to download on install, as URLs relative to the worker. */
export function precacheList(paths: string[]): string[] {
  return paths
    .filter((p) => !SKIP.some((re) => re.test(p)))
    .sort()
    .map((p) => `./${p}`);
}

/**
 * A short version id that changes whenever any precached file changes
 * (FNV-1a over every path and byte), so each deploy gets its own cache.
 */
export function cacheVersion(files: BuiltFile[]): string {
  let h = 0x811c9dc5;
  const mix = (b: number) => {
    h ^= b;
    h = Math.imul(h, 0x01000193) >>> 0;
  };
  const enc = new TextEncoder();
  for (const f of [...files].sort((a, b) => (a.path < b.path ? -1 : 1))) {
    for (const b of enc.encode(f.path)) mix(b);
    for (const b of f.bytes) mix(b);
  }
  return h.toString(36);
}

/** Fills the worker template's version and precache placeholders. */
export function fillWorker(template: string, version: string, urls: string[]): string {
  if (!template.includes("'__VS_VERSION__'") || !template.includes("['__VS_PRECACHE__']")) {
    throw new Error('sw.js template placeholders are missing');
  }
  return template
    .replace("'__VS_VERSION__'", JSON.stringify(version))
    .replace("['__VS_PRECACHE__']", JSON.stringify(urls));
}
