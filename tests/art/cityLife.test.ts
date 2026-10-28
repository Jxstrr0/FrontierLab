// City life (ART_DIRECTION §2.3): the moving layer's routes, movers and
// occlusion, and the static street props (parked cars, café tables, washing
// lines, cranes) staying inside the bounds the chunk renderer gives their tile.
import { describe, expect, it } from 'vitest';
import { cityMood, moodKey } from '../../src/app/map/cityMood';
import { drawBuilding } from '../../src/art/buildings';
import { KIND } from '../../src/art/cityBlocks';
import { DECOR } from '../../src/art/cityDecor';
import { generateCityMap, tileAt } from '../../src/art/citygen';
import { footprintBounds, tileHeightPx } from '../../src/art/drawList';
import { Engraver } from '../../src/art/engraver';
import { castFor, poseAt, wanderAt, type LifeMood } from '../../src/art/lifeMovers';
import { buildOcclusion } from '../../src/art/lifeOcclusion';
import { buildLifeRoutes, doorOf } from '../../src/art/lifeRoutes';
import { drawStreetLife } from '../../src/art/streetLife';
import { hasCafe, hasParkedCars } from '../../src/art/streetProps';
import { CITY_LAYOUT } from '../../src/config/balance';
import { CARS } from '../../src/config/cityLife';
import { CITIES } from '../../src/data/cities';
import { cityLook } from '../../src/data/cityLooks';
import { newGame } from '../../src/sim/newGame';
import { inks, recorder } from '../helpers/artRecorder';

const s = newGame({ seed: 42, cityId: 'nyc' });
const lots = Object.values(s.world.lots).filter((l) => l.cityId === 'nyc');
const sites = Object.values(s.world.sites).filter((x) => x.cityId === 'nyc');
const map = generateCityMap(CITIES.nyc!, 42, lots, { sites });
const routes = buildLifeRoutes(map);
const CALM: LifeMood = { busy: 1, offices: [], dataCenters: [] };

describe('city life routes', () => {
  it('runs cars only along drivable street lines', () => {
    expect(routes.streets.length).toBeGreaterThan(10);
    for (const r of routes.streets) {
      expect(r.fixed % CITY_LAYOUT.block).toBe(0);
      for (let k = r.from; k < r.to; k++) {
        const [x, y] = r.axis === 'x' ? [k, r.fixed] : [r.fixed, k];
        const i = y * map.tiles + x;
        const bridge = map.geo.bridge[i]! & (r.axis === 'x' ? 1 : 2);
        expect(map.kind[i] === KIND.street || bridge !== 0).toBe(true);
      }
    }
  });

  it('finds the street door of a lot', () => {
    const lot = lots[0]!;
    const door = doorOf(map, lot.tile.x, lot.tile.y)!;
    expect(door).toBeDefined();
    expect(map.kind[door.sy * map.tiles + door.sx]).toBe(KIND.street);
  });
});

describe('city life movers', () => {
  it('is the same cast every time, and busier streets in a boom', () => {
    const a = castFor(map, routes, CALM);
    const b = castFor(map, routes, CALM);
    expect(a).toEqual(b);
    const boom = castFor(map, routes, { ...CALM, busy: 1.35 });
    const slump = castFor(map, routes, { ...CALM, busy: 0.45 });
    const cars = (c: typeof a) => c.paths.filter((m) => m.kind === 'car').length;
    expect(cars(boom)).toBeGreaterThan(cars(a));
    expect(cars(a)).toBeGreaterThan(cars(slump));
  });

  it('keeps cars in a lane apart, and on their line', () => {
    const cast = castFor(map, routes, CALM);
    const lanes = new Map<string, typeof cast.paths>();
    for (const m of cast.paths) {
      if (m.kind !== 'car' && m.kind !== 'bus') continue;
      const key = m.pts.join(',');
      lanes.set(key, [...(lanes.get(key) ?? []), m]);
    }
    for (const t of [0, 7.3, 61]) {
      for (const list of lanes.values()) {
        const at = list.map((m) => poseAt(m, t)).filter((p) => p !== null);
        for (const p of at) {
          const m = list[0]!;
          // On the polyline's box.
          expect(p.x).toBeGreaterThanOrEqual(m.box[0] - 1e-9);
          expect(p.x).toBeLessThanOrEqual(m.box[2] + 1e-9);
        }
        for (let i = 0; i < at.length; i++)
          for (let j = i + 1; j < at.length; j++) {
            const d = Math.hypot(at[i]!.x - at[j]!.x, at[i]!.y - at[j]!.y);
            // Wrapping cars meet only at the faded ends.
            if (at[i]!.alpha > 0.5 && at[j]!.alpha > 0.5) expect(d).toBeGreaterThan(CARS.busLen);
          }
      }
    }
  });

  it('sends people to busy offices and none to an empty one', () => {
    const lot = lots[0]!;
    const busy = castFor(map, routes, { ...CALM, offices: [{ ...lot.tile, level: 1 }] });
    const quiet = castFor(map, routes, { ...CALM, offices: [{ ...lot.tile, level: 0 }] });
    const people = (c: typeof busy) => c.paths.filter((m) => m.kind === 'person').length;
    expect(people(busy)).toBeGreaterThan(people(quiet));
  });

  it('shuttles walkers between the ends and wanders inside the tile', () => {
    const cast = castFor(map, routes, CALM);
    const walker = cast.paths.find((m) => m.kind === 'person')!;
    const p = poseAt(walker, 3)!;
    expect(p.x).toBeGreaterThanOrEqual(walker.box[0] - 1e-9);
    expect(p.y).toBeLessThanOrEqual(walker.box[3] + 1e-9);
    for (const w of cast.wanderers.slice(0, 20)) {
      for (const t of [0, 4.5, 33]) {
        const q = wanderAt(w, t, 0.3);
        expect(q.x).toBeGreaterThan(w.x);
        expect(q.x).toBeLessThan(w.x + 1);
        expect(q.y).toBeGreaterThan(w.y);
        expect(q.y).toBeLessThan(w.y + 1);
      }
    }
  });
});

describe('city life occlusion', () => {
  it('hides a point just behind a tall building, not one in open street', () => {
    const occ = buildOcclusion(map);
    const n = map.tiles;
    // A street tile with a tall building diagonally in front of it.
    let found = false;
    for (let i = 0; i < n * n && !found; i++) {
      const x = i % n;
      const y = (i - x) / n;
      if (map.kind[i] !== KIND.street || x + 1 >= n || y + 1 >= n) continue;
      const front = (y + 1) * n + x + 1;
      if (map.kind[front] !== KIND.building || map.floors[front]! < 8) continue;
      expect(occ.hidden(x + 0.6, y + 0.6, 1)).toBe(true);
      found = true;
    }
    expect(found).toBe(true);
    // High above the city nothing hides it.
    expect(occ.hidden(n / 2, n / 2, 2000)).toBe(false);
  });
});

describe('street props', () => {
  it('parks cars and sets café tables on some tiles, and draws them inside their bounds', () => {
    const rec = recorder();
    const bad: string[] = [];
    let parked = 0;
    let cafes = 0;
    for (let lod = 0; lod < 3; lod++) {
      const e = new Engraver(inks(lod), map.tiles, cityLook('nyc'));
      e.ctx = rec.ctx as CanvasRenderingContext2D;
      for (let i = 0; i < map.kind.length; i++) {
        const x = i % map.tiles;
        const y = (i - x) / map.tiles;
        const h = tileHeightPx(map, i);
        const street = map.kind[i] === KIND.street && hasParkedCars(map, i);
        const plaza = (map.decor[i]! & (DECOR.plaza | DECOR.fountain)) === DECOR.plaza;
        const cafe = map.kind[i] === KIND.park && plaza && hasCafe(map, i);
        if (cafe) cafes++;
        if (!street && !cafe) continue;
        if (street) parked++;
        rec.reset();
        expect(drawStreetLife(e, map, x, y)).toBe(true);
        if (rec.box.x0 === Infinity) continue;
        const r = footprintBounds(map.tiles, x, y, 1, h);
        if (rec.box.y0 < r.y - 3 || rec.box.y1 > r.y + r.h + 3) bad.push(`(${x},${y}) lod ${lod}`);
      }
    }
    expect(parked).toBeGreaterThan(50);
    expect(cafes).toBeGreaterThan(0);
    expect(bad.slice(0, 5)).toEqual([]);
  });

  it('keeps a crane over a lot being fitted out inside its bounds', () => {
    const rec = recorder();
    const bad: string[] = [];
    for (let lod = 0; lod < 3; lod++) {
      const e = new Engraver(inks(lod), map.tiles, cityLook('nyc'));
      e.ctx = rec.ctx as CanvasRenderingContext2D;
      for (const lot of lots) {
        const t = tileAt(map, lot.tile.x, lot.tile.y)!;
        for (const building of [undefined, 'dataCenter'] as const) {
          rec.reset();
          drawBuilding(e, t, { type: 'player', ink: '#123456', building, fitout: true }, map);
          const r = footprintBounds(
            map.tiles,
            t.x,
            t.y,
            1,
            tileHeightPx(map, t.y * map.tiles + t.x),
          );
          if (rec.box.y0 < r.y - 3 || rec.box.x1 > r.x + r.w + 3) bad.push(`${lot.id} ${building}`);
        }
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });
});

describe('city mood', () => {
  it('reads the economy, and changes its key when the economy turns', () => {
    const g = newGame({ seed: 42, cityId: 'nyc' });
    const m = cityMood(g);
    expect(m.busy).toBeGreaterThan(0);
    const country = g.world.countries[CITIES.nyc!.country]!;
    const before = moodKey(m);
    country.phase = country.phase === 'recession' ? 'expansion' : 'recession';
    expect(moodKey(cityMood(g))).not.toBe(before);
  });
});
