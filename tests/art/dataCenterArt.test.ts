// Data center map art (stage C8c, ART_DIRECTION §2): the low hall on a
// storefront lot and the energy site's substation yard (with or without a
// hall) draw at every zoom stop inside the bounds the chunk renderer gives
// their tile, so nothing clips at a chunk edge; and the renderer is told which
// lots and energy sites hold a data center.
import { describe, expect, it } from 'vitest';
import { occupantsKey, occupantsOf } from '../../src/app/map/pins';
import { drawBuilding } from '../../src/art/buildings';
import { drawSite } from '../../src/art/buildingsOffice';
import { generateCityMap, tileAt } from '../../src/art/citygen';
import { footprintBounds, tileHeightPx } from '../../src/art/drawList';
import { Engraver, type InkSet } from '../../src/art/engraver';
import type { LotOccupant } from '../../src/art/mapRenderer';
import { CITIES } from '../../src/data/cities';
import { cityLook } from '../../src/data/cityLooks';
import { DEFAULT_DC_BUILD } from '../../src/data/dataCenters';
import * as cmd from '../../src/sim/commands';
import { newGame } from '../../src/sim/newGame';
import { addCapital } from '../helpers/mergers';
import { freeLot } from '../helpers/scenario';

/** A canvas stand-in that records the extent of every point drawn. */
function recorder() {
  const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  const add = (x: number, y: number, rx = 0, ry = 0) => {
    box.x0 = Math.min(box.x0, x - rx);
    box.x1 = Math.max(box.x1, x + rx);
    box.y0 = Math.min(box.y0, y - ry);
    box.y1 = Math.max(box.y1, y + ry);
  };
  const methods: Record<string, (...a: number[]) => void> = {
    moveTo: (x, y) => add(x!, y!),
    lineTo: (x, y) => add(x!, y!),
    ellipse: (x, y, rx, ry) => add(x!, y!, rx, ry),
  };
  const ctx = new Proxy(
    {},
    { get: (_t, k: string) => methods[k] ?? (() => undefined), set: () => true },
  );
  const reset = () => {
    box.x0 = box.y0 = Infinity;
    box.x1 = box.y1 = -Infinity;
  };
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

const HALL: LotOccupant = { type: 'player', ink: '#123456', building: 'dataCenter' };
const YARD: LotOccupant = { type: 'site', ink: '', building: 'energySite' };

describe('data center map art', () => {
  const s = newGame({ seed: 42, cityId: 'nyc' });
  const lots = Object.values(s.world.lots).filter((l) => l.cityId === 'nyc');
  const sites = Object.values(s.world.sites).filter((x) => x.cityId === 'nyc');
  const map = generateCityMap(CITIES.nyc!, 42, lots, { sites });

  it('keeps the hall and the energy yard inside their tile bounds at every zoom', () => {
    const rec = recorder();
    const bad: string[] = [];
    for (let lod = 0; lod < 3; lod++) {
      const e = new Engraver(inks(lod), map.tiles, cityLook('nyc'));
      e.ctx = rec.ctx as CanvasRenderingContext2D;
      for (let i = 0; i < map.kind.length; i++) {
        const t = tileAt(map, i % map.tiles, Math.floor(i / map.tiles))!;
        if (t.kind !== 'lot' && t.kind !== 'site') continue;
        for (const occ of t.kind === 'lot' ? [HALL] : [HALL, YARD]) {
          rec.reset();
          if (t.kind === 'lot') drawBuilding(e, t, occ, map);
          else drawSite(e, t, occ);
          expect(rec.box.x0).toBeLessThan(Infinity);
          const r = footprintBounds(map.tiles, t.x, t.y, 1, tileHeightPx(map, i));
          const ok =
            rec.box.x0 >= r.x - SLACK &&
            rec.box.y0 >= r.y - SLACK &&
            rec.box.x1 <= r.x + r.w + SLACK &&
            rec.box.y1 <= r.y + r.h + SLACK;
          if (!ok) bad.push(`${t.kind} ${occ.building} (${t.x},${t.y}) lod ${lod}`);
        }
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });
});

describe('data center occupants', () => {
  it('marks your data center lot and energy sites for the renderer', () => {
    const s = newGame({ seed: 7, cityId: 'cal', startCash: 1_500_000 });
    addCapital(s, 60_000_000);
    const lot = freeLot(s);
    const r = cmd.buildDataCenter(s, { where: { lotId: lot.id }, build: DEFAULT_DC_BUILD });
    expect(r.ok).toBe(true);
    const lots = Object.values(s.world.lots);
    const before = occupantsOf(s, lots);
    expect(before[lot.id]).toEqual({
      type: 'player',
      ink: s.meta.brandInk,
      building: 'dataCenter',
    });
    // Rival storefronts keep their plain occupant.
    expect(Object.values(before).some((o) => o.type === 'rival' && !o.building)).toBe(true);

    cmd.travelTo(s, 'fmm');
    const site = Object.values(s.world.sites).find((x) => x.cityId === 'fmm')!;
    expect(occupantsOf(s, lots)[site.id]).toEqual({
      type: 'site',
      ink: '',
      building: 'energySite',
    });
    const empty = occupantsKey(occupantsOf(s, lots));
    expect(cmd.buildDataCenter(s, { where: { siteId: site.id }, build: DEFAULT_DC_BUILD }).ok).toBe(
      true,
    );
    const built = occupantsOf(s, lots);
    expect(built[site.id]).toEqual({
      type: 'player',
      ink: s.meta.brandInk,
      building: 'dataCenter',
    });
    expect(occupantsKey(built)).not.toBe(empty);
  });
});
