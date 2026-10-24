// Pins anchored on the map's landmarks (SCREENS §2, §8, §18): the central bank
// (one per city; it speaks for the city's country) and the airport (every city
// and regional site has one, DESIGN §5.17). Positions come from the CityMap's
// landmark blocks; regional maps draw no central bank, so they get no pin.
import type { CityMap } from '../../art/citygen';
import { roofAnchor, tileCenter } from '../../art/iso';
import type { LandmarkId } from '../../config/map';
import { CITIES } from '../../data/cities';
import { COUNTRIES } from '../../data/countries';
import type { PinSpec } from './pins';

/** World position over the middle of a landmark's block, or undefined if the map has none. */
export function landmarkAnchor(map: CityMap, id: LandmarkId): { x: number; y: number } | undefined {
  const lm = map.landmarks.find((l) => l.id === id);
  if (!lm) return undefined;
  const mid = Math.floor(lm.size / 2);
  const x = lm.x + mid;
  const y = lm.y + mid;
  return roofAnchor(map.tiles, x, y, map.floors[y * map.tiles + x] ?? 0);
}

/** Ground-level centre of a landmark's block (where the camera looks), or undefined. */
export function landmarkCentre(map: CityMap, id: LandmarkId): { x: number; y: number } | undefined {
  const lm = map.landmarks.find((l) => l.id === id);
  if (!lm) return undefined;
  const mid = Math.floor(lm.size / 2);
  return tileCenter(map.tiles, lm.x + mid, lm.y + mid);
}

/** The central bank landmark's pin (cities only). */
export function centralBankPin(map: CityMap): PinSpec | undefined {
  const at = landmarkAnchor(map, 'centralBank');
  const country = CITIES[map.cityId]?.country;
  if (!at || !country) return undefined;
  return {
    id: `cb_${map.cityId}`,
    kind: 'centralBank',
    x: at.x,
    y: at.y,
    label: `${COUNTRIES[country].centralBank}`,
    ink: '',
    monogram: '',
    badge: false,
    icon: 'banks',
    countryId: country,
  };
}

/** The airport landmark's pin: always shown once travel exists (not a Layers toggle). */
export function airportPin(map: CityMap): PinSpec | undefined {
  const at = landmarkAnchor(map, 'airport');
  const airport = CITIES[map.cityId]?.airport;
  if (!at || !airport) return undefined;
  return {
    id: `ap_${map.cityId}`,
    kind: 'airport',
    x: at.x,
    y: at.y,
    label: `${airport.name} airport, ${airport.code}. Departures`,
    ink: '',
    monogram: '',
    badge: false,
  };
}
