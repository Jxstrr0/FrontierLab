// Great-circle distances between cities (DESIGN §5.17, SCREENS §18): the
// spherical law of cosines on CONTENT §2 coordinates, using the deterministic
// trig in detmath. Whole kilometres, as the departure board shows them.
import { EARTH_RADIUS_KM } from '../config/balance';
import { CITIES } from '../data/cities';
import { dacos, dcos, dsin } from './detmath';

const RAD = Math.PI / 180;

/** Distance in km between two points given in degrees. */
export function greatCircleKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const p1 = lat1 * RAD;
  const p2 = lat2 * RAD;
  const dl = Math.abs(lon2 - lon1) * RAD;
  const cos = dsin(p1) * dsin(p2) + dcos(p1) * dcos(p2) * dcos(dl);
  return EARTH_RADIUS_KM * dacos(cos);
}

/** Rounded distance in km between two cities (0 for the same city). */
export function cityDistanceKm(fromId: string, toId: string): number {
  if (fromId === toId) return 0;
  const a = CITIES[fromId];
  const b = CITIES[toId];
  if (!a || !b) throw new Error(`Unknown city ${a ? toId : fromId}`);
  return Math.round(greatCircleKm(a.lat, a.lon, b.lat, b.lon));
}
