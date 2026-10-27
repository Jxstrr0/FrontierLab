// Generates the PWA / home-screen icons in public/icons/ from an SVG brand mark:
// a brass "FL" monogram medallion with a guilloche band on vault navy
// (ART_DIRECTION §1, Banknote Deco; an original design). The SVG is built here,
// then rasterised with Chromium through Playwright so the monogram uses the
// bundled Bodoni Moda face. The PNGs are committed; re-run only when the mark changes.
//
//   NODE_PATH=$(npm root -g) npx tsx scripts/icons.ts
//
// Playwright is not a project dependency: the script loads whichever copy is
// installed globally (or via NODE_PATH).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { rosettePaths } from '../src/art/guilloche';

const C = 256; // master canvas is 512×512 SVG units
const VAULT = '#131d33';
const VAULT_DEEP = '#0a1222';
const BRASS = '#b8913d';
const BRASS_LIGHT = '#d9be7a';

/** The medallion at its natural size (outer radius ~232 of 512). */
function medallion(): string {
  const band = rosettePaths(C, C, { radius: 210, petals: 24, depth: 0.14 }, 5, 480)
    .map((d) => `<path d="${d}"/>`)
    .join('');
  const inner = rosettePaths(C, C, { radius: 176, petals: 36, depth: 0.04 }, 3, 480)
    .map((d) => `<path d="${d}"/>`)
    .join('');
  const diamonds = [0, 90, 180, 270]
    .map((a) => `<path transform="rotate(${a} ${C} ${C})" d="M${C} 74 l7 9 -7 9 -7 -9z"/>`)
    .join('');
  return `
    <circle cx="${C}" cy="${C}" r="226" fill="${VAULT}" stroke="${BRASS}" stroke-width="10"/>
    <circle cx="${C}" cy="${C}" r="214" fill="none" stroke="${BRASS_LIGHT}" stroke-width="1.6"/>
    <g fill="none" stroke="${BRASS}" stroke-width="1.3" opacity="0.8">${band}</g>
    <circle cx="${C}" cy="${C}" r="172" fill="${VAULT_DEEP}" stroke="${BRASS}" stroke-width="3"/>
    <g fill="none" stroke="${BRASS}" stroke-width="0.9" opacity="0.45">${inner}</g>
    <circle cx="${C}" cy="${C}" r="160" fill="${VAULT_DEEP}" stroke="${BRASS}" stroke-opacity="0.5" stroke-width="1.2"/>
    <g fill="${BRASS_LIGHT}">${diamonds}</g>
    <text x="${C}" y="${C + 50}" text-anchor="middle" font-family="Bodoni Moda" font-weight="900"
      font-size="152" letter-spacing="-6" fill="${BRASS_LIGHT}">FL</text>
    <path d="M${C - 64} ${C + 82} h50 M${C + 14} ${C + 82} h50" stroke="${BRASS}" stroke-width="2"/>
    <path d="M${C} ${C + 74} l7 8 -7 8 -7 -8z" fill="${BRASS}"/>`;
}

/** Full-bleed navy square with the medallion scaled to `fill` of the width. */
function iconSvg(fill: number): string {
  const s = (fill * 256) / 232;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
    <rect width="512" height="512" fill="${VAULT_DEEP}"/>
    <g transform="translate(${C} ${C}) scale(${s}) translate(${-C} ${-C})">${medallion()}</g>
  </svg>`;
}

// name, pixel size, medallion diameter as a share of the icon. Maskable icons
// keep the art inside the central 80% safe circle (W3C manifest "maskable").
const OUTPUTS: [string, number, number][] = [
  ['icon-192.png', 192, 0.9],
  ['icon-512.png', 512, 0.9],
  ['icon-maskable-512.png', 512, 0.76],
  ['apple-touch-icon.png', 180, 0.84],
];

/** The few Playwright calls used here (it isn't a dependency, so no types). */
interface Shot {
  setContent(html: string): Promise<void>;
  evaluate(fn: () => Promise<unknown>): Promise<unknown>;
  screenshot(o: { type: 'png' }): Promise<Buffer>;
  close(): Promise<void>;
}
interface Browser {
  newPage(o: { viewport: { width: number; height: number } }): Promise<Shot>;
  close(): Promise<void>;
}

async function main(): Promise<void> {
  const require = createRequire(import.meta.url);
  const { chromium } = require('playwright') as { chromium: { launch(): Promise<Browser> } };
  const font = readFileSync(
    require.resolve('@fontsource/bodoni-moda/files/bodoni-moda-latin-900-normal.woff2'),
  ).toString('base64');
  const outDir = new URL('../public/icons/', import.meta.url);
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  for (const [name, px, fill] of OUTPUTS) {
    const page = await browser.newPage({ viewport: { width: px, height: px } });
    await page.setContent(`<!doctype html><style>
      @font-face { font-family: 'Bodoni Moda'; font-weight: 900;
        src: url(data:font/woff2;base64,${font}) format('woff2'); }
      html, body { margin: 0; width: ${px}px; height: ${px}px; overflow: hidden; }
      svg { display: block; }
    </style><body>${iconSvg(fill)}</body>`);
    await page.evaluate(() =>
      document.fonts.ready.then(() => document.fonts.load("900 20px 'Bodoni Moda'")),
    );
    const png = await page.screenshot({ type: 'png' });
    writeFileSync(new URL(name, outDir), png);
    console.log(`public/icons/${name} (${png.length} bytes)`);
    await page.close();
  }
  await browser.close();
}

void main();
