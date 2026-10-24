// A plain placeholder city renderer: flat diamonds and boxes in the city ink,
// redrawn every frame. Used while the engraved isoRenderer is built, and as a
// reference implementation of the MapRenderer contract.
import { STOREY_PX, TILE_H, TILE_W } from '../config/map';
import { tileAt, type CityMap } from './citygen';
import { tileTop, worldSize } from './iso';
import type { Camera, LotOccupant, MapRenderer, MapStyle, Viewport } from './mapRenderer';

export function createFlatRenderer(map: CityMap, style: MapStyle): MapRenderer {
  const { width, height } = worldSize(map.tiles);
  let occupants: Record<string, LotOccupant> = {};
  return {
    width,
    height,
    setOccupants(o) {
      occupants = o;
    },
    render(ctx, cam: Camera, view: Viewport) {
      const k = cam.zoom * view.devicePixelRatio;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = style.paper;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.setTransform(k, 0, 0, k, -cam.x * k, -cam.y * k);
      ctx.strokeStyle = style.ink;
      ctx.lineWidth = 1 / cam.zoom;
      for (let y = 0; y < map.tiles; y++) {
        for (let x = 0; x < map.tiles; x++) {
          const t = tileAt(map, x, y)!;
          const p = tileTop(map.tiles, x, y);
          const h = t.floors * STOREY_PX;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - h);
          ctx.lineTo(p.x + TILE_W / 2, p.y + TILE_H / 2 - h);
          ctx.lineTo(p.x, p.y + TILE_H - h);
          ctx.lineTo(p.x - TILE_W / 2, p.y + TILE_H / 2 - h);
          ctx.closePath();
          const occ = t.lotId ? occupants[t.lotId] : undefined;
          ctx.fillStyle =
            t.kind === 'water'
              ? '#c9d6dd'
              : t.kind === 'park'
                ? '#cfdcc0'
                : t.kind === 'street'
                  ? style.paper
                  : (occ?.ink ?? '#dfe4d8');
          ctx.fill();
          if (t.kind !== 'street' && t.kind !== 'water') ctx.stroke();
        }
      }
      return false;
    },
    dispose() {},
  };
}
