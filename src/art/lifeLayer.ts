// The moving layer over the engraved city (ART_DIRECTION §2.3). The city art is
// cached in chunks and never redrawn for motion; this layer is a second,
// transparent canvas that only draws what moves: traffic, people, boats,
// fountain spray, data center steam and the odd flock of birds. Every pose is
// a pure function of time, only movers near the screen are drawn, and things
// behind buildings are left out (lifeOcclusion.ts).
import {
  BIRDS,
  DATA_CENTER_LIFE,
  LIFE_PEOPLE_MIN_ZOOM,
  LIFE_VIEW_PAD_PX,
  PEOPLE,
  SPRAY,
} from '../config/cityLife';
import { STOREY_PX } from '../config/map';
import { cityLook } from '../data/cityLooks';
import { mix, type Ctx2D } from './canvasKit';
import type { CityMap } from './citygen';
import { isoPoint, worldSize } from './iso';
import {
  castFor,
  lifeSeed,
  poseAt,
  wanderAt,
  type Cast,
  type LifeMood,
  type PathMover,
  type Pose,
} from './lifeMovers';
import { buildOcclusion } from './lifeOcclusion';
import { buildLifeRoutes } from './lifeRoutes';
import * as sprite from './lifeSprites';
import type { Camera, MapStyle, Viewport } from './mapRenderer';
import { artRng, mixSeed } from './prng';

export interface LifeLayer {
  setMood(mood: LifeMood): void;
  /** Clears ctx (sized width × dpr by height × dpr) and draws life at time t (seconds). */
  draw(ctx: Ctx2D, cam: Camera, view: Viewport, t: number): void;
}

type Box = { x0: number; y0: number; x1: number; y1: number };
type Item = { depth: number; draw: () => void };

/** Golden angle, for spreading fountain drops around the jet. */
const GOLDEN = 2.399963;

export function createLifeLayer(map: CityMap, style: MapStyle): LifeLayer {
  const tiles = map.tiles;
  const routes = buildLifeRoutes(map);
  const occlusion = buildOcclusion(map);
  const seed = lifeSeed(map);
  const tint = cityLook(map.cityId).tint;
  const { ink, paper } = style;
  const baseInks: Omit<sprite.LifeInks, 'line'> = {
    ink,
    paper,
    light: mix(paper, ink, 0.12),
    medium: mix(paper, ink, 0.32),
    bodies: [
      paper,
      mix(paper, tint, 0.55),
      tint,
      mix(paper, ink, 0.5),
      mix(paper, ink, 0.22),
      paper,
    ],
    coats: [ink, mix(ink, tint, 0.5), mix(paper, ink, 0.6), tint],
  };
  let mood: LifeMood = { busy: 1, offices: [], dataCenters: [] };
  let cast: Cast = castFor(map, routes, mood);
  let boxes: Box[] = cast.paths.map(worldBox);

  function worldBox(m: PathMover): Box {
    const [x0, y0, x1, y1] = m.box;
    const left = isoPoint(tiles, x0, y1, 0);
    const right = isoPoint(tiles, x1, y0, 0);
    const top = isoPoint(tiles, x0, y0, 0);
    const bottom = isoPoint(tiles, x1, y1, 0);
    return { x0: left.x, y0: top.y, x1: right.x, y1: bottom.y };
  }

  return {
    setMood(next) {
      mood = next;
      cast = castFor(map, routes, mood);
      boxes = cast.paths.map(worldBox);
    },

    draw(ctx, cam, view, t) {
      const dpr = view.devicePixelRatio;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      const s = cam.zoom * dpr;
      ctx.setTransform(s, 0, 0, s, -cam.x * s, -cam.y * s);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      const pad = LIFE_VIEW_PAD_PX / cam.zoom;
      const v = {
        x0: cam.x - pad,
        y0: cam.y - pad,
        x1: cam.x + view.width / cam.zoom + pad,
        y1: cam.y + view.height / cam.zoom + pad,
      };
      const inView = (p: { x: number; y: number }) =>
        p.x >= v.x0 && p.x <= v.x1 && p.y >= v.y0 && p.y <= v.y1;
      const css = Math.max(0.5, Math.min(1.1, 0.6 * cam.zoom));
      const inks: sprite.LifeInks = { ...baseInks, line: css / cam.zoom };
      const people = cam.zoom >= LIFE_PEOPLE_MIN_ZOOM;
      const items: Item[] = [];
      const add = (p: Pose, depthZ: number, z: number, draw: () => void) => {
        if (occlusion.hidden(p.x, p.y, z)) return;
        items.push({ depth: p.x + p.y + depthZ, draw });
      };

      cast.paths.forEach((m, k) => {
        const b = boxes[k]!;
        if (b.x1 < v.x0 || b.x0 > v.x1 || b.y1 < v.y0 || b.y0 - 20 > v.y1) return;
        if (m.kind === 'person' && !people) return;
        const p = poseAt(m, t);
        if (!p || p.alpha <= 0.02) return;
        const draw = () => {
          ctx.globalAlpha = p.alpha;
          if (m.kind === 'car') sprite.car(ctx, tiles, p, m.tone, inks);
          else if (m.kind === 'bus') sprite.bus(ctx, tiles, p, inks);
          else if (m.kind === 'truck') sprite.truck(ctx, tiles, p, m.ink ?? ink, inks);
          else if (m.kind === 'boat') sprite.boat(ctx, tiles, p, inks);
          else sprite.person(ctx, tiles, p, m.tone, inks);
          ctx.globalAlpha = 1;
        };
        add(p, 0, 1, draw);
      });

      if (people) {
        for (const w of cast.wanderers) {
          if (!inView(isoPoint(tiles, w.x + 0.5, w.y + 0.5, 0))) continue;
          const p = wanderAt(w, t, PEOPLE.pause);
          add(p, 0, 1, () => sprite.person(ctx, tiles, p, w.tone, inks));
        }
        for (const f of routes.fountains) {
          if (!inView(isoPoint(tiles, f.x, f.y, f.topPx))) continue;
          add({ x: f.x, y: f.y, dx: 0, dy: 0, alpha: 1 }, 0.01, f.topPx, () =>
            spray(ctx, f, t, inks),
          );
        }
      }

      ctx.strokeStyle = ink;
      ctx.lineWidth = inks.line;
      items.sort((a, b) => a.depth - b.depth);
      for (const it of items) {
        ctx.strokeStyle = ink;
        ctx.lineWidth = inks.line;
        it.draw();
      }
      ctx.strokeStyle = ink;
      ctx.lineWidth = inks.line;
      for (const d of mood.dataCenters) steam(ctx, d, t, inks, inView);
      birds(ctx, t, inks, cam.zoom);
    },
  };

  function spray(
    ctx: Ctx2D,
    f: (typeof routes.fountains)[number],
    t: number,
    inks: sprite.LifeInks,
  ) {
    for (let j = 0; j < SPRAY.drops; j++) {
      const p = (t / SPRAY.seconds + j / SPRAY.drops) % 1;
      const ang = j * GOLDEN;
      const r = SPRAY.reach * p;
      const z = f.topPx + SPRAY.risePx * 4 * p * (1 - p) * 0.4 - (f.topPx - 2) * p * p;
      sprite.drop(ctx, isoPoint(tiles, f.x + Math.cos(ang) * r, f.y + Math.sin(ang) * r, z), inks);
    }
  }

  function steam(
    ctx: Ctx2D,
    d: LifeMood['dataCenters'][number],
    t: number,
    inks: sprite.LifeInks,
    inView: (p: { x: number; y: number }) => boolean,
  ) {
    const roof = DATA_CENTER_LIFE.roofStoreys * STOREY_PX;
    if (!d.steam || !inView(isoPoint(tiles, d.x + 0.5, d.y + 0.4, roof))) return;
    const count = Math.round(DATA_CENTER_LIFE.puffs * Math.max(0, Math.min(1, d.level)));
    for (let j = 0; j < count; j++) {
      const p = (t / DATA_CENTER_LIFE.puffSeconds + j / count) % 1;
      // Puffs leave from the rooftop chillers, spread along the hall.
      const along = 0.25 + 0.5 * ((j * 0.618) % 1);
      const at = isoPoint(
        tiles,
        d.x + along + 0.12 * p,
        d.y + 0.35,
        roof + DATA_CENTER_LIFE.puffRisePx * p,
      );
      sprite.puff(ctx, at, p, inks);
    }
  }

  /** Flocks crossing the map: each crossing picks a new seeded line from one side to the other. */
  function birds(ctx: Ctx2D, t: number, inks: sprite.LifeInks, zoom: number) {
    const { width, height } = worldSize(tiles);
    const cycle = BIRDS.crossSeconds + BIRDS.gapSeconds;
    ctx.beginPath();
    for (let f = 0; f < BIRDS.flocks; f++) {
      const u = t / cycle + f / BIRDS.flocks;
      const round = Math.floor(u);
      const p = ((u - round) * cycle) / BIRDS.crossSeconds;
      if (p > 1) continue;
      const rng = artRng(mixSeed(seed, 9, f, round));
      const ltr = rng.chance(0.5);
      const y0 = rng.range(0.15, 0.75) * height;
      const y1 = y0 + rng.range(-0.25, 0.25) * height;
      const x = ltr ? -60 + (width + 120) * p : width + 60 - (width + 120) * p;
      const y = y0 + (y1 - y0) * p - BIRDS.heightPx * 0.2;
      const size = rng.int(...BIRDS.size);
      const wing = BIRDS.wingPx * Math.max(1, 1 / zoom) * 0.8;
      for (let k = 0; k < size; k++) {
        const rank = Math.ceil(k / 2) * (k % 2 ? 1 : -1);
        const back = Math.abs(rank) * 7 * (ltr ? -1 : 1);
        const flap = Math.sin(t * 9 + k * 1.7);
        sprite.bird(
          ctx,
          { x: x + back, y: y + rank * 5 + Math.sin(t * 0.7 + k) * 1.5 },
          wing,
          flap,
        );
      }
    }
    ctx.lineWidth = inks.line * 1.2;
    ctx.stroke();
  }
}
