// Every local building style, park and signature landmark draws without
// errors at all three levels of detail and stays inside the world bounds the
// chunk renderer gives it (drawList.ts), so nothing clips at a chunk edge.
import { describe, expect, it } from 'vitest';
import { drawBuilding } from '../../src/art/buildings';
import { drawOffice, drawSite } from '../../src/art/buildingsOffice';
import { generateCityMap, tileAt, type LandmarkSite } from '../../src/art/citygen';
import { footprintBounds, landmarkBounds, tileHeightPx } from '../../src/art/drawList';
import { Engraver, type InkSet } from '../../src/art/engraver';
import { parkTrees } from '../../src/art/flora';
import { drawLandmark } from '../../src/art/landmarks';
import { artRng } from '../../src/art/prng';
import { styledHouse, type HouseKind } from '../../src/art/styleHouses';
import { STYLE_PROFILES } from '../../src/art/styleProfiles';
import { ROWS } from '../../src/art/styleRowSpecs';
import { rowBuilding } from '../../src/art/styleRows';
import { styledTower, type TowerKind } from '../../src/art/styleTowers';
import { CITIES } from '../../src/data/cities';
import { cityLook, type Signature, type Vernacular } from '../../src/data/cityLooks';
import { SIGNATURE_HEIGHT_PX } from '../../src/config/map';
import { newGame } from '../../src/sim/newGame';

/** A canvas stand-in that records the extent of everything drawn. */
function recorder() {
  const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  const stack: [number, number][] = [];
  let tx = 0;
  let ty = 0;
  const add = (x: number, y: number, rx = 0, ry = 0) => {
    box.x0 = Math.min(box.x0, x + tx - rx);
    box.x1 = Math.max(box.x1, x + tx + rx);
    box.y0 = Math.min(box.y0, y + ty - ry);
    box.y1 = Math.max(box.y1, y + ty + ry);
  };
  const reset = () => {
    box.x0 = box.y0 = Infinity;
    box.x1 = box.y1 = -Infinity;
  };
  const methods: Record<string, (...a: number[]) => void> = {
    moveTo: (x, y) => add(x!, y!),
    lineTo: (x, y) => add(x!, y!),
    quadraticCurveTo: (cx, cy, x, y) => {
      add((cx! + x!) / 2, (cy! + y!) / 2);
      add(x!, y!);
    },
    ellipse: (x, y, rx, ry) => add(x!, y!, rx, ry),
    arc: (x, y, r) => add(x!, y!, r, r),
    rect: (x, y, w, h) => {
      add(x!, y!);
      add(x! + w!, y! + h!);
    },
    save: () => stack.push([tx, ty]),
    restore: () => ([tx, ty] = stack.pop() ?? [0, 0]),
    translate: (x, y) => {
      tx += x!;
      ty += y!;
    },
  };
  const ctx = new Proxy(
    {},
    {
      get: (_t, k: string) => methods[k] ?? (() => undefined),
      set: () => true,
    },
  );
  return { ctx, box, reset };
}

function inks(lod: number): InkSet {
  const pattern = {} as CanvasPattern;
  const stop = [0.5, 1, 2][lod]!;
  return {
    ink: '#333333',
    paper: '#eeeeee',
    lod,
    stop,
    patterns: { light: pattern, medium: pattern, dense: pattern, shadow: pattern },
    roofPatterns: { roofLight: pattern, roofMedium: pattern, roofDense: pattern },
    tint: '#aabbcc',
    roof: '#cccccc',
    crown: '#cccccc',
    lawn: 'rgba(0,0,0,0.3)',
    paperPrint: pattern,
    waterPrint: pattern,
    outline: 1.15 / stop,
    detail: 0.65 / stop,
    inkA: () => '#333333',
  };
}

/** Line widths and round joins can poke a little past the geometry. */
const SLACK = 3;

function inside(
  box: { x0: number; y0: number; x1: number; y1: number },
  r: { x: number; y: number; w: number; h: number },
) {
  return (
    box.x0 >= r.x - SLACK &&
    box.y0 >= r.y - SLACK &&
    box.x1 <= r.x + r.w + SLACK &&
    box.y1 <= r.y + r.h + SLACK
  );
}

const nyc = (() => {
  const s = newGame({ seed: 42, cityId: 'nyc' });
  const lots = Object.values(s.world.lots).filter((l) => l.cityId === 'nyc');
  const offices = Object.values(s.world.officeListings).filter((o) => o.cityId === 'nyc');
  const sites = Object.values(s.world.sites).filter((x) => x.cityId === 'nyc');
  return generateCityMap(CITIES.nyc!, 42, lots, { offices, sites });
})();

describe('styled city art', () => {
  const styles = Object.keys(STYLE_PROFILES) as Vernacular[];

  it.each(styles)('%s buildings and parks stay inside their tile bounds', (style) => {
    const rec = recorder();
    const look = { ...cityLook('nyc'), style };
    const bad: string[] = [];
    for (let lod = 0; lod < 3; lod++) {
      const e = new Engraver(inks(lod), nyc.tiles, look);
      e.ctx = rec.ctx as CanvasRenderingContext2D;
      for (let i = 0; i < nyc.kind.length; i += lod === 1 ? 1 : 3) {
        const x = i % nyc.tiles;
        const y = Math.floor(i / nyc.tiles);
        const t = tileAt(nyc, x, y)!;
        if (!['building', 'lot', 'park', 'office', 'site'].includes(t.kind)) continue;
        rec.reset();
        if (t.kind === 'park') parkTrees(e, x, y, t.seed, i % 2 === 0);
        else if (t.kind === 'office') drawOffice(e, t, { type: 'player', ink: '#123456' });
        else if (t.kind === 'site') drawSite(e, t);
        else drawBuilding(e, t, { type: 'player', ink: '#123456' }, nyc);
        if (rec.box.x0 === Infinity) continue;
        const bounds = footprintBounds(nyc.tiles, x, y, 1, tileHeightPx(nyc, i));
        if (!inside(rec.box, bounds)) bad.push(`${t.kind} ${t.district} (${x},${y}) lod ${lod}`);
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });

  const signatures = Object.keys(SIGNATURE_HEIGHT_PX).filter((s) => s !== 'none') as Signature[];

  it.each(signatures)('the %s landmark stays inside its bounds at every zoom', (signature) => {
    const rec = recorder();
    const site: LandmarkSite = { id: 'signature', x: 13, y: 13, size: 3, signature };
    for (let lod = 0; lod < 3; lod++) {
      const e = new Engraver(inks(lod), nyc.tiles, cityLook('nyc'));
      e.ctx = rec.ctx as CanvasRenderingContext2D;
      rec.reset();
      drawLandmark(e, site, 1234);
      expect(rec.box.x0).toBeLessThan(Infinity);
      expect(inside(rec.box, landmarkBounds(nyc.tiles, site))).toBe(true);
      // Tall landmarks should actually use most of the height they reserve.
      const reserved = landmarkBounds(nyc.tiles, site);
      expect(rec.box.y0 - reserved.y).toBeLessThan(SIGNATURE_HEIGHT_PX[signature] * 0.4 + 40);
    }
  });

  it('draws the same buildings at every zoom stop (only detail changes)', () => {
    const rec = recorder();
    const houses: HouseKind[] = [
      'ranch',
      'modern',
      'porch',
      'bay',
      'shingle',
      'semi',
      'villa',
      'timber',
      'chalet',
      'tiny',
      'bungalow',
      'homestead',
    ];
    const towers: TowerKind[] = ['glass', 'stone', 'slab', 'pencil', 'podium', 'civic'];
    const fronts = [
      { a0: false, a1: false, b0: false, b1: true },
      { a0: true, a1: false, b0: true, b1: false },
      { a0: false, a1: true, b0: false, b1: true },
    ];
    for (let seed = 1; seed <= 12; seed++) {
      const shells = [0, 1, 2].map((lod) => {
        const e = new Engraver(inks(lod), nyc.tiles, cityLook('nyc'));
        e.ctx = rec.ctx as CanvasRenderingContext2D;
        e.origin(5, 5);
        const out: unknown[] = [];
        for (const h of houses) out.push(styledHouse(e, h, 4, artRng(seed)));
        for (const t of towers) out.push(styledTower(e, t, 6, artRng(seed)));
        for (const spec of Object.values(ROWS)) {
          for (const f of fronts)
            out.push(rowBuilding(e, 3, 5, f, spec, artRng(seed), seed % 2 === 0));
        }
        return out;
      });
      expect(shells[0]).toEqual(shells[1]);
      expect(shells[1]).toEqual(shells[2]);
    }
  });
});
