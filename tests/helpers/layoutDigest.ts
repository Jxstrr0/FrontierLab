// A short fingerprint of everything a city's layout decides: where its lots,
// offices and sites stand and what the drawn map puts on every tile. Used to
// prove layout 1 (old saves) never changes (tests/sim/cityGeo.test.ts).
import type { CityMap } from '../../src/art/citygen';
import { checksum } from '../../src/sim/save/serialize';
import type { GameState } from '../../src/sim/state';

type Placed = { id: string; cityId: string; tile: { x: number; y: number } };

export function placesDigest(s: GameState, cityId: string): string {
  const tiles = (xs: Placed[]) =>
    xs
      .filter((x) => x.cityId === cityId)
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((x) => `${x.id}@${x.tile.x},${x.tile.y}`)
      .join(';');
  const lots = Object.values(s.world.lots).filter((l) => l.cityId === cityId);
  return checksum(
    [
      tiles(lots),
      lots.map((l) => l.district).join(','),
      tiles(Object.values(s.world.officeListings)),
      tiles(Object.values(s.world.sites)),
    ].join('|'),
  );
}

export function mapDigest(map: CityMap): string {
  return checksum(
    [
      Array.from(map.kind).join(''),
      Array.from(map.district).join(''),
      Array.from(map.floors).join(','),
      JSON.stringify(map.landmarks.map((l) => [l.id, l.x, l.y, l.size, l.signature ?? ''])),
    ].join('|'),
  );
}
