// The map's shape language and place-type inks (markers.ts), group-aware
// clustering (cluster.ts) and cluster labels (pinElements.tsx).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ICON_PATHS } from '../../src/art/icons';
import { clusterPins } from '../../src/app/map/cluster';
import {
  captionOf,
  clusterGroup,
  glyphInk,
  MARKERS,
  markerOf,
  rivalShortName,
  shapeOf,
  stackTier,
  ownedGlyph,
  pinShape,
  type MarkerId,
} from '../../src/app/map/markers';
import { clusterLabel } from '../../src/app/map/pinElements';
import { buildPins, type PinKind, type PinSpec } from '../../src/app/map/pins';
import { generateCityMap } from '../../src/art/citygen';
import { FEATURES } from '../../src/config/balance';
import { CITIES } from '../../src/data/cities';
import { RIVALS } from '../../src/data/rivals';
import { newGame } from '../../src/sim/newGame';

const ALL_KINDS: PinKind[] = [
  'mine',
  'hq',
  'rival',
  'office',
  'bureau',
  'agency',
  'centralBank',
  'rivalHq',
  'employer',
  'university',
  'investmentBank',
  'property',
  'conventionCenter',
  'lobbyingFirm',
  'airport',
  'autoDealer',
  'auctionHouse',
  'vacationHome',
  'stadium',
  'lot',
];

/** tokens.css custom properties → hex. */
const TOKENS = Object.fromEntries(
  [
    ...readFileSync('src/app/styles/tokens.css', 'utf8').matchAll(/(--[\w-]+):\s*(#[0-9a-f]{6})/gi),
  ].map((m) => [m[1]!, m[2]!]),
);
const hexOf = (cssVar: string) => TOKENS[cssVar.replace(/^var\((--[\w-]+)\)$/, '$1')]!;

/** WCAG relative luminance and contrast ratio. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

describe('shape language', () => {
  it('gives every pin kind a silhouette: banks crests, open lots coins', () => {
    expect(ALL_KINDS.filter((k) => shapeOf(k) === 'crest').sort()).toEqual(
      ['hq', 'mine', 'rival', 'rivalHq'].sort(),
    );
    expect(shapeOf('lot')).toBe('coin');
    expect(['office', 'property', 'vacationHome'].map((k) => shapeOf(k as PinKind))).toEqual([
      'tag',
      'tag',
      'tag',
    ]);
    expect(['centralBank', 'airport', 'stadium'].map((k) => shapeOf(k as PinKind))).toEqual([
      'landmark',
      'landmark',
      'landmark',
    ]);
    expect(shapeOf('bureau')).toBe('medallion');
  });

  it('gives every non-bank kind its own marker, glyph and caption', () => {
    const places = ALL_KINDS.filter((k) => !['crest', 'coin'].includes(shapeOf(k)));
    const markers = places.map((k) => markerOf(k));
    expect(markers.every(Boolean)).toBe(true);
    expect(new Set(markers).size).toBe(places.length);
    const glyphs = Object.values(MARKERS).map((m) => m.icon);
    expect(new Set(glyphs).size).toBe(glyphs.length);
    for (const m of Object.values(MARKERS)) {
      expect(ICON_PATHS[m.icon]).toBeTruthy();
      expect(m.caption).toMatch(/^[A-Z][a-z ]+$/);
    }
  });

  it('gives every type its own readable ink from tokens.css', () => {
    const ids = Object.keys(MARKERS) as MarkerId[];
    const inks = ids.map((id) => hexOf(MARKERS[id].ink));
    expect(inks.every(Boolean)).toBe(true);
    expect(new Set(inks).size).toBe(ids.length);
    for (const id of ids) {
      // Glyphs and tag words on the ink: AA for small text.
      expect(contrast(hexOf(MARKERS[id].ink), hexOf(glyphInk(id))), id).toBeGreaterThanOrEqual(4.5);
      // Dark inks also stand out on the map paper.
      if (!MARKERS[id].glyph)
        expect(contrast(hexOf(MARKERS[id].ink), TOKENS['--paper']!), id).toBeGreaterThan(4.5);
    }
  });

  it('stacks open lots lowest, tags under places, landmarks above, yours on top', () => {
    expect(stackTier('lot')).toBeLessThan(stackTier('office'));
    expect(stackTier('office')).toBeLessThan(stackTier('bureau'));
    expect(stackTier('rival')).toBe(stackTier('bureau'));
    expect(stackTier('bureau')).toBeLessThan(stackTier('airport'));
    expect(stackTier('airport')).toBeLessThan(stackTier('mine'));
    expect(stackTier('hq')).toBe(stackTier('mine'));
  });
});

describe('captions', () => {
  it("shortens a rival's name to its distinctive words", () => {
    expect(rivalShortName('Harbourline AI')).toBe('Harbourline');
    expect(rivalShortName('Lumière IA')).toBe('Lumière');
    expect(rivalShortName('Kingsbury Cognition')).toBe('Kingsbury');
    expect(rivalShortName('Thameside Open Lab')).toBe('Thameside');
    expect(rivalShortName('Southern Cross AI')).toBe('Southern Cross');
    expect(rivalShortName('Fizz')).toBe('Fizz');
    for (const r of Object.values(RIVALS)) expect(rivalShortName(r.name).length).toBeGreaterThan(2);
  });

  it("uses the pin's own caption, else the type's, else none", () => {
    expect(captionOf({ kind: 'rival', caption: 'Fizz' })).toBe('Fizz');
    expect(captionOf({ kind: 'auctionHouse' })).toBe('Auction house');
    expect(captionOf({ kind: 'bureau' })).toBe('Data vendor');
    expect(captionOf({ kind: 'lot' })).toBe('');
    expect(captionOf({ kind: 'mine' })).toBe('');
  });

  it("captions rival branches and head offices with the bank's short name", () => {
    const s = newGame({ seed: 42, cityId: 'cal', bankName: 'Pin Bank' });
    const lots = Object.values(s.world.lots).filter((l) => l.cityId === 'cal');
    const sites = Object.values(s.world.sites).filter((x) => x.cityId === 'cal');
    const map = generateCityMap(CITIES.cal!, s.meta.seed, lots, { sites });
    const pins = buildPins(s, map, lots, { ...FEATURES, competition: true, hq: true });
    const rival = pins.find((p) => p.kind === 'rival')!;
    expect(rival.caption).toBe(rivalShortName(rival.label.split(' sales office, ')[0]!));
    const hq = pins.find((p) => p.kind === 'rivalHq')!;
    expect(hq.caption).toMatch(/ HQ$/);
  });
});

describe('clustering like with like', () => {
  const pin = (id: string, kind: PinKind, x: number, extra: Partial<PinSpec> = {}): PinSpec => ({
    id,
    kind,
    x,
    y: 0,
    label: id,
    ink: '#123456',
    monogram: 'AB',
    badge: false,
    ...extra,
  });

  it('groups yours, rivals, open lots, places and tags apart; landmarks never merge', () => {
    expect(clusterGroup(pin('a', 'mine', 0))).toBe(clusterGroup(pin('b', 'hq', 0)));
    expect(clusterGroup(pin('a', 'rival', 0))).toBe(clusterGroup(pin('b', 'rivalHq', 0)));
    expect(clusterGroup(pin('a', 'bureau', 0))).toBe(clusterGroup(pin('b', 'employer', 0)));
    expect(clusterGroup(pin('a', 'office', 0))).toBe(clusterGroup(pin('b', 'property', 0)));
    const groups = ['mine', 'rival', 'lot', 'bureau', 'office'].map((k) =>
      clusterGroup(pin('x', k as PinKind, 0)),
    );
    expect(new Set(groups).size).toBe(5);
    expect(clusterGroup(pin('a', 'airport', 0))).not.toBe(clusterGroup(pin('b', 'centralBank', 0)));
  });

  it('only merges pins of the same group', () => {
    const pins = [
      pin('m', 'mine', 0),
      pin('r1', 'rival', 5),
      pin('r2', 'rival', 10),
      pin('l1', 'lot', 12),
      pin('l2', 'lot', 14),
      pin('b', 'bureau', 8),
    ];
    const cl = clusterPins(pins, 36, clusterGroup);
    expect(cl.map((c) => c.members.map((m) => m.id))).toEqual([
      ['m'],
      ['r1', 'r2'],
      ['l1', 'l2'],
      ['b'],
    ]);
    // Without a group function everything nearby merges, as before.
    expect(clusterPins(pins, 36)).toHaveLength(1);
  });

  it('says what a cluster holds', () => {
    const lots = [pin('l1', 'lot', 0), pin('l2', 'lot', 1)];
    expect(clusterLabel('lot', lots)).toBe('2 open sales office locations. Zoom in');
    const yours = [pin('a', 'mine', 0, { badge: true }), pin('b', 'hq', 0)];
    expect(clusterLabel('yours', yours)).toBe(
      'Your 1 sales office and HQ, proposal requests waiting. Zoom in',
    );
    const rivals = [
      pin('a', 'rival', 0, { caption: 'Fizz' }),
      pin('b', 'rival', 0, { caption: 'Volt' }),
      pin('c', 'rival', 0, { caption: 'Fizz' }),
    ];
    expect(clusterLabel('rival', rivals)).toBe('3 rival lab buildings: Fizz, Volt. Zoom in');
    const places = [pin('a', 'bureau', 0), pin('b', 'employer', 0, { alert: true })];
    expect(clusterLabel('medallion', places)).toBe(
      '2 places: Data vendor, Employer, open incident. Zoom in',
    );
  });
});

describe('places you own', () => {
  it('wear your crest with their own glyph, on top and in your cluster', () => {
    expect(pinShape({ kind: 'property', owned: true })).toBe('crest');
    expect(pinShape({ kind: 'property' })).toBe('tag');
    expect(
      ['hq', 'property', 'vacationHome', 'stadium'].map((k) => ownedGlyph(k as PinKind)),
    ).toEqual(['office', 'realEstate', 'villa', 'trophy']);
    expect(stackTier('vacationHome', true)).toBe(stackTier('mine'));
    expect(clusterGroup({ id: 'a', kind: 'property', owned: true })).toBe(
      clusterGroup({ id: 'b', kind: 'mine' }),
    );
  });
});
